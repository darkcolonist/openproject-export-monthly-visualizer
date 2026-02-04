/**
 * Header Component
 * Top navigation bar with branding and controls
 */
import { h } from 'preact';
import { useState } from 'preact/hooks';
import htm from 'htm';
import { route } from 'app/router.js';
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
    setReportData
} from 'app/store.js';
import { syncSupabase, clearSupabaseConfig } from 'app/utils/supabase.js';
import { deleteCachedFile } from 'app/utils/storage.js';
import { goToUpload } from 'app/router.js';
import { DateFilter } from 'app/components/DateFilter.js';

const html = htm.bind(h);

function formatDateRange() {
    if (!startDate.value && !endDate.value) {
        return 'Showing everything';
    }
    const start = startDate.value || 'Beginning';
    const end = endDate.value || 'Present';
    return `${start} → ${end}`;
}

export function Header() {
    const [dateFilterOpen, setDateFilterOpen] = useState(false);
    const showDashboardControls = route.value.startsWith('#dashboard') && hasData.value;

    const handleCloseDateFilter = () => {
        setDateFilterOpen(false);
    };

    return html`
        <header class="bg-slate-900 border-b border-slate-800 px-6 py-2 flex justify-between items-center shadow-sm shrink-0 z-40 relative">
            <div class="flex items-center gap-3">
                <div class="bg-slate-800 text-blue-400 p-1.5 rounded-lg border border-slate-700">
                    <i class="ph ph-calendar-check text-xl"></i>
                </div>
                <div>
                    <h1 class="font-bold text-base leading-tight text-slate-100">Monthly Project Report</h1>
                    <p class="text-[10px] text-slate-400">Project Trends & Developer Breakdown</p>
                </div>
            </div>

            ${showDashboardControls && html`
                <div class="hidden md:flex items-center transition-all relative">
                    <button 
                        onclick=${() => setDateFilterOpen(!dateFilterOpen)}
                        class="flex items-center gap-3 bg-slate-800/50 hover:bg-slate-700/50 px-4 py-1.5 rounded-xl border border-slate-700/50 transition-all hover:scale-[1.02] active:scale-95 group"
                    >
                        <div class="bg-blue-500/10 text-blue-400 p-1.5 rounded-lg border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
                            <i class="ph ph-calendar text-base"></i>
                        </div>
                        <div class="flex flex-col items-start">
                            <span class="text-[8px] uppercase tracking-widest text-slate-500 font-bold leading-none mb-1">Date Range</span>
                            <span class="text-xs text-slate-200 font-medium">${formatDateRange()}</span>
                        </div>
                        <i class="ph ${dateFilterOpen ? 'ph-caret-up' : 'ph-caret-down'} text-slate-500 ml-1 group-hover:text-slate-300 transition-colors"></i>
                    </button>

                    ${dateFilterOpen && html`<${DateFilter} onClose=${handleCloseDateFilter} />`}
                </div>
            `}

            <div class="flex items-center gap-4">
                ${showDashboardControls && html`
                    <button 
                        onclick=${toggleChart}
                        class="text-[10px] font-medium text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-3 py-1 rounded-full border border-slate-700 hover:bg-slate-700 transition-colors"
                    >
                        <i class="ph ${chartVisible.value ? 'ph-caret-up' : 'ph-caret-down'}"></i>
                        ${chartVisible.value ? 'Hide Graph' : 'Show Graph'}
                    </button>
                `}

                <div class="flex items-center -space-x-px">
                    <a href="./" 
                        class="flex items-center gap-2 px-4 h-[38px] bg-transparent hover:bg-blue-500/10 text-blue-400 text-xs font-bold rounded-l-xl transition-all border border-blue-500/50 hover:border-blue-400 active:scale-95">
                        <i class="ph ph-file-plus text-base"></i>
                        <span>New File</span>
                    </a>

                    <${SettingsMenu} />
                </div>
            </div>
        </header>
    `;
}

function SettingsMenu() {
    const handleToggle = (e) => {
        e.stopPropagation();
        toggleSettings();
    };

    return html`
        <div class="relative">
            <button 
                onclick=${handleToggle}
                class="flex items-center justify-center px-3 h-[38px] bg-transparent hover:bg-blue-500/10 text-blue-400 text-xs font-bold rounded-r-xl transition-all border border-blue-500/50 hover:border-blue-400 border-l-transparent active:scale-95"
                title="Configuration"
            >
                <i class="ph ph-dots-three text-lg"></i>
            </button>
            
            ${settingsMenuOpen.value && html`
                <div class="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
                    <div class="p-2 flex flex-col gap-1">
                        ${supabaseConnected.value && html`
                            <div class="flex items-center gap-2 px-3 py-2 mb-1 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                <div class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div>
                                <span class="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Supabase Connected</span>
                            </div>
                        `}

                        <h4 class="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Data Source</h4>
                        
                        <button 
                            onclick=${() => { showSupabaseModal(); toggleSettings(); }}
                            class="flex items-center gap-3 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-lg transition-colors group"
                        >
                            <i class="ph ph-database text-blue-400 group-hover:scale-110 transition-transform"></i>
                            <span>${supabaseConnected.value ? 'Configure Supabase' : 'Connect Supabase'}</span>
                        </button>

                        ${supabaseConnected.value && html`
                            <button 
                                onclick=${async () => {
                    toggleSettings();
                    try {
                        await syncSupabase(supabaseUrl.value, supabaseKey.value, startDate.value, endDate.value);
                    } catch (e) {
                        alert('Sync failed: ' + e.message);
                    }
                }}
                                class="flex items-center gap-3 px-3 py-2 text-xs text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors group"
                            >
                                <i class="ph ph-arrows-clockwise group-hover:animate-spin"></i>
                                <span>Sync Now</span>
                            </button>
                            <button 
                                onclick=${async () => {
                    if (confirm('Are you sure you want to disconnect Supabase?')) {
                        clearSupabaseConfig();
                        await deleteCachedFile('SUPABASE_CACHE');
                        setSupabaseConfig(null, null);
                        clearData();
                        toggleSettings();
                        goToUpload();
                    }
                }}
                                class="flex items-center gap-3 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors group"
                            >
                                <i class="ph ph-plugs-off group-hover:scale-110 transition-transform"></i>
                                <span>Disconnect Supabase</span>
                            </button>
                        `}
                    </div>
                </div>
            `}
        </div>
    `;
}

export default Header;
