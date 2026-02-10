<script setup>
import { ref, onMounted, watch } from 'vue';
import { 
    spacesModalOpen, 
    hideSpacesModal, 
    setSpacesConfig,
    spacesConnected,
    spacesEndpoint,
    spacesPath,
    showHistoryModal
} from '@/store';
import { saveSpacesConfig, getSpacesConfig, clearSpacesConfig } from '@/utils/spaces';
import { toast } from '@/utils/toast';

const accessKey = ref('');
const secretKey = ref('');
const endpoint = ref('https://nyc3.digitaloceanspaces.com');
const bucket = ref('');
const path = ref('');

const handleOpenHistory = () => {
    hideSpacesModal();
    setTimeout(showHistoryModal, 100);
};

onMounted(() => {
    const config = getSpacesConfig();
    if (config) {
        accessKey.value = config.accessKey || '';
        secretKey.value = config.secretKey || '';
        endpoint.value = config.endpoint || 'https://nyc3.digitaloceanspaces.com';
        bucket.value = config.bucket || '';
        path.value = config.path || '';
    }
});

const handleSave = () => {
    const config = {
        accessKey: accessKey.value,
        secretKey: secretKey.value,
        endpoint: endpoint.value,
        bucket: bucket.value,
        path: path.value
    };
    saveSpacesConfig(config);
    setSpacesConfig(config);
    hideSpacesModal();
};

const handleClear = () => {
    if (confirm('Clear DigitalOcean Spaces configuration?')) {
        clearSpacesConfig();
        accessKey.value = '';
        secretKey.value = '';
        endpoint.value = 'https://nyc3.digitaloceanspaces.com';
        bucket.value = '';
        path.value = '';
        setSpacesConfig({ accessKey: '', secretKey: '', endpoint: '', bucket: '', path: '' });
    }
};

const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
};

const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
        toast.success('Value copied to clipboard!');
    });
};
</script>

<template>
    <div v-if="spacesModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="hideSpacesModal"></div>
        
        <!-- Modal -->
        <div class="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-300">
            <div class="p-6 overflow-y-auto custom-scrollbar">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-xl font-bold text-slate-100 flex items-center gap-2">
                        <i class="ph ph-cloud-arrow-up text-blue-400"></i>
                        Spaces Settings
                    </h3>
                    <button @click="hideSpacesModal" class="text-slate-400 hover:text-slate-100 transition-colors">
                        <i class="ph ph-x text-xl"></i>
                    </button>
                </div>

                <div class="space-y-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Access Key</label>
                        <input 
                            v-model="accessKey"
                            type="text" 
                            placeholder="Your Access Key"
                            class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono text-sm"
                        />
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Secret Key</label>
                        <input 
                            v-model="secretKey"
                            type="password" 
                            placeholder="Your Secret Key"
                            class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono text-sm"
                        />
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Endpoint</label>
                        <input 
                            v-model="endpoint"
                            type="text" 
                            placeholder="https://nyc3.digitaloceanspaces.com"
                            class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono text-sm"
                        />
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Bucket Name</label>
                        <input 
                            v-model="bucket"
                            type="text" 
                            placeholder="my-bucket"
                            class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono text-sm"
                        />
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Subpath (optional)</label>
                        <input 
                            v-model="path"
                            type="text" 
                            placeholder="folder/subfolder"
                            class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono text-sm"
                        />
                    </div>
                </div>
                <div class="flex gap-3 mt-8">
                    <button 
                        @click="handleClear"
                        class="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 px-4 rounded-xl transition-all border border-slate-700 hover:border-slate-600"
                    >
                        Clear Config
                    </button>
                    <button 
                        @click="handleSave"
                        class="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 transition-all flex items-center justify-center gap-2"
                    >
                        <i class="ph ph-check"></i>
                        Save Config
                    </button>
                </div>

                <div class="mt-8 pt-6 border-t border-slate-800">
                    <button 
                        @click="handleOpenHistory"
                        class="w-full bg-slate-950/50 border border-slate-800 hover:border-blue-500/50 hover:bg-blue-500/5 rounded-xl p-4 transition-all flex items-center justify-between group"
                    >
                        <div class="flex items-center gap-3 text-left">
                            <div class="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                                <i class="ph ph-clock-counter-clockwise text-blue-400"></i>
                            </div>
                            <div>
                                <p class="text-sm font-bold text-slate-200">Browse Upload History</p>
                                <p class="text-[10px] text-slate-500">View and share past uploads</p>
                            </div>
                        </div>
                        <i class="ph ph-caret-right text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all"></i>
                    </button>
                    <p v-if="!spacesConnected" class="text-[9px] text-amber-500/70 mt-2 text-center italic">
                        Note: Full configuration is required to fetch history.
                    </p>
                </div>
                
                <p class="text-[10px] text-slate-500 mt-6 text-center px-4">
                    Configuration is stored locally, while file history is fetched from DigitalOcean.
                </p>
            </div>
        </div>
    </div>
</template>
