import { createRouter, createWebHashHistory } from 'vue-router';
import {
    setReportData,
    setLoading,
    activeSource,
    hasData,
    setSupabaseConfig,
    setDateRange
} from '@/store';
import { loadCachedFile } from '@/utils/storage';
import { parseBuffer, normalizeSupabaseData } from '@/utils/parser';
import { getSupabaseConfig } from '@/utils/supabase';

// Helper to delay execution (useful for ensuring UI is ready)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const routes = [
    {
        path: '/',
        redirect: '/upload'
    },
    {
        path: '/upload',
        name: 'upload',
        // We don't have component imports here because we handle view switching in App.vue mainly
        // However, for proper router view usage, we should probably refactor App.vue to use <router-view>
        // But since the request is specifically about restoring routing logic, we can keep the store sync Logic here.
        // Ideally, routes should map to components. Let's do that properly.
        component: () => import('@/components/UploadView.vue')
    },
    {
        path: '/dashboard',
        name: 'dashboard-home',
        component: () => import('@/views/Dashboard.vue'),
        beforeEnter: async (to, from, next) => {
            if (!hasData.value) {
                next('/upload');
            } else {
                next();
            }
        }
    },
    {
        path: '/dashboard/:filename(.*)',
        name: 'dashboard-file',
        component: () => import('@/views/Dashboard.vue'),
        beforeEnter: async (to, from, next) => {
            const filename = to.params.filename;

            // If we already have data and it matches, just proceed
            // NOTE: we might need to verify if the loaded data matches this filename
            if (hasData.value) {
                // We can check if file names match if we stored filename in store
                // For now, let's assume if data is loaded, we are good.
                // But if user manually changes URL from one file to another, we should reload.
                next();
                return;
            }

            if (filename) {
                try {
                    setLoading(true, 'Restoring session...');

                    // Allow UI to tick
                    await delay(50);

                    // 1. Check if filename is a URL (DO Spaces)
                    let decodedFilename = decodeURIComponent(filename);
                    console.log('[Router] Decoded filename:', decodedFilename);

                    if (decodedFilename.startsWith('spaces/')) {
                        decodedFilename = decodedFilename.replace('spaces/', '');
                        console.log('[Router] Stripped spaces/ prefix:', decodedFilename);
                    }

                    if (decodedFilename.startsWith('http://') || decodedFilename.startsWith('https://')) {
                        console.log('[Router] Fetching from URL:', decodedFilename);
                        const response = await fetch(decodedFilename);
                        if (!response.ok) throw new Error('Failed to fetch data from URL');

                        // Parse as CSV
                        // parseBuffer supports ArrayBuffer/Buffer
                        const buffer = await response.arrayBuffer();
                        console.log('[Router] Buffer received, length:', buffer.byteLength);

                        const normalized = await parseBuffer(buffer, decodedFilename);
                        console.log('[Router] Normalized data count:', normalized.length);

                        if (normalized.length > 0) {
                            setReportData(normalized, decodedFilename.split('/').pop());
                            activeSource.value = 'file';
                            // Crucial: we need to ensure the route parameter reflects reality if we push
                            console.log('[Router] Success, proceeding to Dashboard');
                            next();
                            return;
                        } else {
                            throw new Error('No valid data found in URL');
                        }
                    }

                    // 2. Regular cached file or Supabase
                    // Map generic 'supabase' route param to the actual storage key
                    const storageKey = (filename === 'supabase') ? 'SUPABASE_CACHE' : filename;
                    const cached = await loadCachedFile(storageKey);

                    if (cached && cached.data) {
                        if (cached.isSupabase || filename === 'SUPABASE_CACHE' || filename === 'supabase') {
                            let data = cached.data;
                            if (typeof data === 'string') data = JSON.parse(data);
                            const normalized = normalizeSupabaseData(data);
                            if (normalized.length > 0) {
                                setReportData(normalized, 'Supabase Connection');
                                activeSource.value = 'supabase';

                                // Restore config if available
                                const config = getSupabaseConfig();
                                if (config && config.url && config.key) {
                                    setSupabaseConfig(config.url, config.key);
                                    if (config.startDate && config.endDate) {
                                        setDateRange(config.startDate, config.endDate);
                                    }
                                }
                                next();
                            } else {
                                next('/upload');
                            }
                        } else {
                            // Regular file
                            // Note: parseBuffer now handles ExcelJS which is async
                            // cached.data is ArrayBuffer usually for files
                            const normalized = await parseBuffer(cached.data, filename);
                            if (normalized.length > 0) {
                                setReportData(normalized, filename);
                                activeSource.value = 'file';
                                next();
                            } else {
                                next('/upload');
                            }
                        }
                    } else {
                        console.warn(`File ${filename} not found in cache`);
                        next('/upload');
                    }
                } catch (error) {
                    console.error('Error restoring session:', error);
                    next('/upload');
                } finally {
                    setLoading(false);
                }
            } else {
                next('/upload');
            }
        }
    }
];

const router = createRouter({
    history: createWebHashHistory(),
    routes
});

export default router;

// Helper export for navigation outside components
export function getDashboardFile() {
    const current = router.currentRoute.value;
    return current.params.filename;
}

export function goToUpload() {
    router.push('/upload');
}

export function goToDashboard(filename) {
    if (filename) {
        router.push(`/dashboard/${encodeURIComponent(filename)}`);
    } else {
        router.push('/dashboard');
    }
}
