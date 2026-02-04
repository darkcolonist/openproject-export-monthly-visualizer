<script setup>
import { computed } from 'vue';
import { filteredData } from '@/store';
import { getMonths, getDevelopers } from '@/utils/parser';

const months = computed(() => getMonths(filteredData.value));
const developers = computed(() => getDevelopers(filteredData.value));

const devData = computed(() => {
    const data = {};
    developers.value.forEach(dev => {
        data[dev] = { total: 0 };
        months.value.forEach(month => data[dev][month] = 0);
    });

    filteredData.value.forEach(row => {
        if (data[row.user]) {
            data[row.user][row.date] = (data[row.user][row.date] || 0) + row.units;
            data[row.user].total += row.units;
        }
    });
    return data;
});

const sortedDevs = computed(() => {
    return [...developers.value].sort((a, b) => devData.value[b].total - devData.value[a].total);
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
    <div id="developer-section" class="flex flex-col p-0 overflow-hidden shrink-0 table-section">
        <div class="p-3 bg-slate-950 shrink-0">
            <h3 class="text-xs font-bold text-slate-100 flex items-center gap-2 px-5">
                <i class="ph ph-users text-blue-400"></i> Developer Breakdown
            </h3>
        </div>
        <div class="px-8 pb-8">
            <div class="bg-slate-900 rounded-xl border border-slate-800">
                <div class="table-scroll-wrapper overflow-x-auto">
                    <table id="developer-table" class="text-sm text-left border-collapse" style="min-width: 100%;">
                        <thead id="developer-thead" class="text-xs text-slate-400 uppercase bg-slate-800">
                            <tr>
                                <th class="px-4 py-3 sticky left-0 bg-slate-800 z-20 border-b border-r border-slate-700 font-semibold">Developer</th>
                                <th v-for="month in months" :key="month" class="px-4 py-3 text-right border-b border-r border-slate-700 font-semibold whitespace-nowrap">
                                    {{ formatMonth(month) }}
                                </th>
                                <th class="px-4 py-3 text-right font-bold text-blue-400 border-b border-slate-700">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(dev, idx) in sortedDevs" :key="dev" :class="['hover:bg-slate-800/50 transition-colors', idx < sortedDevs.length - 1 ? 'border-b border-slate-800' : '']">
                                <td class="px-4 py-3 font-medium text-slate-200 sticky left-0 bg-slate-900 z-10 border-r border-slate-800">{{ dev }}</td>
                                <td v-for="month in months" :key="month" :class="['px-4 py-3 text-right border-r border-slate-800/50', formatCell(devData[dev][month]).class]">
                                    {{ formatCell(devData[dev][month]).text }}
                                </td>
                                <td class="px-4 py-3 text-right font-bold text-blue-400">{{ devData[dev].total.toFixed(1) }}h</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</template>
