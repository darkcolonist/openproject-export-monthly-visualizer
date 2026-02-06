<script setup>
import { onMounted, onUnmounted } from 'vue';
import { spacesConnected } from '@/store';

const props = defineProps(['activeSection']);
const emit = defineEmits(['scrollTo']);

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
</script>

<template>
    <div class="fixed bottom-20 right-6 flex flex-col gap-2 z-50">
        <button @click="scrollToSection('chart-section')"
            :class="['nav-btn w-10 h-10 rounded-full border border-slate-700 shadow-lg hover:bg-slate-700 hover:scale-110 transition-all flex items-center justify-center', activeSection === 'chart-section' ? 'active bg-blue-600 text-white' : 'bg-slate-800 text-blue-400']"
            title="Top">
            <i class="ph ph-arrow-up"></i>
        </button>
        <button @click="scrollToSection('project-section')"
            :class="['nav-btn w-10 h-10 rounded-full border border-slate-700 shadow-lg hover:bg-slate-700 hover:scale-110 transition-all flex items-center justify-center', activeSection === 'project-section' ? 'active bg-blue-600 text-white' : 'bg-slate-800 text-blue-400']"
            title="Projects">
            <i class="ph ph-briefcase"></i>
        </button>
        <button @click="scrollToSection('developer-section')"
            :class="['nav-btn w-10 h-10 rounded-full border border-slate-700 shadow-lg hover:bg-slate-700 hover:scale-110 transition-all flex items-center justify-center', activeSection === 'developer-section' ? 'active bg-blue-600 text-white' : 'bg-slate-800 text-blue-400']"
            title="Developers">
            <i class="ph ph-users"></i>
        </button>
        <button @click="scrollToSection('insights-section')"
            :class="['nav-btn w-10 h-10 rounded-full border border-slate-700 shadow-lg hover:bg-slate-700 hover:scale-110 transition-all flex items-center justify-center', activeSection === 'insights-section' ? 'active bg-blue-600 text-white' : 'bg-slate-800 text-blue-400']"
            title="Insights">
            <i class="ph ph-chart-bar"></i>
        </button>

        <template v-if="spacesConnected">
            <div class="h-px bg-slate-800 my-1 mx-2"></div>

            <button @click="handleUpload"
                class="nav-btn w-10 h-10 rounded-full border border-emerald-500/50 shadow-lg bg-slate-800 text-emerald-400 hover:bg-slate-700 hover:scale-110 transition-all flex items-center justify-center group"
                title="Upload to DO Spaces">
                <i class="ph ph-cloud-arrow-up text-lg"></i>
            </button>
        </template>
    </div>
</template>
