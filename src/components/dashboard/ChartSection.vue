<script setup>
import { ref, onMounted, onUnmounted, watch, computed, markRaw } from 'vue';
import { Chart, registerables } from 'chart.js';
import { filteredData, rawData } from '@/store';
import { getMonths, getProjects } from '@/utils/parser';
import { getColor } from '@/utils/colors';

Chart.register(...registerables);

const chartRef = ref(null);
const chartInstance = ref(null);
const sectionRef = ref(null);

const months = computed(() => getMonths(filteredData.value));
const projects = computed(() => getProjects(filteredData.value));

const renderChart = () => {
    if (!chartRef.value || !rawData.value.length) return;

    if (chartInstance.value) {
        chartInstance.value.destroy();
    }

    const ctx = chartRef.value.getContext('2d');
    
    // Aggregate data by project and month
    const projectData = {};
    projects.value.forEach(proj => {
        projectData[proj] = {};
        months.value.forEach(month => projectData[proj][month] = 0);
    });

    filteredData.value.forEach(row => {
        if (projectData[row.project] && projectData[row.project][row.date] !== undefined) {
            projectData[row.project][row.date] += row.units;
        }
    });

    // Calculate total hours per project for sorting
    const projectTotals = projects.value.map(proj => ({
        name: proj,
        total: Object.values(projectData[proj]).reduce((a, b) => a + b, 0)
    })).sort((a, b) => b.total - a.total);

    const datasets = projectTotals.map((item, index) => ({
        label: item.name,
        data: months.value.map(month => projectData[item.name][month] || 0),
        backgroundColor: getColor(index),
        borderWidth: 0,
        borderRadius: 2,
        barPercentage: 0.6
    }));

    chartInstance.value = markRaw(new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months.value.map(m => {
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
                    title: { display: true, text: 'Total Hours', color: '#64748b' }
                }
            }
        }
    }));
};

watch(filteredData, () => {
    renderChart();
});

onMounted(() => {
    renderChart();

    // Scroll passthrough Logic
    const section = sectionRef.value;
    if (!section) return;

    const handleWheel = (e) => {
        const scrollContent = document.getElementById('scroll-content');
        if (!scrollContent) return;

        // Check if scrolling vertically
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            scrollContent.scrollTop += e.deltaY;
            e.preventDefault();
        }
    };

    section.addEventListener('wheel', handleWheel, { passive: false });
});

onUnmounted(() => {
    if (chartInstance.value) {
        chartInstance.value.destroy();
    }
});

const handleDownload = () => {
    if (chartRef.value) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = chartRef.value.width;
        tempCanvas.height = chartRef.value.height;
        const tCtx = tempCanvas.getContext('2d');
        tCtx.fillStyle = '#0f172a';
        tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tCtx.drawImage(chartRef.value, 0, 0);

        const link = document.createElement('a');
        link.download = `Monthly_Project_Report.png`;
        link.href = tempCanvas.toDataURL('image/png', 1.0);
        link.click();
    }
};

const projectLegend = computed(() => {
    const projectTotals = {};
    filteredData.value.forEach(row => {
        if (!projectTotals[row.project]) projectTotals[row.project] = 0;
        projectTotals[row.project] += row.units;
    });
    return projects.value
        .map(proj => ({ name: proj, total: projectTotals[proj] || 0 }))
        .sort((a, b) => b.total - a.total);
});

</script>

<template>
    <div ref="sectionRef" id="chart-section" class="bg-slate-900 border-b border-slate-800 flex flex-col p-3 shrink-0 shadow-lg relative z-30 transition-all">
        <div class="flex justify-between items-start mb-2 shrink-0 px-4">
            <div>
                <h3 class="text-lg font-bold text-slate-100">Monthly Hours Trend</h3>
                <p class="text-xs text-slate-500">Stacked by <span class="font-bold text-blue-400">Project</span></p>
            </div>
            <div class="flex items-center gap-2">
                <button @click="handleDownload"
                    class="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 hover:bg-slate-700 transition-colors">
                    <i class="ph ph-download-simple"></i> Save Image
                </button>
            </div>
        </div>
        <div class="relative w-full h-80 transition-all overflow-hidden px-4">
            <canvas ref="chartRef"></canvas>
        </div>
        
        <!-- Chart Legend -->
        <div class="chart-legend mb-2 flex flex-wrap gap-2 px-4 mt-2 max-h-24 overflow-y-auto">
            <div 
                v-for="(proj, index) in projectLegend" 
                :key="proj.name"
                class="legend-item flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/50 text-xs"
            >
                <div class="w-3 h-3 rounded" :style="{ backgroundColor: getColor(index) }"></div>
                <span class="text-slate-300">{{ proj.name }}</span>
                <span class="text-slate-500 text-[10px] ml-1">({{ proj.total.toFixed(1) }} h)</span>
            </div>
        </div>
    </div>
</template>
