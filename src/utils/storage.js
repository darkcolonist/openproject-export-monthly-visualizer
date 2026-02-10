/**
 * Storage Utilities
 * Handles IndexedDB caching of uploaded files
 */

const DB_NAME = 'FileCache';
const DB_VERSION = 4;
const STORE_NAME = 'files';
const MAX_FILES = 5;
const FILE_EXPIRY_MS = 86400000; // 24 hours
const SUPABASE_EXPIRY_MS = 365 * 24 * 60 * 60 * 1000; // 365 days

/**
 * Open IndexedDB connection
 */
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (db.objectStoreNames.contains(STORE_NAME)) {
                db.deleteObjectStore(STORE_NAME);
            }
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'name' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Cache a file in IndexedDB
 */
export async function cacheFile(file, fileData, rowCount = 0) {
    try {
        const db = await openDatabase();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            const data = {
                name: file.name,
                data: fileData,
                timestamp: Date.now(),
                rowCount: rowCount
            };

            const request = store.put(data);

            request.onsuccess = async () => {
                // Clean up old files (keep only MAX_FILES)
                await cleanupOldFiles(db);
                resolve(true);
            };

            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error caching file:', error);
        return false;
    }
}

/**
 * Clean up old files, keeping only the most recent MAX_FILES
 */
async function cleanupOldFiles(db) {
    return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            const files = request.result || [];

            if (files.length > MAX_FILES) {
                // Sort by timestamp (oldest first)
                files.sort((a, b) => a.timestamp - b.timestamp);

                // Remove oldest files
                const filesToRemove = files.slice(0, files.length - MAX_FILES);
                const deleteTransaction = db.transaction([STORE_NAME], 'readwrite');
                const deleteStore = deleteTransaction.objectStore(STORE_NAME);

                filesToRemove.forEach(file => {
                    if (file.name !== 'SUPABASE_CACHE') {
                        deleteStore.delete(file.name);
                    }
                });
            }
            resolve();
        };

        request.onerror = () => resolve();
    });
}

/**
 * Get all cached files (non-expired)
 */
export async function getAllCachedFiles() {
    try {
        const db = await openDatabase();

        return new Promise((resolve) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                const files = request.result || [];
                const now = Date.now();

                const validFiles = files
                    .filter(file => {
                        const age = now - file.timestamp;
                        if (file.name === 'SUPABASE_CACHE' || file.isSupabase) {
                            return age < SUPABASE_EXPIRY_MS;
                        }
                        return age < FILE_EXPIRY_MS;
                    })
                    .sort((a, b) => b.timestamp - a.timestamp);

                resolve(validFiles);
            };

            request.onerror = () => resolve([]);
        });
    } catch (error) {
        console.error('Error getting cached files:', error);
        return [];
    }
}

/**
 * Load a cached file by filename
 */
export async function loadCachedFile(filename) {
    try {
        const db = await openDatabase();

        return new Promise((resolve) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(filename);

            request.onsuccess = () => {
                const cachedFile = request.result;
                if (cachedFile) {
                    const age = Date.now() - cachedFile.timestamp;
                    // Use appropriate expiry based on file type
                    const expiry = (cachedFile.isSupabase || filename === 'SUPABASE_CACHE')
                        ? SUPABASE_EXPIRY_MS
                        : FILE_EXPIRY_MS;

                    if (age < expiry) {
                        resolve(cachedFile);
                        return;
                    }
                }
                resolve(null);
            };

            request.onerror = () => resolve(null);
        });
    } catch (error) {
        console.error('Error loading cached file:', error);
        return null;
    }
}


/**
 * Delete a cached file by filename
 */
export async function deleteCachedFile(filename) {
    try {
        const db = await openDatabase();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(filename);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error deleting cached file:', error);
        return false;
    }
}



/**
 * Clear all cached files
 */
export async function clearCache() {
    try {
        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(DB_NAME);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error clearing cache:', error);
        return false;
    }
}

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

/**
 * Get time ago string for display using dayjs
 */
export function getTimeAgo(timestamp) {
    return dayjs(timestamp).fromNow();
}
