<script setup>
import { ref, computed, watch, onMounted, onUnmounted, markRaw } from 'vue';
import { Chart, registerables } from 'chart.js';
import { filteredData, detailedMap } from '@/store';
import { getDevelopers } from '@/utils/parser';
import { getColor } from '@/utils/colors';

Chart.register(...registerables);

const selectedDev = ref('');
const selectedProj = ref('all');
const chartRef = ref(null);
const chartInstance = ref(null);
const developers = computed(() => getDevelopers(filteredData.value));

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
    return selectedDev.value && detailedMap.value[selectedDev.value]
        ? Object.keys(detailedMap.value[selectedDev.value]).sort()
        : [];
});

const projTotals = computed(() => {
    const totals = {};
    if (selectedDev.value && detailedMap.value[selectedDev.value]) {
        Object.entries(detailedMap.value[selectedDev.value]).forEach(([proj, months]) => {
            totals[proj] = Object.values(months).reduce((a, b) => a + b, 0);
        });
    }
    return totals;
});

const renderChart = () => {
    if (!chartRef.value || !selectedDev.value) {
        if (chartInstance.value) {
            chartInstance.value.destroy();
            chartInstance.value = null;
        }
        return;
    }

    const devData = detailedMap.value[selectedDev.value] || {};

    // Get all months
    const allMonthsSet = new Set();
    Object.values(devData).forEach(projObj => {
        Object.keys(projObj).forEach(m => allMonthsSet.add(m));
    });
    const sortedMonths = Array.from(allMonthsSet).sort();

    // Determine projects to show
    let projectsToShow = selectedProj.value === 'all' ? Object.keys(devData) : [selectedProj.value];

    // Sort by total hours
    projectsToShow = projectsToShow
        .filter(p => devData[p])
        .map(p => ({
            name: p,
            total: Object.values(devData[p]).reduce((a, b) => a + b, 0)
        }))
        .sort((a, b) => b.total - a.total)
        .map(p => p.name);

    // Build datasets
    const datasets = projectsToShow.map((proj, idx) => {
        const dataPoints = sortedMonths.map(mKey => devData[proj]?.[mKey] || 0);
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

const handleDevChange = () => {
    selectedProj.value = 'all';
};

watch([selectedDev, selectedProj, detailedMap], () => {
    // Re-render chart
    // We use nextTick (implicitly) or just rely on Vue reaction. 
    // Chart rendering is sync, but ref updates are sync.
    // However, canvas might need to be present.
    // Since we are inside the component, updates are fine.
    requestAnimationFrame(renderChart);
});

onMounted(() => {
    renderChart();
});

onUnmounted(() => {
    if (chartInstance.value) {
        chartInstance.value.destroy();
    }
});

const legendProjects = computed(() => {
    if (!selectedDev.value) return [];
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
                <i class="ph ph-chart-bar text-blue-400"></i> Developer Project Insights
            </h3>
        </div>

        <div class="px-8">
            <div class="bg-slate-900 rounded-xl border border-slate-800 p-6">
                <!-- Controls -->
                <div class="flex flex-wrap gap-4 mb-6">
                    <div class="flex flex-col gap-1 w-full sm:w-64">
                        <label class="text-xs text-slate-400 font-medium">Select Developer</label>
                        <div class="relative">
                            <select 
                                v-model="selectedDev"
                                @change="handleDevChange"
                                class="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                            >
                                <option value="">Select a Developer...</option>
                                <option v-for="dev in sortedDevs" :key="dev" :value="dev">
                                    {{ dev }} ({{ devTotals[dev].toFixed(1) }} h)
                                </option>
                            </select>
                            <i class="ph ph-caret-down absolute right-3 top-3 text-slate-400 pointer-events-none"></i>
                        </div>
                    </div>

                    <div class="flex flex-col gap-1 w-full sm:w-64">
                        <label class="text-xs text-slate-400 font-medium">Filter by Project</label>
                        <div class="relative">
                            <select 
                                v-model="selectedProj"
                                :disabled="!selectedDev"
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
                    <div v-if="!selectedDev" class="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
                        Select a developer to view insights
                    </div>
                </div>

                <!-- Legend -->
                <div v-if="selectedDev" class="chart-legend mt-4 flex flex-wrap gap-2 max-h-24 overflow-y-auto">
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
