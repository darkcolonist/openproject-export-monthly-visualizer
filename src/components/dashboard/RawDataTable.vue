<script setup>
import { ref, computed, watch } from 'vue';
import { filteredData } from '@/store';

const searchQuery = ref('');
const pageSize = ref(10);
const currentPage = ref(1);
const sortKey = ref('');
const sortOrder = ref('asc'); // 'asc' or 'desc'

// When search query or page size changes, reset to page 1
watch([searchQuery, pageSize], () => {
    currentPage.value = 1;
});

const toggleSort = (key) => {
    if (sortKey.value === key) {
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
    } else {
        sortKey.value = key;
        sortOrder.value = 'asc';
    }
};

const filteredRows = computed(() => {
    let data = [...filteredData.value];
    
    // Search
    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        data = data.filter(row => {
            return Object.entries(row).some(([key, val]) => {
                if (key === 'id' || key === 'date') return false;
                return String(val).toLowerCase().includes(query);
            });
        });
    }

    // Sort
    if (sortKey.value) {
        data.sort((a, b) => {
            let valA = a[sortKey.value];
            let valB = b[sortKey.value];
            
            // Handle numeric values
            if (typeof valA === 'number' && typeof valB === 'number') {
                return sortOrder.value === 'asc' ? valA - valB : valB - valA;
            }
            
            // Handle strings
            valA = String(valA).toLowerCase();
            valB = String(valB).toLowerCase();
            
            if (valA < valB) return sortOrder.value === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder.value === 'asc' ? 1 : -1;
            return 0;
        });
    }
    
    return data;
});

const totalPages = computed(() => Math.ceil(filteredRows.value.length / pageSize.value));

const paginatedRows = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return filteredRows.value.slice(start, start + pageSize.value);
});

const startIndex = computed(() => (currentPage.value - 1) * pageSize.value + 1);
const endIndex = computed(() => Math.min(currentPage.value * pageSize.value, filteredRows.value.length));

// Columns to show
const columns = computed(() => {
    if (filteredData.value.length === 0) return [];
    
    // Core columns first
    const core = [
        { key: 'rawDate', label: 'Date' },
        { key: 'user', label: 'User' },
        { key: 'project', label: 'Project' },
        { key: 'units', label: 'Hours', align: 'right' }
    ];
    
    // Find other original columns that aren't core or internal
    const firstRow = filteredData.value[0];
    const coreKeys = core.map(c => c.key);
    const internalKeys = ['id', 'date', ...coreKeys];
    
    const others = Object.keys(firstRow)
        .filter(key => !internalKeys.includes(key))
        .map(key => ({ key, label: key }));
        
    return [...core, ...others];
});

const formatValue = (key, val) => {
    if (key === 'units') return val.toFixed(2);
    return val;
};
</script>

