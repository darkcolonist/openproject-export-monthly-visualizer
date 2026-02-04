/**
 * Hash Router for Preact Application
 * Simple client-side routing using hash fragments
 */
import { signal } from '@preact/signals';

// Current route signal
export const route = signal(window.location.hash || '#upload');

// Listen to hash changes
window.addEventListener('hashchange', () => {
    route.value = window.location.hash || '#upload';
});

// Navigation function
export function navigate(path) {
    window.location.hash = path;
}

// Helper to check current route
export function isRoute(path) {
    return route.value === path || route.value.startsWith(path + '/');
}

// Route parameters (legacy query string support)
export function getRouteParams() {
    const hash = route.value;
    const [path, queryString] = hash.split('?');
    const params = {};

    if (queryString) {
        queryString.split('&').forEach(pair => {
            const [key, value] = pair.split('=');
            params[decodeURIComponent(key)] = decodeURIComponent(value || '');
        });
    }

    return { path, params };
}

// Helper to get file from path-based route #dashboard/filename
export function getDashboardFile() {
    const hash = route.value;
    if (hash.startsWith('#dashboard/')) {
        return decodeURIComponent(hash.substring('#dashboard/'.length));
    }
    // Fallback to query param
    const { params } = getRouteParams();
    return params.file || null;
}

// Navigate to dashboard with optional file key
export function goToDashboard(fileKey = null) {
    if (fileKey) {
        navigate(`#dashboard/${encodeURIComponent(fileKey)}`);
    } else {
        navigate('#dashboard');
    }
}

// Navigate to upload screen
export function goToUpload() {
    navigate('#upload');
}
