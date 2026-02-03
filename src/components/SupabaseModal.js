/**
 * Supabase Modal Component
 * Modal for configuring Supabase connection
 */
import { h } from 'preact';
import { useRef, useState, useEffect } from 'preact/hooks';
import htm from 'htm';
import {
    supabaseModalOpen,
    hideSupabaseModal,
    supabaseUrl,
    supabaseKey,
    startDate,
    endDate,
    setDateRange,
    setSupabaseConfig
} from 'app/store.js';
import {
    fetchSupabaseCount,
    syncSupabase,
    getSupabaseConfig,
    saveSupabaseConfig
} from 'app/utils/supabase.js';

const html = htm.bind(h);

export function SupabaseModal() {
    const [url, setUrl] = useState('');
    const [key, setKey] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [rowCount, setRowCount] = useState(0);
    const [connectionError, setConnectionError] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);

    // Date picker states
    const startPickerRef = useRef(null);
    const endPickerRef = useRef(null);
    const startDatepickerRef = useRef(null);
    const endDatepickerRef = useRef(null);
    const [localStart, setLocalStart] = useState('');
    const [localEnd, setLocalEnd] = useState('');

    // Load saved config when modal opens
    useEffect(() => {
        if (supabaseModalOpen.value) {
            const config = getSupabaseConfig();
            if (config) {
                setUrl(config.url || '');
                setKey(config.key || '');
                setLocalStart(config.startDate || '');
                setLocalEnd(config.endDate || '');
                if (config.url && config.key) {
                    setIsConnected(true);
                }
            } else {
                setUrl(supabaseUrl.value || '');
                setKey(supabaseKey.value || '');

                // Default to last 3 months if no config
                const today = new Date();
                const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1);
                const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

                const formatMonth = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

                setLocalStart(formatMonth(threeMonthsAgo));
                setLocalEnd(formatMonth(currentMonth));
            }
        }
    }, [supabaseModalOpen.value]);

    // Initialize date pickers when connected
    useEffect(() => {
        if (!isConnected || !supabaseModalOpen.value) return;

        const localeEn = {
            days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            daysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            daysMin: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
            months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
            monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            today: 'Today',
            clear: 'Clear',
            dateFormat: 'yyyy-MM',
            timeFormat: 'hh:mm aa',
            firstDay: 0
        };

        const now = new Date();
        const maxDate = new Date(now.getFullYear(), now.getMonth(), 1);

        // Initialize Air Datepicker for start date
        if (startPickerRef.current && !startDatepickerRef.current) {
            startDatepickerRef.current = new AirDatepicker(startPickerRef.current, {
                locale: localeEn,
                view: 'months',
                minView: 'months',
                dateFormat: 'yyyy-MM',
                autoClose: true,
                position: 'bottom center',
                classes: 'dark-datepicker',
                maxDate: localEnd ? new Date(parseInt(localEnd.split('-')[0]), parseInt(localEnd.split('-')[1]) - 1, 1) : maxDate,
                onSelect: ({ date }) => {
                    if (date) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const newStart = `${year}-${month}`;
                        setLocalStart(newStart);
                        if (endDatepickerRef.current) {
                            endDatepickerRef.current.update({ minDate: date });
                        }
                    }
                }
            });

            if (localStart) {
                const [y, m] = localStart.split('-');
                startDatepickerRef.current.selectDate(new Date(parseInt(y), parseInt(m) - 1, 1));
            }
        }

        // Initialize Air Datepicker for end date
        if (endPickerRef.current && !endDatepickerRef.current) {
            endDatepickerRef.current = new AirDatepicker(endPickerRef.current, {
                locale: localeEn,
                view: 'months',
                minView: 'months',
                dateFormat: 'yyyy-MM',
                autoClose: true,
                position: 'bottom center',
                classes: 'dark-datepicker',
                minDate: localStart ? new Date(parseInt(localStart.split('-')[0]), parseInt(localStart.split('-')[1]) - 1, 1) : null,
                maxDate: maxDate,
                onSelect: ({ date }) => {
                    if (date) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const newEnd = `${year}-${month}`;
                        setLocalEnd(newEnd);
                        if (startDatepickerRef.current) {
                            startDatepickerRef.current.update({ maxDate: date });
                        }
                    }
                }
            });

            if (localEnd) {
                const [y, m] = localEnd.split('-');
                endDatepickerRef.current.selectDate(new Date(parseInt(y), parseInt(m) - 1, 1));
            }
        }

        return () => {
            if (startDatepickerRef.current) {
                startDatepickerRef.current.destroy();
                startDatepickerRef.current = null;
            }
            if (endDatepickerRef.current) {
                endDatepickerRef.current.destroy();
                endDatepickerRef.current = null;
            }
        };
    }, [isConnected, supabaseModalOpen.value]);

    // Re-fetch count when date range changes
    useEffect(() => {
        if (isConnected && url && key && localStart && localEnd) {
            handleConnect();
        }
    }, [localStart, localEnd]);

    if (!supabaseModalOpen.value) return null;

    const handleConnect = async () => {
        if (!url || !key) return;

        setIsConnecting(true);
        setConnectionError('');

        try {
            const count = await fetchSupabaseCount(url, key, localStart, localEnd);
            setRowCount(count);
            setIsConnected(true);
        } catch (error) {
            console.error('Supabase connection error:', error);
            setConnectionError(error.message || 'Failed to connect to Supabase');
            setIsConnected(false);
        } finally {
            setIsConnecting(false);
        }
    };

    const handleSave = async () => {
        if (!isConnected) return;

        setIsSyncing(true);

        try {
            // Save config first
            saveSupabaseConfig(url, key, localStart, localEnd);
            setSupabaseConfig(url, key);
            setDateRange(localStart, localEnd);

            // Sync data
            await syncSupabase(url, key, localStart, localEnd);

            hideSupabaseModal();
        } catch (error) {
            console.error('Supabase sync error:', error);
            alert('Failed to sync data: ' + error.message);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleClose = () => {
        hideSupabaseModal();
    };

    // Reset connection state when URL or key changes
    const handleUrlChange = (e) => {
        setUrl(e.target.value);
        setIsConnected(false);
        setConnectionError('');
    };

    const handleKeyChange = (e) => {
        setKey(e.target.value);
        setIsConnected(false);
        setConnectionError('');
    };

    return html`
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm -z-10" onclick=${handleClose}></div>
            
            <div class="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <!-- Header -->
                <div class="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <h3 class="text-lg font-bold text-slate-100 flex items-center gap-2">
                        <i class="ph ph-database text-blue-400"></i>
                        Connect Supabase
                    </h3>
                    <button onclick=${handleClose} class="text-slate-500 hover:text-slate-300">
                        <i class="ph ph-x text-xl"></i>
                    </button>
                </div>
                
                <!-- Content -->
                <div class="p-6 space-y-5">
                    <div class="space-y-2">
                        <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">Base URL</label>
                        <input 
                            type="text" 
                            placeholder="https://xyz.supabase.co"
                            value=${url}
                            onInput=${handleUrlChange}
                            class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                        />
                    </div>
                    
                    <div class="space-y-2">
                        <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">Anon / Public Key</label>
                        <input 
                            type="password" 
                            placeholder="ey4M3r57gPmdpGsstMcFB4UPh..."
                            value=${key}
                            onInput=${handleKeyChange}
                            class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                        />
                    </div>

                    <button 
                        onclick=${handleConnect}
                        disabled=${!url || !key || isConnecting}
                        class="w-full py-2.5 ${isConnected
            ? 'bg-green-500/20 text-green-400 border-green-500/30'
            : connectionError
                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-blue-400 border-slate-700'
        } font-bold rounded-xl border transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        ${isConnecting ? html`
                            <div class="w-4 h-4 border-2 border-current opacity-20 border-t-current rounded-full animate-spin"></div>
                            Connecting...
                        ` : isConnected ? html`
                            <i class="ph ph-check-circle"></i>
                            Connected
                        ` : connectionError ? html`
                            <i class="ph ph-warning-circle"></i>
                            Connection Failed
                        ` : html`
                            <i class="ph ph-plugs"></i>
                            Connect
                        `}
                    </button>

                    ${connectionError && html`
                        <div class="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                            <p class="text-[10px] text-red-300 leading-relaxed">${connectionError}</p>
                        </div>
                    `}

                    ${isConnected && html`
                        <div class="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                            <!-- Date Range Picker -->
                            <div class="grid grid-cols-2 gap-3">
                                <div class="space-y-2">
                                    <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">From Month</label>
                                    <input 
                                        ref=${startPickerRef}
                                        type="text" 
                                        readonly
                                        value=${localStart}
                                        class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 cursor-pointer"
                                    />
                                </div>
                                <div class="space-y-2">
                                    <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">To Month</label>
                                    <input 
                                        ref=${endPickerRef}
                                        type="text" 
                                        readonly
                                        value=${localEnd}
                                        class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 cursor-pointer"
                                    />
                                </div>
                            </div>

                            <div class="flex items-center justify-between px-1">
                                <span class="text-[10px] ${rowCount >= 1000 ? 'text-red-400' : 'text-green-400'} font-medium">Data found in range:</span>
                                <span class="text-[10px] font-bold ${rowCount >= 1000 ? 'text-red-400' : 'text-green-400'}">${rowCount.toLocaleString()} rows</span>
                            </div>
                            
                            ${rowCount >= 1000 && html`
                                <div class="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                                    <div class="flex gap-3">
                                        <i class="ph ph-warning-circle text-amber-400 text-lg shrink-0"></i>
                                        <p class="text-[10px] text-amber-200 leading-relaxed italic">
                                            Warning: Found ${rowCount.toLocaleString()} rows. Only 1,000 rows will be fetched. Consider narrowing your date range.
                                        </p>
                                    </div>
                                </div>
                            `}
                        </div>
                    `}

                    <div class="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
                        <p class="text-[10px] text-blue-300 leading-relaxed italic">
                            Credentials are stored only in your browser. Data is fetched directly from Supabase via REST API. Max 1,000 rows per sync.
                        </p>
                    </div>
                </div>

                <!-- Footer -->
                <div class="p-6 bg-slate-800/50 border-t border-slate-800 flex flex-col gap-3">
                    <button 
                        onclick=${handleSave}
                        disabled=${!isConnected || isSyncing}
                        class="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                    >
                        ${isSyncing ? html`
                            <div class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                            Syncing...
                        ` : html`
                            <i class="ph ph-check-circle text-lg"></i>
                            Save & Sync Data
                        `}
                    </button>
                </div>
            </div>
        </div>
    `;
}

export default SupabaseModal;