<template>
    <div id="raw-data-section" class="flex flex-col p-0 overflow-hidden shrink-0 table-section mb-20">
        <div class="p-3 bg-slate-950 shrink-0 flex justify-between items-center px-5">
            <h3 class="text-xs font-bold text-slate-100 flex items-center gap-2">
                <i class="ph ph-table text-blue-400"></i> Raw Data Explorer
            </h3>
        </div>

        <div class="px-8">
            <div class="bg-slate-900 rounded-xl border border-slate-800 p-6">
                <!-- Data Table Controls -->
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div class="flex items-center gap-4">
                        <div class="relative w-full md:w-80">
                            <i class="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"></i>
                            <input 
                                v-model="searchQuery"
                                type="text" 
                                placeholder="Search raw data..." 
                                class="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg pl-10 pr-4 py-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-600"
                            />
                        </div>
                        <div class="flex items-center gap-2 text-xs text-slate-400">
                            <span>Show</span>
                            <select 
                                v-model="pageSize"
                                class="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 focus:ring-blue-500 outline-none cursor-pointer"
                            >
                                <option :value="10">10</option>
                                <option :value="20">20</option>
                                <option :value="50">50</option>
                            </select>
                            <span>entries</span>
                        </div>
                    </div>

                    <div v-if="filteredRows.length > 0" class="text-xs text-slate-500">
                        Showing <span class="text-slate-300 font-medium">{{ startIndex }}</span> to <span class="text-slate-300 font-medium">{{ endIndex }}</span> of <span class="text-blue-400 font-bold">{{ filteredRows.length }}</span> entries
                    </div>
                </div>

                <!-- Table -->
                <div class="table-scroll-wrapper overflow-x-auto rounded-lg border border-slate-800">
                    <table class="w-full text-sm text-left border-collapse">
                        <thead class="text-xs text-slate-400 uppercase bg-slate-800/50">
                            <tr>
                                <th 
                                    v-for="col in columns" 
                                    :key="col.key" 
                                    @click="toggleSort(col.key)"
                                    :class="[
                                        'px-4 py-3 border-b border-slate-700 font-semibold whitespace-nowrap cursor-pointer hover:bg-slate-700/50 transition-colors group',
                                        col.align === 'right' ? 'text-right' : ''
                                    ]"
                                >
                                    <div :class="['flex items-center gap-2', col.align === 'right' ? 'justify-end' : '']">
                                        {{ col.label }}
                                        <div class="flex flex-col text-[10px] leading-[4px]">
                                            <i class="ph ph-caret-up" :class="sortKey === col.key && sortOrder === 'asc' ? 'text-blue-400' : 'text-slate-600 group-hover:text-slate-500'"></i>
                                            <i class="ph ph-caret-down" :class="sortKey === col.key && sortOrder === 'desc' ? 'text-blue-400' : 'text-slate-600 group-hover:text-slate-500'"></i>
                                        </div>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(row, idx) in paginatedRows" :key="row.id" :class="['hover:bg-slate-800/50 transition-colors', idx < paginatedRows.length - 1 ? 'border-b border-slate-800' : '']">
                                <td v-for="col in columns" :key="col.key" :class="['px-4 py-3 text-slate-300 whitespace-nowrap', col.align === 'right' ? 'text-right' : '']">
                                    {{ formatValue(col.key, row[col.key]) }}
                                </td>
                            </tr>
                            <tr v-if="paginatedRows.length === 0">
                                <td :colspan="columns.length" class="px-4 py-10 text-center text-slate-500">
                                    No records found matching your criteria
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Pagination -->
                <div v-if="totalPages > 1" class="flex items-center justify-between mt-6">
                    <div class="flex items-center gap-1">
                        <button 
                            @click="currentPage--" 
                            :disabled="currentPage === 1"
                            class="p-2 rounded-lg hover:bg-slate-800 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <i class="ph ph-caret-left font-bold"></i>
                        </button>
                        
                        <div class="flex items-center gap-1">
                            <template v-for="page in totalPages" :key="page">
                                <button 
                                    v-if="page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)"
                                    @click="currentPage = page"
                                    :class="['w-8 h-8 rounded-lg text-xs font-bold transition-colors', currentPage === page ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300']"
                                >
                                    {{ page }}
                                </button>
                                <span v-else-if="page === currentPage - 2 || page === currentPage + 2" class="text-slate-600 px-1">...</span>
                            </template>
                        </div>

                        <button 
                            @click="currentPage++" 
                            :disabled="currentPage === totalPages"
                            class="p-2 rounded-lg hover:bg-slate-800 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <i class="ph ph-caret-right font-bold"></i>
                        </button>
                    </div>
                    
                    <div class="text-[10px] text-slate-600 uppercase tracking-wider font-bold">
                        Page {{ currentPage }} of {{ totalPages }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.table-scroll-wrapper {
    scrollbar-width: thin;
    scrollbar-color: #334155 transparent;
}
.table-scroll-wrapper::-webkit-scrollbar {
    height: 6px;
}
.table-scroll-wrapper::-webkit-scrollbar-track {
    background: transparent;
}
.table-scroll-wrapper::-webkit-scrollbar-thumb {
    background-color: #334155;
    border-radius: 20px;
}
</style>
