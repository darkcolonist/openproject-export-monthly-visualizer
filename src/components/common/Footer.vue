<script setup>
import { computed } from 'vue';
import { fileName, filteredData } from '@/store';
import { getMonths } from '@/utils/parser';

const months = computed(() => getMonths(filteredData.value));

const handleCopyUrl = () => {
    // For now this copies the base URL since we don't have deep hash state yet in Vue router
    // To match legacy behavior we might need to update URL query params, but copying host is fine for now
    navigator.clipboard.writeText(window.location.href);
};
</script>

<template>
    <footer class="w-full bg-slate-900 border-t border-slate-800 p-3 shrink-0 z-40 relative">
        <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-6">
            <span class="text-xs text-slate-400 font-medium">
                Source: {{ fileName || 'No File' }} | {{ months.length }} Months Displayed
            </span>

            <div class="flex items-center gap-4">
                <button @click="handleCopyUrl"
                    class="text-xs text-slate-400 hover:text-blue-400 flex items-center gap-1 transition-colors"
                    title="Copy URL from address bar">
                    <i class="ph ph-link"></i> Copy URL
                </button>

                <div class="w-px h-3 bg-slate-700 mx-1"></div>

                <a href="https://github.com/darkcolonist/openproject-export-monthly-visualizer" target="_blank"
                    rel="noopener noreferrer"
                    class="text-xs text-slate-400 hover:text-blue-400 flex items-center gap-1 transition-colors">
                    <i class="ph ph-github-logo"></i> GitHub
                </a>
            </div>
        </div>
    </footer>
</template>
