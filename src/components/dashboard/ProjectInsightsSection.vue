<script setup>
import { ref, computed, watch, onMounted, onUnmounted, markRaw } from 'vue';
import { Chart, registerables } from 'chart.js';
import { filteredData, projectDetailedMap } from '@/store';
import { getProjects } from '@/utils/parser';
import { getColor } from '@/utils/colors';

Chart.register(...registerables);

const selectedProjs = ref([]);
const selectedDev = ref('all');
const chartRef = ref(null);
const chartInstance = ref(null);
const projects = computed(() => getProjects(filteredData.value));
const isProjDropdownOpen = ref(false);

// Calculate totals for projects
const projectTotals = computed(() => {
    const totals = {};
    projects.value.forEach(proj => {
        totals[proj] = 0;
        if (projectDetailedMap.value[proj]) {
            Object.values(projectDetailedMap.value[proj]).forEach(devObj => {
                Object.values(devObj).forEach(h => totals[proj] += h);
            });
        }
    });
    return totals;
});

const sortedProjects = computed(() => {
    return [...projects.value].sort((a, b) => projectTotals.value[b] - projectTotals.value[a]);
});

const projectDevelopers = computed(() => {
    if (selectedProjs.value.length === 0) return [];
    
    const devs = new Set();
    selectedProjs.value.forEach(proj => {
        if (projectDetailedMap.value[proj]) {
            Object.keys(projectDetailedMap.value[proj]).forEach(d => devs.add(d));
        }
    });
    return Array.from(devs).sort();
});

const devTotals = computed(() => {
    const totals = {};
    selectedProjs.value.forEach(proj => {
        if (projectDetailedMap.value[proj]) {
            Object.entries(projectDetailedMap.value[proj]).forEach(([dev, months]) => {
                const devSum = Object.values(months).reduce((a, b) => a + b, 0);
                totals[dev] = (totals[dev] || 0) + devSum;
            });
        }
    });
    return totals;
});

