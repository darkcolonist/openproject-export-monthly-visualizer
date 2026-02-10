<script setup>
import { ref, watch, onMounted } from 'vue';
import { 
    historyModalOpen, 
    hideHistoryModal,
    spacesAccessKey,
    spacesSecretKey,
    spacesEndpoint,
    spacesBucket,
    spacesPath
} from '@/store';
import { listSpacesFiles } from '@/utils/spaces';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

const files = ref([]);
const isFetching = ref(false);
const error = ref(null);
const nextToken = ref(null);
const listEnd = ref(false);
const scrollContainer = ref(null);

const fetchMore = async (reset = false) => {
    if (isFetching.value || (listEnd.value && !reset)) return;
    
    try {
        isFetching.value = true;
        error.value = null;
        
        if (reset) {
            files.value = [];
            nextToken.value = null;
            listEnd.value = false;
        }

        const config = {
            accessKey: spacesAccessKey.value,
            secretKey: spacesSecretKey.value,
            endpoint: spacesEndpoint.value,
            bucket: spacesBucket.value,
            path: spacesPath.value
        };

        const result = await listSpacesFiles(config, nextToken.value);
        
        files.value = [...files.value, ...result.files];
        nextToken.value = result.nextContinuationToken;
        
        if (!result.nextContinuationToken) {
            listEnd.value = true;
        }
    } catch (e) {
        error.value = e.message;
    } finally {
        isFetching.value = false;
    }
};

watch(historyModalOpen, (isOpen) => {
    if (isOpen) {
        fetchMore(true);
    }
});

const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 50) {
        fetchMore();
    }
};

const formatDate = (isoString) => {
    return dayjs(isoString).fromNow();
};

const copiedId = ref(null);
const copiedType = ref(null); // 'share' or 'direct'

const copyToClipboard = (text, id, type) => {
    navigator.clipboard.writeText(text).then(() => {
        copiedId.value = id;
        copiedType.value = type;
        setTimeout(() => {
            copiedId.value = null;
            copiedType.value = null;
        }, 2000);
    });
};
</script>

<template>
    <div v-if="historyModalOpen" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-slate-950/90 backdrop-blur-md" @click="hideHistoryModal"></div>
        
        <!-- Modal -->
        <div class="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-300">
            <!-- Header -->
            <div class="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                        <i class="ph ph-clock-counter-clockwise text-blue-400 text-xl"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-slate-100">Upload History</h3>
                        <p class="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">{{ spacesBucket }} bucket</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button 
                        @click="fetchMore(true)" 
                        :disabled="isFetching"
                        class="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-blue-400 rounded-xl transition-all disabled:opacity-50"
                        title="Refresh History"
                    >
                        <i class="ph ph-arrows-clockwise text-lg" :class="{ 'animate-spin': isFetching }"></i>
                    </button>
                    <button @click="hideHistoryModal" class="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 rounded-xl transition-all">
                        <i class="ph ph-x text-xl"></i>
                    </button>
                </div>
            </div>

            <div 
                ref="scrollContainer"
                @scroll="handleScroll"
                class="flex-1 overflow-y-auto overflow-x-hidden p-6 custom-scrollbar"
            >
                <div v-if="error" class="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6 flex items-center gap-3">
                    <i class="ph ph-warning-circle text-red-500 text-xl"></i>
                    <p class="text-sm text-red-400">{{ error }}</p>
                </div>

                <div v-if="files.length > 0" class="flex flex-col gap-2">
                    <div v-for="item in files" :key="item.id" 
                        class="group bg-slate-950/40 border border-slate-800/40 rounded-xl p-3 hover:border-blue-500/30 hover:bg-slate-950/60 transition-all flex items-center justify-between gap-3 min-w-0"
                    >
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2 mb-0.5">
                                <i class="ph ph-file-csv text-blue-400 text-sm"></i>
                                <p class="text-[13px] font-bold text-slate-200 truncate" :title="item.filename">{{ item.filename }}</p>
                            </div>
                            <div class="flex items-center gap-3">
                                <span 
                                    class="text-[10px] text-slate-500 flex items-center gap-1 cursor-help"
                                    :title="dayjs(item.timestamp).format('LLLL (Z)')"
                                >
                                    <i class="ph ph-calendar"></i>
                                    {{ formatDate(item.timestamp) }}
                                </span>
                            </div>
                        </div>
                        
                        <div class="flex items-center gap-1.5 shrink-0">
                            <!-- Copy Shareable Link -->
                            <button 
                                @click="copyToClipboard(item.shareUrl, item.id, 'share')"
                                class="p-2 bg-slate-800/50 hover:bg-blue-600/20 hover:text-blue-400 text-slate-400 rounded-lg transition-all relative group/btn"
                                :title="copiedId === item.id && copiedType === 'share' ? 'Copied!' : 'Copy Shareable Link'"
                            >
                                <i class="ph" :class="copiedId === item.id && copiedType === 'share' ? 'ph-check' : 'ph-share-network'"></i>
                                <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-950 text-[10px] rounded opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Share Link</span>
                            </button>

                            <!-- Download CSV -->
                            <a 
                                :href="item.directUrl"
                                download
                                class="p-2 bg-slate-800/50 hover:bg-emerald-600/20 hover:text-emerald-400 text-slate-400 rounded-lg transition-all relative group/btn"
                                title="Download CSV"
                            >
                                <i class="ph ph-download-simple"></i>
                                <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-950 text-[10px] rounded opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Download</span>
                            </a>

                            <a 
                                :href="item.shareUrl" 
                                target="_blank"
                                class="p-2 bg-slate-800/50 hover:bg-blue-600/30 hover:text-blue-300 text-slate-400 rounded-lg transition-all"
                                title="Open Report"
                            >
                                <i class="ph ph-arrow-square-out"></i>
                            </a>
                        </div>
                    </div>
                </div>

                <!-- Pagination / Loading States -->
                <div class="mt-8 flex flex-col items-center gap-4">
                    <div v-if="isFetching" class="flex flex-col items-center justify-center gap-3">
                        <div class="relative w-8 h-8">
                            <div class="absolute inset-0 border-3 border-blue-500/20 rounded-full"></div>
                            <div class="absolute inset-0 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Loading</p>
                    </div>

                    <button 
                        v-if="!isFetching && !listEnd" 
                        @click="fetchMore()"
                        class="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all border border-slate-700 hover:border-slate-600 flex items-center gap-2"
                    >
                        <i class="ph ph-plus"></i>
                        Load More
                    </button>

                    <div v-if="!isFetching && files.length === 0 && !error" class="py-20 flex flex-col items-center justify-center gap-4 text-center">
                        <div class="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center text-slate-600">
                            <i class="ph ph-folder-open text-4xl"></i>
                        </div>
                        <div>
                            <p class="text-slate-300 font-bold">No history found</p>
                            <p class="text-xs text-slate-500">Your uploaded reports will appear here</p>
                        </div>
                    </div>

                    <div v-if="listEnd && files.length > 0" class="py-4 text-center">
                        <p class="text-[10px] text-slate-600 uppercase tracking-widest font-black">End of history</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background: #1e293b;
    border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #334155;
}
</style>
