<script setup>
import { ref, computed, watch, onMounted, onUnmounted, markRaw } from 'vue';
import { Chart, registerables } from 'chart.js';
import { filteredData, projectDetailedMap } from '@/store';
import { getProjects } from '@/utils/parser';
import { getColor } from '@/utils/colors';

Chart.register(...registerables);

const selectedProj = ref('');
const selectedDev = ref('all');
const chartRef = ref(null);
const chartInstance = ref(null);
const projects = computed(() => getProjects(filteredData.value));

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
    return selectedProj.value && projectDetailedMap.value[selectedProj.value]
        ? Object.keys(projectDetailedMap.value[selectedProj.value]).sort()
        : [];
});

const devTotals = computed(() => {
    const totals = {};
    if (selectedProj.value && projectDetailedMap.value[selectedProj.value]) {
        Object.entries(projectDetailedMap.value[selectedProj.value]).forEach(([dev, months]) => {
            totals[dev] = Object.values(months).reduce((a, b) => a + b, 0);
        });
    }
    return totals;
});

const renderChart = () => {
    if (!chartRef.value || !selectedProj.value) {
        if (chartInstance.value) {
            chartInstance.value.destroy();
            chartInstance.value = null;
        }
        return;
    }

    const projData = projectDetailedMap.value[selectedProj.value] || {};

    // Get all months
    const allMonthsSet = new Set();
    Object.values(projData).forEach(devObj => {
        Object.keys(devObj).forEach(m => allMonthsSet.add(m));
    });
    const sortedMonths = Array.from(allMonthsSet).sort();

    // Determine developers to show
    let devsToShow = selectedDev.value === 'all' ? Object.keys(projData) : [selectedDev.value];

    // Sort by total hours
    devsToShow = devsToShow
        .filter(d => projData[d])
        .map(d => ({
            name: d,
            total: Object.values(projData[d]).reduce((a, b) => a + b, 0)
        }))
        .sort((a, b) => b.total - a.total)
        .map(d => d.name);

    // Build datasets
    const datasets = devsToShow.map((dev, idx) => {
        const dataPoints = sortedMonths.map(mKey => projData[dev]?.[mKey] || 0);
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

const handleProjChange = () => {
    selectedDev.value = 'all';
};

watch([selectedProj, selectedDev, projectDetailedMap], () => {
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

const legendDevelopers = computed(() => {
    if (!selectedProj.value) return [];
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
                <i class="ph ph-projector-screen text-blue-400"></i> Project Developer Insights
            </h3>
        </div>

        <div class="px-8">
            <div class="bg-slate-900 rounded-xl border border-slate-800 p-6">
                <!-- Controls -->
                <div class="flex flex-wrap gap-4 mb-6">
                    <div class="flex flex-col gap-1 w-full sm:w-64">
                        <label class="text-xs text-slate-400 font-medium">Select Project</label>
                        <div class="relative">
                            <select 
                                v-model="selectedProj"
                                @change="handleProjChange"
                                class="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                            >
                                <option value="">Select a Project...</option>
                                <option v-for="proj in sortedProjects" :key="proj" :value="proj">
                                    {{ proj }} ({{ projectTotals[proj].toFixed(1) }} h)
                                </option>
                            </select>
                            <i class="ph ph-caret-down absolute right-3 top-3 text-slate-400 pointer-events-none"></i>
                        </div>
                    </div>

                    <div class="flex flex-col gap-1 w-full sm:w-64">
                        <label class="text-xs text-slate-400 font-medium">Filter by Developer</label>
                        <div class="relative">
                            <select 
                                v-model="selectedDev"
                                :disabled="!selectedProj"
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
                    <div v-if="!selectedProj" class="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
                        Select a project to view insights
                    </div>
                </div>

                <!-- Legend -->
                <div v-if="selectedProj" class="chart-legend mt-4 flex flex-wrap gap-2 max-h-24 overflow-y-auto">
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
