/**
 * Global State Store
 * Centralized state management for the application using Vue Reactivity
 */
import { ref, computed, reactive } from 'vue';

// ===== Core Application State =====
export const rawData = ref([]);
export const fileName = ref(null);
export const isLoading = ref(false);
export const loadingText = ref('Processing...');
export const activeSource = ref(null); // 'file' or 'supabase'

// ===== Date Range Filter State =====
export const startDate = ref(null); // YYYY-MM
export const endDate = ref(null);   // YYYY-MM

// ===== Supabase Configuration =====
export const supabaseUrl = ref(null);
export const supabaseKey = ref(null);
export const supabaseConnected = ref(false);

// ===== DigitalOcean Spaces Configuration =====
export const spacesAccessKey = ref(null);
export const spacesSecretKey = ref(null);
export const spacesEndpoint = ref(null);
export const spacesBucket = ref(null);
export const spacesPath = ref(null);
export const spacesConnected = ref(false);

// ===== UI State =====
export const chartVisible = ref(true);
export const chartShrunk = ref(false);
export const settingsMenuOpen = ref(false);
export const supabaseModalOpen = ref(false);
export const spacesModalOpen = ref(false);

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

export function setSpacesConfig(config) {
    spacesAccessKey.value = config.accessKey;
    spacesSecretKey.value = config.secretKey;
    spacesEndpoint.value = config.endpoint;
    spacesBucket.value = config.bucket;
    spacesPath.value = config.path;
    spacesConnected.value = !!(config.accessKey && config.secretKey && config.endpoint && config.bucket);
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

export function showSpacesModal() {
    spacesModalOpen.value = true;
}

export function hideSpacesModal() {
    spacesModalOpen.value = false;
}

export function toggleChart() {
    chartVisible.value = !chartVisible.value;
}

export function setFilteredData(data) {
    // This is mainly for read-only access to filteredData, 
    // but if we needed manual override it's here. 
    // In this pattern, computed is preferred.
}
