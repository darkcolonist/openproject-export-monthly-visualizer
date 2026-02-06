<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { 
    hasData, 
    fileName, 
    startDate, 
    endDate, 
    settingsMenuOpen, 
    supabaseConnected, 
    toggleSettings, 
    showSupabaseModal, 
    toggleChart, 
    chartVisible, 
    setSupabaseConfig, 
    clearData, 
    supabaseUrl, 
    supabaseKey,
    spacesConnected,
    showSpacesModal
} from '@/store';
import { syncSupabase, clearSupabaseConfig } from '@/utils/supabase';
import { deleteCachedFile } from '@/utils/storage';
import DateFilter from './DateFilter.vue';
import { goToUpload } from '@/router';

// In this Vue 3 implementation, routing is simplified via props or emits.
// We assume 'showDashboardControls' is true if activeData exists, effectively.
// The parent 'DashboardView' uses this header.
const dateFilterOpen = ref(false);

const formatDateRange = computed(() => {
    if (!startDate.value && !endDate.value) {
        return 'Showing everything';
    }
    const start = startDate.value || 'Beginning';
    const end = endDate.value || 'Present';
    return `${start} → ${end}`;
});

const handleCloseDateFilter = () => {
    dateFilterOpen.value = false;
};

const handleMenuToggle = (e) => {
    e.stopPropagation();
    toggleSettings();
};

const handleSync = async () => {
    toggleSettings();
    try {
        await syncSupabase(supabaseUrl.value, supabaseKey.value, startDate.value, endDate.value);
    } catch (e) {
        alert('Sync failed: ' + e.message);
    }
};

// Emit event for "New File" to tell parent to go back to upload
// const emit = defineEmits(['reset']);

const handleDisconnect = async () => {
    if (confirm('Are you sure you want to disconnect Supabase?')) {
        clearSupabaseConfig();
        await deleteCachedFile('SUPABASE_CACHE');
        setSupabaseConfig(null, null);
        clearData();
        toggleSettings();
        // Return to upload
        goToUpload();
    }
};

const handleNewFile = () => {
    // Clear current session data if desired, or just navigate back
    clearData(); 
    goToUpload();
};

const settingsMenuRef = ref(null);
const settingsBtnRef = ref(null);

const handleClickOutside = (e) => {
    if (settingsMenuOpen.value && 
        settingsMenuRef.value && !settingsMenuRef.value.contains(e.target) &&
        settingsBtnRef.value && !settingsBtnRef.value.contains(e.target)) {
        toggleSettings();
    }
};

