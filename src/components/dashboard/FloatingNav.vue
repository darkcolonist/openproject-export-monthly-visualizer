<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { spacesConnected, supabaseConnected, activeSource } from '@/store';
import { syncSupabase, getSupabaseConfig } from '@/utils/supabase';
import { toast } from '@/utils/toast';

const props = defineProps(['activeSection', 'isSnapshot']);
const emit = defineEmits(['scrollTo', 'upload']);

const isSyncing = ref(false);

const scrollToSection = (sectionId) => {
    // We can emit or handle scrolling here. Since Dashboard manages layout, 
    // it's easier to access DOM if we know structure or just emit.
    // But let's keep logic self-contained if we can access the scroll container.
    const scrollContent = document.getElementById('scroll-content');
    const element = document.getElementById(sectionId);

    if (sectionId === 'chart-section') {
        if (scrollContent) scrollContent.scrollTop = 0;
        return;
    }

    if (element && scrollContent) {
        const elementTop = element.offsetTop;
        scrollContent.scrollTo({
            top: elementTop,
            behavior: 'smooth'
        });
    }
    emit('scrollTo', sectionId);
};

const handleUpload = () => {
    emit('upload');
};

const handleSync = async () => {
    if (isSyncing.value) return;

    const config = getSupabaseConfig();
    if (!config || !config.url || !config.key) {
        toast.error('Supabase is not configured properly.');
        return;
    }

    isSyncing.value = true;
    try {
        await syncSupabase(config.url, config.key, config.startDate, config.endDate);
        toast.success('Synchronization complete!');
    } catch (error) {
        console.error('Sync failed:', error);
        toast.error('Sync failed: ' + error.message);
    } finally {
        isSyncing.value = false;
    }
};
</script>

<template>
    <div class="fixed bottom-20 right-0 flex flex-col gap-2 z-50 transition-all duration-500 ease-in-out translate-x-5 hover:-translate-x-6 group/nav-container pl-10">

        <button @click="scrollToSection('chart-section')"
            :class="['nav-btn w-10 h-10 rounded-full border border-slate-700 shadow-lg hover:bg-slate-700 hover:scale-110 transition-all flex items-center justify-center relative group', activeSection === 'chart-section' ? 'active bg-blue-600 text-white' : 'bg-slate-800 text-blue-400']">
            <i class="ph ph-arrow-up"></i>
            <span class="absolute right-full mr-3 px-2 py-1 bg-slate-900 border border-slate-700 text-blue-400 text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">Top</span>
        </button>

        <button @click="scrollToSection('project-section')"
            :class="['nav-btn w-10 h-10 rounded-full border border-slate-700 shadow-lg hover:bg-slate-700 hover:scale-110 transition-all flex items-center justify-center relative group', activeSection === 'project-section' ? 'active bg-blue-600 text-white' : 'bg-slate-800 text-blue-400']">
            <i class="ph ph-briefcase"></i>
            <span class="absolute right-full mr-3 px-2 py-1 bg-slate-900 border border-slate-700 text-blue-400 text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">Projects</span>
        </button>
        <button @click="scrollToSection('developer-section')"
            :class="['nav-btn w-10 h-10 rounded-full border border-slate-700 shadow-lg hover:bg-slate-700 hover:scale-110 transition-all flex items-center justify-center relative group', activeSection === 'developer-section' ? 'active bg-blue-600 text-white' : 'bg-slate-800 text-blue-400']">
            <i class="ph ph-users"></i>
            <span class="absolute right-full mr-3 px-2 py-1 bg-slate-900 border border-slate-700 text-blue-400 text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">Developers</span>
        </button>
        <button @click="scrollToSection('insights-section')"
            :class="['nav-btn w-10 h-10 rounded-full border border-slate-700 shadow-lg hover:bg-slate-700 hover:scale-110 transition-all flex items-center justify-center relative group', activeSection === 'insights-section' ? 'active bg-blue-600 text-white' : 'bg-slate-800 text-blue-400']">
            <i class="ph ph-chart-bar"></i>
            <span class="absolute right-full mr-3 px-2 py-1 bg-slate-900 border border-slate-700 text-blue-400 text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">Developer Insights</span>
        </button>
        <button @click="scrollToSection('project-insights-section')"
            :class="['nav-btn w-10 h-10 rounded-full border border-slate-700 shadow-lg hover:bg-slate-700 hover:scale-110 transition-all flex items-center justify-center relative group', activeSection === 'project-insights-section' ? 'active bg-blue-600 text-white' : 'bg-slate-800 text-blue-400']">
            <i class="ph ph-projector-screen"></i>
            <span class="absolute right-full mr-3 px-2 py-1 bg-slate-900 border border-slate-700 text-blue-400 text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">Project Insights</span>
        </button>
        <button @click="scrollToSection('raw-data-section')"
            :class="['nav-btn w-10 h-10 rounded-full border border-slate-700 shadow-lg hover:bg-slate-700 hover:scale-110 transition-all flex items-center justify-center relative group', activeSection === 'raw-data-section' ? 'active bg-blue-600 text-white' : 'bg-slate-800 text-blue-400']">
            <i class="ph ph-table"></i>
            <span class="absolute right-full mr-3 px-2 py-1 bg-slate-900 border border-slate-700 text-blue-400 text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">Raw Data</span>
        </button>

        <div v-if="((supabaseConnected && activeSource === 'supabase') || spacesConnected) && !isSnapshot" class="h-px bg-slate-800 my-1 mx-2"></div>
        
        <button v-if="supabaseConnected && activeSource === 'supabase' && !isSnapshot" @click="handleSync"
            :disabled="isSyncing"
            class="nav-btn w-10 h-10 rounded-full border border-blue-500/50 shadow-lg bg-slate-800 text-blue-400 hover:bg-slate-700 hover:scale-110 transition-all flex items-center justify-center relative group disabled:opacity-50 disabled:cursor-not-allowed">
            <i :class="['ph ph-arrows-clockwise text-lg', isSyncing ? 'animate-spin' : '']"></i>
            <span class="absolute right-full mr-3 px-2 py-1 bg-slate-900 border border-slate-700 text-blue-400 text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">{{ isSyncing ? 'Syncing...' : 'Sync Now' }}</span>
        </button>

        <button v-if="spacesConnected && !isSnapshot" @click="handleUpload"
            class="nav-btn w-10 h-10 rounded-full border border-emerald-500/50 shadow-lg bg-slate-800 text-emerald-400 hover:bg-slate-700 hover:scale-110 transition-all flex items-center justify-center relative group">
            <i class="ph ph-cloud-arrow-up text-lg"></i>
            <span class="absolute right-full mr-3 px-2 py-1 bg-slate-900 border border-slate-700 text-emerald-400 text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">Upload to DO Spaces</span>
        </button>
    </div>
</template>