const renderChart = () => {
    if (!chartRef.value || selectedProjs.value.length === 0) {
        if (chartInstance.value) {
            chartInstance.value.destroy();
            chartInstance.value = null;
        }
        return;
    }

    // Aggregate data for all selected projects
    const aggregatedData = {};
    selectedProjs.value.forEach(proj => {
        const projData = projectDetailedMap.value[proj] || {};
        Object.entries(projData).forEach(([dev, months]) => {
            if (!aggregatedData[dev]) aggregatedData[dev] = {};
            Object.entries(months).forEach(([m, h]) => {
                aggregatedData[dev][m] = (aggregatedData[dev][m] || 0) + h;
            });
        });
    });

    // Get all months
    const allMonthsSet = new Set();
    Object.values(aggregatedData).forEach(devObj => {
        Object.keys(devObj).forEach(m => allMonthsSet.add(m));
    });
    const sortedMonths = Array.from(allMonthsSet).sort();

    // Determine developers to show
    let devsToShow = selectedDev.value === 'all' ? Object.keys(aggregatedData) : [selectedDev.value];

    // Sort by total hours
    devsToShow = devsToShow
        .filter(d => aggregatedData[d])
        .map(d => ({
            name: d,
            total: Object.values(aggregatedData[d]).reduce((a, b) => a + b, 0)
        }))
        .sort((a, b) => b.total - a.total)
        .map(d => d.name);

    // Build datasets
    const datasets = devsToShow.map((dev, idx) => {
        const dataPoints = sortedMonths.map(mKey => aggregatedData[dev]?.[mKey] || 0);
        return {
            label: dev,
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

const toggleProj = (proj) => {
    const index = selectedProjs.value.indexOf(proj);
    if (index === -1) {
        selectedProjs.value = [...selectedProjs.value, proj];
    } else {
        selectedProjs.value = selectedProjs.value.filter(p => p !== proj);
    }
};

const handleProjChange = () => {
    selectedDev.value = 'all';
};

watch([selectedProjs, selectedDev, projectDetailedMap], () => {
    requestAnimationFrame(renderChart);
}, { deep: true });

const handleClickOutside = (event) => {
    if (!event.target.closest('.group')) {
        isProjDropdownOpen.value = false;
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

const legendDevelopers = computed(() => {
    if (selectedProjs.value.length === 0) return [];
    const devs = (selectedDev.value === 'all' ? projectDevelopers.value : [selectedDev.value]);
    return devs
        .filter(d => devTotals.value[d] > 0)
        .sort((a, b) => (devTotals.value[b] || 0) - (devTotals.value[a] || 0));
});
</script>

<template>
    <div id="project-insights-section" class="flex flex-col p-0 overflow-hidden shrink-0 table-section mb-10">
        <div class="p-3 bg-slate-950 shrink-0 flex justify-between items-center">
            <h3 class="text-xs font-bold text-slate-100 flex items-center gap-2 px-5">
                <i class="ph ph-projector-screen text-blue-400"></i> Project Insights
            </h3>
        </div>

        <div class="px-8">
            <div class="bg-slate-900 rounded-xl border border-slate-800 p-6">
                <!-- Controls -->
                <div class="flex flex-wrap gap-4 mb-6">
                    <div class="flex flex-col gap-1 w-full sm:w-64">
                        <label class="text-xs text-slate-400 font-medium">Select Projects</label>
                        <div class="relative group">
                            <button 
                                @click="isProjDropdownOpen = !isProjDropdownOpen"
                                class="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 text-left flex justify-between items-center hover:bg-slate-700 transition-colors"
                            >
                                <span class="truncate">
                                    <template v-if="selectedProjs.length === 0">Select Projects...</template>
                                    <template v-else-if="selectedProjs.length === 1">{{ selectedProjs[0] }}</template>
                                    <template v-else>{{ selectedProjs.length }} Projects selected</template>
                                </span>
                                <i class="ph ph-caret-down text-slate-400"></i>
                            </button>
                            
                            <div v-if="isProjDropdownOpen" class="absolute top-full left-0 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                                <div 
                                    v-for="proj in sortedProjects" 
                                    :key="proj"
                                    @click="toggleProj(proj)"
                                    class="p-2.5 hover:bg-slate-700 cursor-pointer flex items-center justify-between text-sm transition-colors border-b border-slate-700/50 last:border-0"
                                    :class="{ 'bg-blue-600/20 text-blue-400': selectedProjs.includes(proj) }"
                                >
                                    <span class="truncate">{{ proj }} ({{ projectTotals[proj].toFixed(1) }} h)</span>
                                    <i v-if="selectedProjs.includes(proj)" class="ph ph-check-circle ph-fill"></i>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="flex flex-col gap-1 w-full sm:w-64">
                        <label class="text-xs text-slate-400 font-medium">Filter by Developer</label>
                        <div class="relative">
                            <select 
                                v-model="selectedDev"
                                :disabled="selectedProjs.length === 0"
                                class="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 appearance-none disabled:opacity-50"
                            >
                                <option value="all">All Developers</option>
                                <option v-for="dev in projectDevelopers" :key="dev" :value="dev">
                                    {{ dev }} ({{ (devTotals[dev] || 0).toFixed(1) }} h)
                                </option>
                            </select>
                            <i class="ph ph-caret-down absolute right-3 top-3 text-slate-400 pointer-events-none"></i>
                        </div>
                    </div>
                </div>

                <!-- Chart Container -->
                <div class="relative w-full h-96">
                    <canvas ref="chartRef"></canvas>
                    <div v-if="selectedProjs.length === 0" class="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
                        Select one or more projects to view insights
                    </div>
                </div>

                <!-- Legend -->
                <div v-if="selectedProjs.length > 0" class="chart-legend mt-4 flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                    <div 
                        v-for="(dev, index) in legendDevelopers" 
                        :key="dev"
                        class="legend-item flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/50 text-xs"
                    >
                        <div class="w-3 h-3 rounded" :style="{ backgroundColor: getColor(index) }"></div>
                        <span class="text-slate-300">{{ dev }}</span>
                        <span class="text-slate-500 text-[10px] ml-1">({{ (devTotals[dev] || 0).toFixed(1) }} h)</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
