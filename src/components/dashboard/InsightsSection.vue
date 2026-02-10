<script setup>
import { ref, computed, watch, onMounted, onUnmounted, markRaw } from 'vue';
import { Chart, registerables } from 'chart.js';
import { filteredData, detailedMap } from '@/store';
import { getDevelopers } from '@/utils/parser';
import { getColor } from '@/utils/colors';

Chart.register(...registerables);

const selectedDevs = ref([]);
const selectedProj = ref('all');
const chartRef = ref(null);
const chartInstance = ref(null);
const developers = computed(() => getDevelopers(filteredData.value));
const isDevDropdownOpen = ref(false);

// Calculate totals for developers
const devTotals = computed(() => {
    const totals = {};
    developers.value.forEach(dev => {
        totals[dev] = 0;
        if (detailedMap.value[dev]) {
            Object.values(detailedMap.value[dev]).forEach(projObj => {
                Object.values(projObj).forEach(h => totals[dev] += h);
            });
        }
    });
    return totals;
});

const sortedDevs = computed(() => {
    return [...developers.value].sort((a, b) => devTotals.value[b] - devTotals.value[a]);
});

// Convert detailedMap (computed) to raw object if needed, but it's already a proxy which is fine for access
const devProjects = computed(() => {
    if (selectedDevs.value.length === 0) return [];
    
    const projects = new Set();
    selectedDevs.value.forEach(dev => {
        if (detailedMap.value[dev]) {
            Object.keys(detailedMap.value[dev]).forEach(p => projects.add(p));
        }
    });
    return Array.from(projects).sort();
});

const projTotals = computed(() => {
    const totals = {};
    selectedDevs.value.forEach(dev => {
        if (detailedMap.value[dev]) {
            Object.entries(detailedMap.value[dev]).forEach(([proj, months]) => {
                const projectSum = Object.values(months).reduce((a, b) => a + b, 0);
                totals[proj] = (totals[proj] || 0) + projectSum;
            });
        }
    });
    return totals;
});

const renderChart = () => {
    if (!chartRef.value || selectedDevs.value.length === 0) {
        if (chartInstance.value) {
            chartInstance.value.destroy();
            chartInstance.value = null;
        }
        return;
    }

    // Aggregate data for all selected developers
    const aggregatedData = {};
    selectedDevs.value.forEach(dev => {
        const devData = detailedMap.value[dev] || {};
        Object.entries(devData).forEach(([proj, months]) => {
            if (!aggregatedData[proj]) aggregatedData[proj] = {};
            Object.entries(months).forEach(([m, h]) => {
                aggregatedData[proj][m] = (aggregatedData[proj][m] || 0) + h;
            });
        });
    });

    // Get all months
    const allMonthsSet = new Set();
    Object.values(aggregatedData).forEach(projObj => {
        Object.keys(projObj).forEach(m => allMonthsSet.add(m));
    });
    const sortedMonths = Array.from(allMonthsSet).sort();

    // Determine projects to show
    let projectsToShow = selectedProj.value === 'all' ? Object.keys(aggregatedData) : [selectedProj.value];

    // Sort by total hours
    projectsToShow = projectsToShow
        .filter(p => aggregatedData[p])
        .map(p => ({
            name: p,
            total: Object.values(aggregatedData[p]).reduce((a, b) => a + b, 0)
        }))
        .sort((a, b) => b.total - a.total)
        .map(p => p.name);

    // Build datasets
    const datasets = projectsToShow.map((proj, idx) => {
        const dataPoints = sortedMonths.map(mKey => aggregatedData[proj]?.[mKey] || 0);
        return {
            label: proj,
            data: dataPoints,
            backgroundColor: getColor(idx),
            borderWidth: 0,
            borderRadius: 2,
            barPercentage: 0.6
        };
    });

    if (chartInstance.value) {
        chartInstance.value.destroy();
    }

    const ctx = chartRef.value.getContext('2d');
    chartInstance.value = markRaw(new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedMonths.map(m => {
                const [y, month] = m.split('-');
                return new Date(parseInt(y), parseInt(month) - 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
            }),
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderWidth: 1,
                    filter: (item) => item.raw > 0,
                    callbacks: {
                        footer: (tooltipItems) => {
                            const sum = tooltipItems.reduce((acc, item) => acc + item.parsed.y, 0);
                            return `Total: ${sum.toFixed(2)} h`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    stacked: true,
                    grid: { color: '#1e293b' },
                    ticks: { color: '#94a3b8' },
                    title: { display: true, text: 'Hours Spent', color: '#64748b' }
                }
            }
        }
    }));
};

