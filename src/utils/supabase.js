/**
 * Supabase Integration
 * Handles data fetching from Supabase
 */
import { setReportData, setLoading, activeSource } from 'app/store.js';
import { goToDashboard } from 'app/router.js';

const TABLE_NAME = 'openproject_timeentries';
const ROW_LIMIT = 1000;

/**
 * Fetch data from Supabase
 */
export async function fetchSupabaseData(url, key, startDate = null, endDate = null) {
    if (!url || !key) {
        throw new Error('Supabase URL and Key are required');
    }

    // Build URL with filters
    let fetchUrl = `${url}/rest/v1/${TABLE_NAME}?order=date_spent.desc&limit=${ROW_LIMIT}`;

    if (startDate && endDate) {
        fetchUrl += `&date_spent=gte.${startDate}-01`;
        const [y, m] = endDate.split('-');
        const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
        fetchUrl += `&date_spent=lte.${y}-${m}-${lastDay}`;
    } else {
        // Default to last 3 months
        const today = new Date();
        const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1);
        const isoDate = threeMonthsAgo.toISOString().split('T')[0];
        fetchUrl += `&date_spent=gte.${isoDate}`;
    }

    const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to connect to Supabase' }));
        throw new Error(error.message || 'Failed to fetch from Supabase');
    }

    return response.json();
}

/**
 * Fetch row count from Supabase
 */
export async function fetchSupabaseCount(url, key, startDate = null, endDate = null) {
    if (!url || !key) return 0;

    let fetchUrl = `${url}/rest/v1/${TABLE_NAME}?limit=0`;

    if (startDate && endDate) {
        fetchUrl += `&date_spent=gte.${startDate}-01`;
        const [y, m] = endDate.split('-');
        const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
        fetchUrl += `&date_spent=lte.${y}-${m}-${lastDay}`;
    } else {
        const today = new Date();
        const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1);
        const isoDate = threeMonthsAgo.toISOString().split('T')[0];
        fetchUrl += `&date_spent=gte.${isoDate}`;
    }

    const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Prefer': 'count=exact'
        }
    });

    if (!response.ok) {
        throw new Error('Failed to connect to Supabase');
    }

    const contentRange = response.headers.get('content-range');
    if (contentRange) {
        const count = contentRange.split('/')[1];
        return parseInt(count) || 0;
    }
    return 0;
}

/**
 * Normalize Supabase data to match expected format
 */
function normalizeSupabaseData(data) {
    return data.map((row, index) => ({
        id: index,
        date: extractMonth(row.date_spent),
        user: row.user || 'Unknown',
        units: parseFloat(row.hours) || 0,
        project: row.project || 'Unassigned',
        rawDate: row.date_spent
    })).filter(row => row.date && row.units > 0);
}

/**
 * Extract YYYY-MM from date string
 */
function extractMonth(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Sync data from Supabase
 */
export async function syncSupabase(url, key, startDate = null, endDate = null) {
    setLoading(true, 'Syncing with Supabase...');

    try {
        const rawData = await fetchSupabaseData(url, key, startDate, endDate);

        if (!rawData || rawData.length === 0) {
            setLoading(false);
            throw new Error('No data found in Supabase');
        }

        const normalizedData = normalizeSupabaseData(rawData);

        if (normalizedData.length === 0) {
            setLoading(false);
            throw new Error('No valid data found after normalization');
        }

        // Cache the Supabase data (store in legacy format for backward compatibility)
        await cacheSupabaseData(rawData);

        setReportData(normalizedData, 'Supabase Connection');
        activeSource.value = 'supabase';

        setLoading(false);
        goToDashboard();

        return {
            success: true,
            rowCount: rawData.length,
            isLimitReached: rawData.length >= ROW_LIMIT
        };
    } catch (error) {
        setLoading(false);
        throw error;
    }
}

/**
 * Cache Supabase data to IndexedDB
 * Stores in legacy format for backward compatibility
 */
async function cacheSupabaseData(rawData) {
    try {
        const dbRequest = indexedDB.open('FileCache', 4);

        return new Promise((resolve) => {
            dbRequest.onsuccess = function (event) {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('files')) {
                    resolve(false);
                    return;
                }

                const transaction = db.transaction(['files'], 'readwrite');
                const store = transaction.objectStore('files');

                // Store in legacy format: Date, User, Units, Project
                const legacyData = rawData.map(row => ({
                    Date: row.date_spent,
                    User: row.user,
                    Units: row.hours,
                    Project: row.project,
                    _isSupabase: true
                }));

                const fileData = {
                    name: 'SUPABASE_CACHE',
                    data: legacyData,
                    timestamp: Date.now(),
                    rowCount: rawData.length,
                    isSupabase: true
                };

                store.put(fileData);

                transaction.oncomplete = () => resolve(true);
                transaction.onerror = () => resolve(false);
            };

            dbRequest.onerror = () => resolve(false);
        });
    } catch (e) {
        console.error('Error caching Supabase data:', e);
        return false;
    }
}


/**
 * Get saved Supabase config from localStorage
 */
export function getSupabaseConfig() {
    try {
        const config = localStorage.getItem('supabaseConfig');
        if (config) {
            return JSON.parse(config);
        }
    } catch (e) {
        console.error('Error loading Supabase config:', e);
    }
    return null;
}

/**
 * Save Supabase config to localStorage
 */
export function saveSupabaseConfig(url, key, startDate = null, endDate = null) {
    localStorage.setItem('supabaseConfig', JSON.stringify({
        url,
        key,
        startDate,
        endDate
    }));
}

/**
 * Clear Supabase config from localStorage
 */
export function clearSupabaseConfig() {
    localStorage.removeItem('supabaseConfig');
}
