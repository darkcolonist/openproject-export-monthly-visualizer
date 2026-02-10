<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { hasData, isLoading, loadingText, clearData } from '@/store';
import Header from '@/components/common/Header.vue';
import LoadingOverlay from '@/components/common/LoadingOverlay.vue';
import SupabaseModal from '@/components/common/SupabaseModal.vue';
import SpacesModal from '@/components/common/SpacesModal.vue';
import HistoryModal from '@/components/common/HistoryModal.vue';
import ToastContainer from '@/components/common/ToastContainer.vue';
import { goToUpload } from '@/router';

import { onMounted } from 'vue';
import { getSupabaseConfig } from '@/utils/supabase';
import { getSpacesConfig } from '@/utils/spaces';
import { setSupabaseConfig, setSpacesConfig, setDateRange } from '@/store';

// With router, we should rely on router-view mostly
const route = useRoute();
const router = useRouter();

const showDashboard = computed(() => {
    return route.name && route.name.startsWith('dashboard');
});

const handleReset = () => {
    clearData();
    goToUpload();
};

onMounted(() => {
    // Restore Supabase Config from localStorage
    const config = getSupabaseConfig();
    if (config && config.url && config.key) {
        setSupabaseConfig(config.url, config.key);
        if (config.startDate && config.endDate) {
            setDateRange(config.startDate, config.endDate);
        }
    }

    // Restore Spaces Config
    const spacesConfig = getSpacesConfig();
    if (spacesConfig) {
        setSpacesConfig(spacesConfig);
    }
});
</script>

<template>
    <div class="h-screen w-full bg-slate-950 text-slate-200 font-sans flex flex-col overflow-hidden">
        <!-- Global Components -->
        <LoadingOverlay v-if="isLoading" :text="loadingText" />
        <SupabaseModal />
        <SpacesModal />
        <HistoryModal />
        <ToastContainer />

        <!-- Header -->
        <Header @reset="handleReset" />

        <div class="flex-1 overflow-hidden relative">
             <router-view v-slot="{ Component }">
                 <component :is="Component" />
             </router-view>
        </div>
    </div>
</template>

<style>
html, body {
  background-color: #020617; /* Slate 950 */
  height: 100%;
  width: 100%;
  overflow: hidden;
}
</style>