const toggleDev = (dev) => {
    const index = selectedDevs.value.indexOf(dev);
    if (index === -1) {
        selectedDevs.value = [...selectedDevs.value, dev];
    } else {
        selectedDevs.value = selectedDevs.value.filter(d => d !== dev);
    }
};

const handleDevChange = () => {
    // This is no longer used by select, but kept for logic if needed
    selectedProj.value = 'all';
};

watch([selectedDevs, selectedProj, detailedMap], () => {
    // Re-render chart
    requestAnimationFrame(renderChart);
}, { deep: true });

const handleClickOutside = (event) => {
    if (!event.target.closest('.group')) {
        isDevDropdownOpen.value = false;
    }
};

onMounted(() => {
    renderChart();
    document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
    if (chartInstance.value) {
        chartInstance.value.destroy();
    }
    document.removeEventListener('click', handleClickOutside);
});

const legendProjects = computed(() => {
    if (selectedDevs.value.length === 0) return [];
    const projects = (selectedProj.value === 'all' ? devProjects.value : [selectedProj.value]);
    return projects
        .filter(p => projTotals.value[p] > 0)
        .sort((a, b) => (projTotals.value[b] || 0) - (projTotals.value[a] || 0));
});
</script>

<template>
    <div id="insights-section" class="flex flex-col p-0 overflow-hidden shrink-0 table-section mb-10">
        <div class="p-3 bg-slate-950 shrink-0 flex justify-between items-center">
            <h3 class="text-xs font-bold text-slate-100 flex items-center gap-2 px-5">
                <i class="ph ph-chart-bar text-blue-400"></i> Developer Insights
            </h3>
        </div>

        <div class="px-8">
            <div class="bg-slate-900 rounded-xl border border-slate-800 p-6">
                <!-- Controls -->
                <div class="flex flex-wrap gap-4 mb-6">
                    <div class="flex flex-col gap-1 w-full sm:w-64">
                        <label class="text-xs text-slate-400 font-medium">Select Developers</label>
                        <div class="relative group">
                            <button 
                                @click="isDevDropdownOpen = !isDevDropdownOpen"
                                class="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 text-left flex justify-between items-center hover:bg-slate-700 transition-colors"
                            >
                                <span class="truncate">
                                    <template v-if="selectedDevs.length === 0">Select Developers...</template>
                                    <template v-else-if="selectedDevs.length === 1">{{ selectedDevs[0] }}</template>
                                    <template v-else>{{ selectedDevs.length }} Developers selected</template>
                                </span>
                                <i class="ph ph-caret-down text-slate-400"></i>
                            </button>
                            
                            <div v-if="isDevDropdownOpen" class="absolute top-full left-0 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                                <div 
                                    v-for="dev in sortedDevs" 
                                    :key="dev"
                                    @click="toggleDev(dev)"
                                    class="p-2.5 hover:bg-slate-700 cursor-pointer flex items-center justify-between text-sm transition-colors border-b border-slate-700/50 last:border-0"
                                    :class="{ 'bg-blue-600/20 text-blue-400': selectedDevs.includes(dev) }"
                                >
                                    <span class="truncate">{{ dev }} ({{ devTotals[dev].toFixed(1) }} h)</span>
                                    <i v-if="selectedDevs.includes(dev)" class="ph ph-check-circle ph-fill"></i>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="flex flex-col gap-1 w-full sm:w-64">
                        <label class="text-xs text-slate-400 font-medium">Filter by Project</label>
                        <div class="relative">
                            <select 
                                v-model="selectedProj"
                                :disabled="selectedDevs.length === 0"
                                class="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 appearance-none disabled:opacity-50"
                            >
                                <option value="all">All Projects</option>
                                <option v-for="proj in devProjects" :key="proj" :value="proj">
                                    {{ proj }} ({{ (projTotals[proj] || 0).toFixed(1) }} h)
                                </option>
                            </select>
                            <i class="ph ph-caret-down absolute right-3 top-3 text-slate-400 pointer-events-none"></i>
                        </div>
                    </div>
                </div>

                <!-- Chart Container -->
                <div class="relative w-full h-96">
                    <canvas ref="chartRef"></canvas>
                    <div v-if="selectedDevs.length === 0" class="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
                        Select one or more developers to view insights
                    </div>
                </div>

                <!-- Legend -->
                <div v-if="selectedDevs.length > 0" class="chart-legend mt-4 flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                    <div 
                        v-for="(proj, index) in legendProjects" 
                        :key="proj"
                        class="legend-item flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/50 text-xs"
                    >
                        <div class="w-3 h-3 rounded" :style="{ backgroundColor: getColor(index) }"></div>
                        <span class="text-slate-300">{{ proj }}</span>
                        <span class="text-slate-500 text-[10px] ml-1">({{ (projTotals[proj] || 0).toFixed(1) }} h)</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
