/**
 * Global State Store using Preact Signals
 * Centralized state management for the application
 */
import { signal, computed } from '@preact/signals';

// ===== Core Application State =====
export const rawData = signal([]);
export const fileName = signal(null);
export const isLoading = signal(false);
export const loadingText = signal('Processing...');
export const activeSource = signal(null); // 'file' or 'supabase'

// ===== Date Range Filter State =====
export const startDate = signal(null); // YYYY-MM
export const endDate = signal(null);   // YYYY-MM

// ===== Chart Instances (not reactive, just storage) =====
export const chartInstance = signal(null);
export const developerChartInstance = signal(null);

// ===== Supabase Configuration =====
export const supabaseUrl = signal(null);
export const supabaseKey = signal(null);
export const supabaseConnected = signal(false);

// ===== UI State =====
export const chartVisible = signal(true);
export const settingsMenuOpen = signal(false);
export const supabaseModalOpen = signal(false);

// ===== Derived State (Computed) =====
export const filteredData = computed(() => {
    let data = rawData.value;

    if (startDate.value) {
        data = data.filter(row => row.date >= startDate.value);
    }

    if (endDate.value) {
        data = data.filter(row => row.date <= endDate.value);
    }

    return data;
});

export const activeData = computed(() => {
    return filteredData.value.filter(row => row.units > 0);
});

export const hasData = computed(() => {
    return rawData.value.length > 0;
});

// Detailed map: { [Developer]: { [Project]: { [MonthKey]: hours } } }
export const detailedMap = computed(() => {
    const map = {};
    rawData.value.forEach(entry => {
        const dev = entry.user;
        const proj = entry.project;
        const month = entry.date; // Assuming format YYYY-MM

        if (!map[dev]) map[dev] = {};
        if (!map[dev][proj]) map[dev][proj] = {};
        if (!map[dev][proj][month]) map[dev][proj][month] = 0;
        map[dev][proj][month] += parseFloat(entry.units) || 0;
    });
    return map;
});

// ===== Actions =====
export function setReportData(data, name) {
    rawData.value = data;
    fileName.value = name;
}

export function setLoading(loading, text = 'Processing...') {
    isLoading.value = loading;
    loadingText.value = text;
}

export function setDateRange(start, end) {
    startDate.value = start;
    endDate.value = end;
}

export function clearData() {
    rawData.value = [];
    fileName.value = null;
    startDate.value = null;
    endDate.value = null;
    activeSource.value = null;
}

export function setSupabaseConfig(url, key) {
    supabaseUrl.value = url;
    supabaseKey.value = key;
    supabaseConnected.value = !!(url && key);
}

export function toggleSettings() {
    settingsMenuOpen.value = !settingsMenuOpen.value;
}

export function showSupabaseModal() {
    supabaseModalOpen.value = true;
}

export function hideSupabaseModal() {
    supabaseModalOpen.value = false;
}

export function toggleChart() {
    chartVisible.value = !chartVisible.value;
}
