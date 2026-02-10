<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue';
import { 
    supabaseModalOpen,
    hideSupabaseModal, 
    startDate, 
    endDate,
    setDateRange,
    setSupabaseConfig as updateStoreConfig,
    clearData
} from '@/store';
import { 
    fetchSupabaseCount, 
    syncSupabase, 
    getSupabaseConfig, 
    saveSupabaseConfig,
    clearSupabaseConfig
} from '@/utils/supabase';
import { deleteCachedFile } from '@/utils/storage';
import AirDatepicker from 'air-datepicker';
import localeEn from 'air-datepicker/locale/en';
import 'air-datepicker/air-datepicker.css';
import { goToDashboard } from '@/router';
import { toast } from '@/utils/toast';

const url = ref('');
const key = ref('');
const isConnecting = ref(false);
const isConnected = ref(false);
const rowCount = ref(0);
const connectionError = ref('');
const isSyncing = ref(false);

const startPickerRef = ref(null);
const endPickerRef = ref(null);
const startDatepicker = ref(null);
const endDatepicker = ref(null);
const localStart = ref('');
const localEnd = ref('');

// Watch modal state to load config
watch(() => supabaseModalOpen.value, (isOpen) => {
    if (isOpen) {
        const config = getSupabaseConfig();
        if (config) {
            url.value = config.url || '';
            key.value = config.key || '';
            localStart.value = config.startDate || '';
            localEnd.value = config.endDate || '';
        } else {
             // Default to last 3 months if no config
             const today = new Date();
             const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1);
             const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

             const formatMonth = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

             localStart.value = formatMonth(threeMonthsAgo);
             localEnd.value = formatMonth(currentMonth);
        }
    }
});

// Watch connection state to init datepickers
watch(isConnected, (connected) => {
    if (connected && supabaseModalOpen.value) {
        // Use nextTick usually better in Vue but here simple timeout works for mount guarantee
        setTimeout(initDatePickers, 50);
    }
});

function initDatePickers() {
     const now = new Date();
     const maxDate = new Date(now.getFullYear(), now.getMonth(), 1);
     
     const locale = {
        ...localeEn,
        dateFormat: 'yyyy-MM',
    };

    // Start Picker
    if (startPickerRef.value && !startDatepicker.value) {
        startDatepicker.value = new AirDatepicker(startPickerRef.value, {
            locale: locale,
            view: 'months',
            minView: 'months',
            container: 'body',
            dateFormat: 'yyyy-MM',
            autoClose: true,
            position: 'bottom center',
            classes: 'dark-datepicker',
            maxDate: localEnd.value ? new Date(parseInt(localEnd.value.split('-')[0]), parseInt(localEnd.value.split('-')[1]) - 1, 1) : maxDate,
            onSelect: ({ date }) => {
                if (date) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    localStart.value = `${year}-${month}`;
                    if (endDatepicker.value) endDatepicker.value.update({ minDate: date });
                }
            }
        });

        if (localStart.value) {
            const [y, m] = localStart.value.split('-');
            startDatepicker.value.selectDate(new Date(parseInt(y), parseInt(m) - 1, 1));
        }
    }

    // End Picker
    if (endPickerRef.value && !endDatepicker.value) {
        endDatepicker.value = new AirDatepicker(endPickerRef.value, {
            locale: locale,
            view: 'months',
            minView: 'months',
            container: 'body',
            dateFormat: 'yyyy-MM',
            autoClose: true,
            position: 'bottom center',
            classes: 'dark-datepicker',
            minDate: localStart.value ? new Date(parseInt(localStart.value.split('-')[0]), parseInt(localStart.value.split('-')[1]) - 1, 1) : null,
            maxDate: maxDate,
            onSelect: ({ date }) => {
                if (date) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    localEnd.value = `${year}-${month}`;
                    if (startDatepicker.value) startDatepicker.value.update({ maxDate: date });
                }
            }
        });

        if (localEnd.value) {
            const [y, m] = localEnd.value.split('-');
            endDatepicker.value.selectDate(new Date(parseInt(y), parseInt(m) - 1, 1));
        }
    }
}