onMounted(() => {
    document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
    <header class="bg-slate-900 border-b border-slate-800 px-6 py-2 flex justify-between items-center shadow-sm shrink-0 z-40 relative">
        <div class="flex items-center gap-3 md:gap-4">
            <i class="ph ph-calendar-check text-3xl text-blue-500 shrink-0"></i>
            <div class="hidden md:block">
                <h1 class="font-bold text-base leading-tight text-slate-100">Monthly Project Report</h1>
                <p class="text-[10px] text-slate-400">Project Trends & Developer Breakdown</p>
            </div>
        </div>

        <div class="flex items-center -space-x-px">
            <!-- 1. Date Range Picker -->
            <div v-if="hasData" class="relative">
                <button 
                    @click="dateFilterOpen = !dateFilterOpen"
                    :class="[
                        'flex items-center gap-2 px-3 md:px-4 h-[38px] bg-slate-800 border border-slate-700 rounded-l-xl hover:bg-slate-700 transition-all z-10 relative focus:z-20 hover:text-blue-400',
                        dateFilterOpen ? 'text-blue-400 bg-slate-700' : 'text-slate-300'
                    ]"
                    title="Date Range"
                >
                    <i class="ph ph-calendar text-lg"></i>
                    <div class="hidden md:flex flex-col items-start leading-none gap-0.5">
                         <!-- Simplified layout for group context -->
                         <span class="text-[9px] uppercase font-bold text-slate-500 group-hover:text-blue-400/70 transition-colors">Range</span>
                         <span class="text-[10px] font-medium">{{ formatDateRange }}</span>
                    </div>
                </button>
                <DateFilter v-if="dateFilterOpen" @close="handleCloseDateFilter" class="!left-auto !right-0 origin-top-right" />
            </div>

            <!-- 2. Show/Hide Graph -->
            <button 
                v-if="hasData"
                @click="toggleChart"
                :class="[
                    'flex items-center gap-2 px-3 md:px-4 h-[38px] bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-all z-0 relative focus:z-20 border-l-0',
                    chartVisible ? 'text-blue-400' : 'text-slate-400'
                ]"
                :title="chartVisible ? 'Hide Graph' : 'Show Graph'"
            >
                <i :class="['ph text-lg', chartVisible ? 'ph-eye' : 'ph-eye-slash']"></i>
                <span class="hidden md:inline text-xs font-medium">{{ chartVisible ? 'Hide' : 'Show' }} Graph</span>
            </button>

            <!-- 3. New File -->
            <button 
                @click="handleNewFile"
                class="flex items-center gap-2 px-3 md:px-4 h-[38px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-blue-400 text-xs font-bold transition-all border border-slate-700 border-l-0 relative focus:z-20"
                :class="{'rounded-l-xl': !hasData}" 
            >
                <!-- If no data, this becomes the first item, so round left -->
                <i class="ph ph-file-plus text-lg"></i>
                <span class="hidden md:inline">New File</span>
            </button>

            <!-- 4. Settings Menu -->
            <div class="relative">
                <button 
                    ref="settingsBtnRef"
                    @click="handleMenuToggle"
                    :class="[
                        'flex items-center justify-center px-3 h-[38px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-blue-400 text-xs font-bold rounded-r-xl transition-all border border-slate-700 border-l-0 relative focus:z-20',
                        settingsMenuOpen ? 'bg-slate-700 text-blue-400' : ''
                    ]"
                    title="Configuration"
                >
                    <i class="ph ph-dots-three text-xl"></i>
                </button>
                
                <div ref="settingsMenuRef" v-if="settingsMenuOpen" class="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
                    <div class="p-2 flex flex-col gap-1">
                        <div v-if="supabaseConnected || spacesConnected" class="mb-3 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex flex-col gap-2">
                            <div v-if="supabaseConnected" class="flex items-center gap-2">
                                <div class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                                <span class="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Supabase Connected</span>
                            </div>
                            <div v-if="spacesConnected" class="flex items-center gap-2">
                                <div class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                                <span class="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Spaces Configured</span>
                            </div>
                        </div>

                        <h4 class="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Data Source</h4>
                        
                        <button 
                            @click="showSupabaseModal(); toggleSettings();"
                            class="flex items-center gap-3 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-lg transition-colors group"
                        >
                            <i class="ph ph-database text-blue-400 group-hover:scale-110 transition-transform"></i>
                            <span>{{ supabaseConnected ? 'Configure Supabase' : 'Connect Supabase' }}</span>
                        </button>

                        <button 
                            @click="showSpacesModal(); toggleSettings();"
                            class="flex items-center gap-3 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-lg transition-colors group"
                        >
                            <i class="ph ph-cloud-arrow-up text-emerald-400 group-hover:scale-110 transition-transform"></i>
                            <span>{{ spacesConnected ? 'Configure Spaces' : 'Setup DO Spaces' }}</span>
                        </button>

                        <template v-if="supabaseConnected">
                            <button 
                                @click="handleSync"
                                class="flex items-center gap-3 px-3 py-2 text-xs text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors group"
                            >
                                <i class="ph ph-arrows-clockwise group-hover:animate-spin"></i>
                                <span>Sync Now</span>
                            </button>
                            <button 
                                @click="handleDisconnect"
                                class="flex items-center gap-3 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors group"
                            >
                                <i class="ph ph-plugs-off group-hover:scale-110 transition-transform"></i>
                                <span>Disconnect Supabase</span>
                            </button>
                        </template>
                    </div>
                </div>
            </div>
        </div>
    </header>
</template>
