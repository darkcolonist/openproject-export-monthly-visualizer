<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { parseFile, normalizeSupabaseData } from '../utils/parser';
import { cacheFile, getAllCachedFiles, loadCachedFile, clearCache, getTimeAgo } from '../utils/storage';

import { goToDashboard } from '@/router';

// Remove emit
// const emit = defineEmits(['file-loaded']);

const fileInputRef = ref(null);
const dropZoneRef = ref(null);
const recentFiles = ref([]);
const isDragging = ref(false);

const loadRecentFiles = async () => {
    recentFiles.value = await getAllCachedFiles();
};

onMounted(() => {
    loadRecentFiles();
});

const handleFile = async (file, fileBuffer = null) => {
    if (!file) return;

    try {
        const data = await parseFile(file);

        if (data.length === 0) {
            alert('No valid data found in the file. Please check the file format.');
            return;
        }

        // Cache the file
        if (fileBuffer) {
            await cacheFile(file, fileBuffer, data.length);
        } else {
            const buffer = await file.arrayBuffer();
            await cacheFile(file, buffer, data.length);
        }

        // Navigate to dashboard
        goToDashboard(file.name);
        
        // Refresh recent files list
        await loadRecentFiles();

    } catch (error) {
        console.error('File processing error:', error);
        alert('Failed to process file: ' + error.message);
    }
};

const handleLoadCached = async (filename) => {
    try {
        const cached = await loadCachedFile(filename);
        if (cached && cached.data) {
            if (cached.isSupabase || filename === 'SUPABASE_CACHE') {
                 let data = cached.data;
                 if (typeof data === 'string') {
                     data = JSON.parse(data);
                 }
                 const normalizedData = normalizeSupabaseData(data);
                 
                 if (normalizedData.length > 0) {
                     // Navigate to dashboard
                     goToDashboard('supabase');
                 } else {
                     alert('No valid data found in cached Supabase data.');
                     loadRecentFiles();
                 }
            } else {
                const blob = new Blob([cached.data]);
                const file = new File([blob], filename);
                await handleFile(file, cached.data);
            }
        } else {
            alert('Cached file has expired or is no longer available.');
            loadRecentFiles();
        }
    } catch (error) {
        console.error('Error loading cached file:', error);
        alert('Failed to load cached file: ' + error.message);
    }
};

const handleClearCache = async () => {
    if (confirm('Clear all cached files? This cannot be undone.')) {
        await clearCache();
        recentFiles.value = [];
    }
};

// Drag and Drop Handlers
const onDragOver = (e) => {
    e.preventDefault();
    isDragging.value = true;
};

const onDragLeave = (e) => {
    e.preventDefault();
    isDragging.value = false;
};

const onDrop = (e) => {
    e.preventDefault();
    isDragging.value = false;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
    }
};

const onFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
};

const triggerFileInput = () => {
    fileInputRef.value.click();
};
</script>

<template>
    <div class="w-full h-full overflow-y-auto flex items-start justify-center transition-all duration-500 ease-in-out">
        <div class="w-full max-w-xl mt-20 p-6">
            <!-- Header -->
            <div class="text-center mb-8">
                <h2 class="text-2xl font-bold text-slate-100 mb-2">Upload Cost Report</h2>
                <p class="text-slate-400">Drag and drop your .xls, .xlsx or .csv file to see monthly trends.</p>
            </div>

            <!-- Drop Zone -->
            <div 
                ref="dropZoneRef"
                @click="triggerFileInput"
                @dragover="onDragOver"
                @dragleave="onDragLeave"
                @drop="onDrop"
                :class="[
                    'bg-slate-900 border-2 border-dashed border-slate-700 rounded-2xl p-12 text-center transition-all cursor-pointer group',
                    isDragging ? 'border-blue-500 bg-slate-800 scale-[1.02]' : 'hover:border-blue-500 hover:bg-slate-800 hover:shadow-xl'
                ]"
            >
                <input 
                    ref="fileInputRef"
                    type="file"
                    class="hidden"
                    accept=".csv, .xls, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    @change="onFileChange"
                />
                <div class="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 border border-slate-700">
                    <i class="ph ph-calendar-plus text-4xl text-blue-400"></i>
                </div>
                <p class="text-lg font-semibold text-slate-200 mb-1">Click or Drag File</p>
                <p class="text-sm text-slate-500">Supports Excel (.xls, .xlsx) & CSV</p>
            </div>

            <!-- Template Download Link -->
            <div class="mt-4 text-center">
                <!-- Note: Ensure the asset path is correct relative to public directory if needed -->
                <a href="/assets/sample-template.csv" download="openproject-sample-template.csv"
                    class="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors">
                    <i class="ph ph-download-simple"></i>
                    <span>Download Sample Template</span>
                </a>
                <p class="text-xs text-slate-500 mt-1">Your file must match this format: Date, User, Units, Project</p>
            </div>

            <!-- Recently Processed Section -->
            <div v-if="recentFiles.length > 0" class="mt-8">
                <div class="flex items-center justify-center gap-3 mb-3">
                    <h3 class="text-sm font-semibold text-slate-300 flex items-center gap-2">
                        <i class="ph ph-clock-counter-clockwise text-blue-400"></i>
                        Recently Processed
                    </h3>
                    <button 
                        @click="handleClearCache"
                        class="text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                        title="Clear cache"
                    >
                        <i class="ph ph-trash text-sm"></i>
                    </button>
                </div>
                <div class="space-y-2">
                    <button 
                        v-for="file in recentFiles" 
                        :key="file.name"
                        @click="handleLoadCached(file.name)"
                        class="w-full text-left text-sm text-slate-300 hover:text-blue-400 hover:bg-slate-800 px-4 py-2.5 rounded-lg border border-slate-700 hover:border-blue-500 transition-all flex items-center justify-between group"
                    >
                        <div class="flex items-center gap-3 flex-1 min-w-0">
                            <i :class="[
                                file.isSupabase ? 'ph ph-database text-blue-400' : 'ph ph-file-xls text-green-400',
                                'text-lg flex-shrink-0'
                            ]"></i>
                            <div class="flex-1 min-w-0">
                                <div class="font-medium truncate">
                                    {{ file.isSupabase ? 'Supabase Live Connection' : file.name }}
                                </div>
                                <div class="text-xs text-slate-500 mt-0.5">
                                    {{ file.rowCount ? `${file.rowCount} rows` : 'Unknown rows' }} • {{ getTimeAgo(file.timestamp) }}
                                </div>
                            </div>
                        </div>
                        <i class="ph ph-arrow-right text-slate-500 group-hover:text-blue-400 transition-colors flex-shrink-0"></i>
                    </button>
                </div>
            </div>

            <div v-else class="mt-8">
                <h3 class="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2 justify-center">
                    <i class="ph ph-clock-counter-clockwise text-blue-400"></i>
                    Recently Processed
                </h3>
                <p class="text-xs text-slate-600 text-center py-4">No recent files</p>
            </div>

            <!-- Footer -->
            <div class="mt-12 text-center pb-6">
                <a href="https://github.com/darkcolonist/openproject-export-monthly-visualizer" target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-blue-400 transition-colors">
                    <i class="ph ph-github-logo text-base"></i>
                    <span>Open Source on GitHub</span>
                </a>
            </div>
        </div>
    </div>
</template>
