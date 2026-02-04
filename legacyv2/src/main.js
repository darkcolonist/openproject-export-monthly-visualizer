/**
 * Main Application Entry Point
 * Preact + htm buildless setup
 */
import { h, render } from 'preact';
import { useEffect } from 'preact/hooks';
import htm from 'htm';
import { route, getDashboardFile, goToUpload } from './router.js';
import { settingsMenuOpen, hasData, setLoading, setReportData, activeSource, setSupabaseConfig, setDateRange, supabaseConnected } from './store.js';
import { loadCachedFile } from './utils/storage.js';
import { parseBuffer, normalizeSupabaseData } from './utils/parser.js';
import { getSupabaseConfig } from './utils/supabase.js';
import { UploadView } from './views/Upload.js';
import { DashboardView } from './views/Dashboard.js';
import { Header } from './components/Header.js';
import { LoadingOverlay } from './components/LoadingOverlay.js';
import { SupabaseModal } from './components/SupabaseModal.js';

const html = htm.bind(h);

/**
 * Root App Component
 * Handles routing and global layout
 */
function App() {
    // Close settings menu on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            const settingsMenu = document.querySelector('#settings-menu');
            const settingsBtn = document.querySelector('#settings-btn');
            if (settingsMenuOpen.value &&
                settingsMenu && !settingsMenu.contains(e.target) &&
                settingsBtn && !settingsBtn.contains(e.target)) {
                settingsMenuOpen.value = false;
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Restore state from URL and localStorage on initial load
    useEffect(() => {
        const handleRestoration = async () => {
            // 1. Restore Supabase Config from localStorage
            const config = getSupabaseConfig();
            if (config && config.url && config.key) {
                setSupabaseConfig(config.url, config.key);
                if (config.startDate && config.endDate) {
                    setDateRange(config.startDate, config.endDate);
                }
            }

            // 2. Only restore data if we are on dashboard and have no data yet
            if (route.value.startsWith('#dashboard') && !hasData.value) {
                const filename = getDashboardFile();

                if (filename) {
                    try {
                        // Temporarily show loading
                        setLoading(true, 'Restoring session...');
                        const cached = await loadCachedFile(filename);

                        if (cached && cached.data) {
                            if (cached.isSupabase || filename === 'SUPABASE_CACHE' || filename === 'supabase') {
                                let data = cached.data;
                                if (typeof data === 'string') data = JSON.parse(data);
                                const normalized = normalizeSupabaseData(data);
                                if (normalized.length > 0) {
                                    setReportData(normalized, 'Supabase Connection');
                                    activeSource.value = 'supabase';
                                } else {
                                    goToUpload();
                                }
                            } else {
                                const normalized = await parseBuffer(cached.data);
                                if (normalized.length > 0) {
                                    setReportData(normalized, filename);
                                    activeSource.value = 'file';
                                } else {
                                    goToUpload();
                                }
                            }
                        } else {
                            console.warn('Failed to restore file from URL');
                            goToUpload();
                        }
                    } catch (error) {
                        console.error('Error during restoration:', error);
                        goToUpload();
                    } finally {
                        setLoading(false);
                    }
                } else {
                    // Dashboard without file and without data -> redirect to upload
                    goToUpload();
                }
            }
        };

        handleRestoration();
    }, [route.value]);

    // Determine current view based on route
    const renderView = () => {
        const currentRoute = route.value;

        if (currentRoute.startsWith('#dashboard')) {
            return html`<${DashboardView} />`;
        }

        // Default to upload view
        return html`<${UploadView} />`;
    };

    return html`
        <div class="h-screen flex flex-col font-sans bg-slate-950 overflow-hidden">
            <${Header} />
            
            <main class="flex-1 flex flex-col items-center p-0 relative overflow-hidden">
                ${renderView()}
            </main>

            <${LoadingOverlay} />
            <${SupabaseModal} />
        </div>
    `;
}

// Mount the application
const appContainer = document.getElementById('app');
if (appContainer) {
    render(html`<${App} />`, appContainer);
} else {
    console.error('Could not find #app container');
}

// Export for debugging
window.PreactApp = { route };
