<script setup>
import { computed } from 'vue';
import { filteredData } from '@/store';
import { getMonths, getProjects } from '@/utils/parser';

const months = computed(() => getMonths(filteredData.value));
const projects = computed(() => getProjects(filteredData.value));

const projectData = computed(() => {
    const data = {};
    projects.value.forEach(proj => {
        data[proj] = { total: 0 };
        months.value.forEach(month => data[proj][month] = 0);
    });

    filteredData.value.forEach(row => {
        if (data[row.project]) {
            data[row.project][row.date] = (data[row.project][row.date] || 0) + row.units;
            data[row.project].total += row.units;
        }
    });
    return data;
});

const sortedProjects = computed(() => {
    return [...projects.value].sort((a, b) => projectData.value[b].total - projectData.value[a].total);
});

const formatMonth = (monthKey) => {
    const [y, m] = monthKey.split('-');
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
};

const formatCell = (value) => {
    const num = value || 0;
    const isZero = num === 0;
    return {
        text: num.toFixed(1) + 'h',
        class: isZero ? 'text-slate-600' : 'text-slate-300'
    };
};
</script>

<template>
    <div id="project-section" class="flex flex-col p-0 overflow-hidden shrink-0 table-section">
        <div class="p-3 bg-slate-950 shrink-0">
            <h3 class="text-xs font-bold text-slate-100 flex items-center gap-2 px-5">
                <i class="ph ph-briefcase text-blue-400"></i> Project Breakdown
            </h3>
        </div>
        <div class="px-8 pb-8">
            <div class="bg-slate-900 rounded-xl border border-slate-800">
                <div class="table-scroll-wrapper overflow-x-auto">
                    <table id="project-table" class="text-sm text-left border-collapse" style="min-width: 100%;">
                        <thead id="project-thead" class="text-xs text-slate-400 uppercase bg-slate-800">
                            <tr>
                                <th class="px-4 py-3 sticky left-0 bg-slate-800 z-20 border-b border-r border-slate-700 font-semibold">Project</th>
                                <th v-for="month in months" :key="month" class="px-4 py-3 text-right border-b border-r border-slate-700 font-semibold whitespace-nowrap">
                                    {{ formatMonth(month) }}
                                </th>
                                <th class="px-4 py-3 text-right font-bold text-blue-400 border-b border-slate-700">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(proj, idx) in sortedProjects" :key="proj" :class="['hover:bg-slate-800/50 transition-colors', idx < sortedProjects.length - 1 ? 'border-b border-slate-800' : '']">
                                <td class="px-4 py-3 font-medium text-slate-200 sticky left-0 bg-slate-900 z-10 border-r border-slate-800">{{ proj }}</td>
                                <td v-for="month in months" :key="month" :class="['px-4 py-3 text-right border-r border-slate-800/50', formatCell(projectData[proj][month]).class]">
                                    {{ formatCell(projectData[proj][month]).text }}
                                </td>
                                <td class="px-4 py-3 text-right font-bold text-blue-400">{{ projectData[proj].total.toFixed(1) }}h</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</template>