onUnmounted(() => {
    if (startDatepicker.value) startDatepicker.value.destroy();
    if (endDatepicker.value) endDatepicker.value.destroy();
});

// Watch dates to re-fetch count
watch([localStart, localEnd], ([newStart, newEnd]) => {
    if (isConnected.value && url.value && key.value && newStart && newEnd) {
        handleConnect(true);
    }
});

const handleConnect = async (skipLoading = false) => {
    if (!url.value || !key.value) return;

    if (!skipLoading) {
        isConnecting.value = true;
        connectionError.value = ''; // Assuming ref
    }
    connectionError.value = '';

    try {
        const count = await fetchSupabaseCount(url.value, key.value, localStart.value, localEnd.value);
        rowCount.value = count;
        isConnected.value = true;
    } catch (error) {
        console.error('Supabase connection error:', error);
        connectionError.value = error.message || 'Failed to connect to Supabase';
        isConnected.value = false;
    } finally {
        if (!skipLoading) isConnecting.value = false;
    }
};

const handleSave = async () => {
    if (!isConnected.value) return;

    isSyncing.value = true;

    try {
        saveSupabaseConfig(url.value, key.value, localStart.value, localEnd.value);
        updateStoreConfig(url.value, key.value);
        setDateRange(localStart.value, localEnd.value);

        await syncSupabase(url.value, key.value, localStart.value, localEnd.value);
        
        hideSupabaseModal();
        goToDashboard('supabase');
    } catch (error) {
        console.error('Supabase sync error:', error);
        toast.error('Failed to sync data: ' + error.message);
    } finally {
        isSyncing.value = false;
    }
};

const handleSyncNow = async () => {
    if (!isConnected.value) return;
    isSyncing.value = true;
    try {
        await syncSupabase(url.value, key.value, localStart.value, localEnd.value);
    } catch (error) {
        toast.error('Sync failed: ' + error.message);
    } finally {
        isSyncing.value = false;
    }
};

const handleDisconnect = async () => {
    if (confirm('Are you sure you want to disconnect Supabase?')) {
        clearSupabaseConfig();
        await deleteCachedFile('SUPABASE_CACHE');
        updateStoreConfig(null, null);
        clearData();
        hideSupabaseModal();
        goToUpload();
    }
};

const handleClose = () => {
    hideSupabaseModal();
};

const handleUrlChange = (e) => {
    url.value = e.target.value;
    isConnected.value = false;
    connectionError.value = '';
};

const handleKeyChange = (e) => {
    key.value = e.target.value;
    isConnected.value = false;
    connectionError.value = '';
};
</script>

<template>
    <div v-if="supabaseModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm -z-10" @click="handleClose"></div>
        
        <div class="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            <!-- Header -->
            <div class="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 shrink-0">
                <h3 class="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <i class="ph ph-database text-blue-400"></i>
                    Connect Supabase
                </h3>
                <button @click="handleClose" class="text-slate-500 hover:text-slate-300">
                    <i class="ph ph-x text-xl"></i>
                </button>
            </div>
            
            <!-- Content -->
            <div class="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
                <div class="space-y-2">
                    <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">Base URL</label>
                    <input 
                        type="text" 
                        placeholder="https://xyz.supabase.co"
                        :value="url"
                        @input="handleUrlChange"
                        class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    />
                </div>
                
                <div class="space-y-2">
                    <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">Anon / Public Key</label>
                    <input 
                        type="password" 
                        placeholder="ey4M3r57gPmdpGsstMcFB4UPh..."
                        :value="key"
                        @input="handleKeyChange"
                        class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    />
                </div>

                <button 
                    @click="handleConnect(false)"
                    :disabled="!url || !key || isConnecting"
                    :class="[
                        'w-full py-2.5 font-bold rounded-xl border transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed',
                        isConnected
                            ? 'bg-green-500/20 text-green-400 border-green-500/30'
                            : connectionError
                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                : 'bg-slate-800 hover:bg-slate-700 text-blue-400 border-slate-700'
                    ]"
                >
                    <template v-if="isConnecting">
                        <div class="w-4 h-4 border-2 border-current opacity-20 border-t-current rounded-full animate-spin"></div>
                        Connecting...
                    </template>
                    <template v-else-if="isConnected">
                        <i class="ph ph-check-circle"></i>
                        Connected
                    </template>
                    <template v-else-if="connectionError">
                        <i class="ph ph-warning-circle"></i>
                        Connection Failed
                    </template>
                    <template v-else>
                        <i class="ph ph-plugs"></i>
                        Connect
                    </template>
                </button>

                <div v-if="connectionError" class="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <p class="text-[10px] text-red-300 leading-relaxed">{{ connectionError }}</p>
                </div>

                <div v-if="isConnected" class="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <!-- Date Range Picker -->
                    <div class="grid grid-cols-2 gap-3">
                        <div class="space-y-2">
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">From Month</label>
                            <input 
                                ref="startPickerRef"
                                type="text" 
                                readonly
                                :value="localStart"
                                class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 cursor-pointer"
                            />
                        </div>
                        <div class="space-y-2">
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">To Month</label>
                            <input 
                                ref="endPickerRef"
                                type="text" 
                                readonly
                                :value="localEnd"
                                class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 cursor-pointer"
                            />
                        </div>
                    </div>

                    <div class="flex items-center justify-between px-1">
                        <span :class="['text-[10px] font-medium', rowCount >= 1000 ? 'text-red-400' : 'text-green-400']">Data found in range:</span>
                        <span :class="['text-[10px] font-bold', rowCount >= 1000 ? 'text-red-400' : 'text-green-400']">{{ rowCount.toLocaleString() }} rows</span>
                    </div>
                    
                    <div v-if="rowCount >= 1000" class="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                        <div class="flex gap-3">
                            <i class="ph ph-warning-circle text-amber-400 text-lg shrink-0"></i>
                            <p class="text-[10px] text-amber-200 leading-relaxed italic">
                                Warning: Found {{ rowCount.toLocaleString() }} rows. Only 1,000 rows will be fetched. Consider narrowing your date range.
                            </p>
                        </div>
                    </div>

                    <!-- Additional Actions for Connected State -->
                    <div class="pt-2 flex flex-col gap-2">
                        <button 
                            @click="handleSyncNow"
                            :disabled="isSyncing"
                            class="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-all"
                        >
                            <i :class="['ph ph-arrows-clockwise text-sm', isSyncing ? 'animate-spin' : '']"></i>
                            {{ isSyncing ? 'Syncing...' : 'Sync Now' }}
                        </button>
                        
                        <button 
                            @click="handleDisconnect"
                            class="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all"
                        >
                            <i class="ph ph-plugs-off text-sm"></i>
                            Disconnect Supabase
                        </button>
                    </div>
                </div>

                <div class="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
                    <p class="text-[10px] text-blue-300 leading-relaxed italic">
                        Credentials are stored only in your browser. Data is fetched directly from Supabase via REST API. Max 1,000 rows per sync.
                    </p>
                </div>
            </div>

            <!-- Footer -->
            <div class="p-6 bg-slate-800/50 border-t border-slate-800 flex flex-col gap-3 shrink-0">
                <button 
                    @click="handleSave"
                    :disabled="!isConnected || isSyncing"
                    class="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                >
                    <template v-if="isSyncing">
                        <div class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        Syncing...
                    </template>
                    <template v-else>
                        <i class="ph ph-check-circle text-lg"></i>
                        Save & Sync Data
                    </template>
                </button>
            </div>
        </div>
    </div>
</template>
