window.App = window.App || {};

App.clearCache = function clearCache() {
    App.showConfirm('Are you sure you want to clear all cached files? This cannot be undone.', () => {
        try {
            const deleteRequest = indexedDB.deleteDatabase('FileCache');

            deleteRequest.onsuccess = function () {
                // Reinitialize the database
                App.initializeDatabase((success) => {
                    if (success) {
                        // Refresh the display
                        App.displayCachedFilesList();
                    }
                });
            };

            deleteRequest.onerror = function (e) {
                console.error('Error clearing cache:', e);
                alert('Failed to clear cache. Please try again.');
            };

            deleteRequest.onblocked = function () {
                alert('Cannot clear cache. Please close all other tabs with this app open and try again.');
            };
        } catch (e) {
            console.error('Error clearing cache:', e);
            alert('Failed to clear cache. Please try again.');
        }
    });
};

App.initializeDatabase = function initializeDatabase(callback) {
    const testRequest = indexedDB.open('FileCache', 4);

    testRequest.onupgradeneeded = function (event) {
        const db = event.target.result;

        if (db.objectStoreNames.contains('files')) {
            db.deleteObjectStore('files');
        }

        const store = db.createObjectStore('files', { keyPath: 'name' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
    };

    testRequest.onsuccess = function (event) {
        const db = event.target.result;

        if (db.objectStoreNames.contains('files')) {
            db.close();
            if (callback) callback(true);
        } else {
            db.close();
            if (callback) callback(false);
        }
    };

    testRequest.onerror = function (e) {
        console.error('Database error:', e);
        if (callback) callback(false);
    };

    testRequest.onblocked = function () {
        if (callback) callback(false);
    };
};

App.checkUrlParameter = function checkUrlParameter() {
    const urlParams = new URLSearchParams(window.location.search);
    const uploadParam = urlParams.get('upload');
    const { dropZone } = App.elements;

    if (uploadParam && dropZone) {
        localStorage.setItem('requestedFilePath', uploadParam);
        const filename = uploadParam.split(/[\\/]/).pop();

        // Check if file exists in cache before showing "Looking for" message
        App.checkCachedFileExists(filename, (exists) => {
            const dropZoneText = dropZone.querySelector('p:last-child');
            if (dropZoneText) {
                if (exists) {
                    dropZoneText.innerHTML = `<span class="text-blue-400 font-semibold">Looking for: ${filename}</span><br><span class="text-xs">Click to select this file</span>`;
                } else {
                    dropZoneText.innerHTML = `<span class="text-red-400 font-semibold">The cached data doesn't exist, please upload a new file to continue</span>`;
                }
            }
        });

        App.loadCachedFile(filename);
    }
};

App.cacheFile = function cacheFile(file, data, rowCount = 0) {
    try {
        const dbRequest = indexedDB.open('FileCache', 4);

        dbRequest.onupgradeneeded = function (event) {
            const db = event.target.result;

            if (db.objectStoreNames.contains('files')) {
                db.deleteObjectStore('files');
            }

            const store = db.createObjectStore('files', { keyPath: 'name' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
        };

        dbRequest.onsuccess = function (event) {
            const db = event.target.result;

            if (!db.objectStoreNames.contains('files')) {
                console.error('Database initialization failed');
                return;
            }

            const transaction = db.transaction(['files'], 'readwrite');
            const store = transaction.objectStore('files');

            const fileData = {
                name: file.name,
                data: data,
                timestamp: Date.now(),
                rowCount: rowCount
            };

            store.put(fileData);

            transaction.oncomplete = function () {
                setTimeout(() => {
                    const cleanupTransaction = db.transaction(['files'], 'readwrite');
                    const cleanupStore = cleanupTransaction.objectStore('files');
                    const getAllRequest = cleanupStore.getAll();

                    getAllRequest.onsuccess = function () {
                        const files = getAllRequest.result;

                        if (files.length > 5) {
                            files.sort((a, b) => a.timestamp - b.timestamp);

                            const filesToRemove = files.slice(0, files.length - 5);
                            const deleteTransaction = db.transaction(['files'], 'readwrite');
                            const deleteStore = deleteTransaction.objectStore('files');

                            filesToRemove.forEach(oldFile => {
                                deleteStore.delete(oldFile.name);
                            });
                        }

                        setTimeout(() => {
                            App.displayCachedFilesList();
                        }, 200);
                    };
                }, 100);
            };
        };

        dbRequest.onerror = function (e) {
            console.error('Database error:', e);
        };
    } catch (e) {
        console.error('Error caching file:', e);
    }
};

App.checkCachedFileExists = function checkCachedFileExists(filename, callback) {
    try {
        const dbRequest = indexedDB.open('FileCache', 4);

        dbRequest.onsuccess = function (event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('files')) {
                callback(false);
                return;
            }

            const transaction = db.transaction(['files'], 'readonly');
            const store = transaction.objectStore('files');
            const getRequest = store.get(filename);

            getRequest.onsuccess = function () {
                if (getRequest.result) {
                    const cachedFile = getRequest.result;
                    const age = Date.now() - cachedFile.timestamp;
                    // Check if file exists and is not expired (24 hours)
                    callback(age < 86400000);
                } else {
                    callback(false);
                }
            };

            getRequest.onerror = function () {
                callback(false);
            };
        };

        dbRequest.onerror = function () {
            callback(false);
        };
    } catch (e) {
        console.log('Could not check cached file:', e);
        callback(false);
    }
};

App.loadCachedFile = function loadCachedFile(filename) {
    try {
        const dbRequest = indexedDB.open('FileCache', 4);

        dbRequest.onsuccess = function (event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('files')) return;

            const transaction = db.transaction(['files'], 'readonly');
            const store = transaction.objectStore('files');
            const getRequest = store.get(filename);

            getRequest.onsuccess = function () {
                if (getRequest.result) {
                    const cachedFile = getRequest.result;
                    const age = Date.now() - cachedFile.timestamp;

                    if (age < 86400000) {
                        const blob = new Blob([cachedFile.data]);
                        const file = new File([blob], filename);
                        App.handleFile(file, true);
                    }
                }
            };
        };
    } catch (e) {
        console.error('Error loading cached file:', e);
    }
};

App.getAllCachedFiles = function getAllCachedFiles(callback) {
    try {
        const dbRequest = indexedDB.open('FileCache', 4);

        dbRequest.onupgradeneeded = function (event) {
            const db = event.target.result;

            if (db.objectStoreNames.contains('files')) {
                db.deleteObjectStore('files');
            }

            const store = db.createObjectStore('files', { keyPath: 'name' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
        };

        dbRequest.onsuccess = function (event) {
            const db = event.target.result;

            if (!db.objectStoreNames.contains('files')) {
                callback([]);
                return;
            }

            const transaction = db.transaction(['files'], 'readonly');
            const store = transaction.objectStore('files');
            const getAllRequest = store.getAll();

            getAllRequest.onsuccess = function () {
                const files = getAllRequest.result || [];

                const validFiles = files
                    .filter(file => (Date.now() - file.timestamp) < 86400000)
                    .sort((a, b) => b.timestamp - a.timestamp);

                callback(validFiles);
            };

            getAllRequest.onerror = function () {
                callback([]);
            };
        };

        dbRequest.onerror = function () {
            callback([]);
        };
    } catch (e) {
        console.error('Error getting cached files:', e);
        callback([]);
    }
};

App.generateBookmarkUrl = function generateBookmarkUrl(filename) {
    localStorage.setItem('lastLoadedFile', filename);
    localStorage.setItem('lastLoadedTime', Date.now());

    const newUrl = `${window.location.pathname}?upload=${encodeURIComponent(filename)}`;
    window.history.replaceState({ file: filename }, '', newUrl);
    console.log(`URL updated: ${newUrl}`);
};

App.copyBookmarkUrl = function copyBookmarkUrl() {
    const filename = localStorage.getItem('lastLoadedFile');
    if (!filename) {
        alert('No file loaded yet');
        return;
    }

    const baseUrl = window.location.origin + window.location.pathname;
    const bookmarkUrl = `${baseUrl}?upload=${encodeURIComponent(filename)}`;

    navigator.clipboard.writeText(bookmarkUrl).then(() => {
        const btn = App.elements.copyBookmarkBtn;
        if (!btn) return;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="ph ph-check"></i> Copied!';
        btn.classList.add('text-green-400');

        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.classList.remove('text-green-400');
        }, 2000);
    }).catch(() => {
        prompt('Copy this URL:', bookmarkUrl);
    });
};

App.displayCachedFilesList = function displayCachedFilesList() {
    const { dropZone } = App.elements;

    if (!dropZone) return;

    const existingList = document.getElementById('cached-files-list');
    if (existingList) {
        existingList.remove();
    }

    App.getAllCachedFiles((files) => {
        if (files.length > 0) {
            const listContainer = document.createElement('div');
            listContainer.id = 'cached-files-list';
            listContainer.className = 'mt-6';

            const titleContainer = document.createElement('div');
            titleContainer.className = 'flex items-center justify-center gap-3 mb-3';

            const title = document.createElement('h3');
            title.className = 'text-sm font-semibold text-slate-300';
            title.textContent = 'Recently Uploaded Files';

            const clearButton = document.createElement('button');
            clearButton.className = 'text-red-400 hover:text-red-300 transition-colors flex items-center gap-1';
            clearButton.title = 'Clear cache';
            clearButton.innerHTML = '<i class="ph ph-trash text-sm"></i>';
            clearButton.onclick = App.clearCache;

            titleContainer.appendChild(title);
            titleContainer.appendChild(clearButton);
            listContainer.appendChild(titleContainer);

            const listWrapper = document.createElement('div');
            listWrapper.className = 'space-y-2';

            files.forEach((fileData) => {
                const fileButton = document.createElement('button');
                fileButton.onclick = () => App.loadCachedFile(fileData.name);
                fileButton.className = 'w-full text-left text-sm text-slate-300 hover:text-blue-400 hover:bg-slate-800 px-4 py-2.5 rounded-lg border border-slate-700 hover:border-blue-500 transition-all flex items-center justify-between group';

                const leftSection = document.createElement('div');
                leftSection.className = 'flex items-center gap-3 flex-1 min-w-0';

                const icon = document.createElement('i');
                icon.className = 'ph ph-file-xls text-green-400 text-lg flex-shrink-0';

                const fileInfo = document.createElement('div');
                fileInfo.className = 'flex-1 min-w-0';

                const fileName = document.createElement('div');
                fileName.className = 'font-medium truncate';
                fileName.textContent = fileData.name;

                const fileStats = document.createElement('div');
                fileStats.className = 'text-xs text-slate-500 mt-0.5';
                const rowText = fileData.rowCount ? `${fileData.rowCount} rows` : 'Unknown rows';
                const timeAgo = App.utils.getTimeAgo(fileData.timestamp);
                fileStats.textContent = `${rowText} • ${timeAgo}`;

                fileInfo.appendChild(fileName);
                fileInfo.appendChild(fileStats);

                leftSection.appendChild(icon);
                leftSection.appendChild(fileInfo);

                const loadIcon = document.createElement('i');
                loadIcon.className = 'ph ph-arrow-right text-slate-500 group-hover:text-blue-400 transition-colors flex-shrink-0';

                fileButton.appendChild(leftSection);
                fileButton.appendChild(loadIcon);
                listWrapper.appendChild(fileButton);
            });

            listContainer.appendChild(listWrapper);

            // Find the inner wrapper (direct parent of dropZone)
            const wrapper = dropZone.parentElement;
            wrapper.appendChild(listContainer);
        }
    });
};

App.cacheSupabaseData = function (data) {
    try {
        const dbRequest = indexedDB.open('FileCache', 4);
        dbRequest.onsuccess = function (event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('files')) return;

            const transaction = db.transaction(['files'], 'readwrite');
            const store = transaction.objectStore('files');

            const fileData = {
                name: 'SUPABASE_CACHE',
                data: data, // Store the array directly if possible, or stringify if needed. IndexedDB supports objects.
                timestamp: Date.now(),
                rowCount: data.length,
                isSupabase: true
            };
            store.put(fileData);
        };
    } catch (e) { console.error('Error caching Supabase data:', e); }
};

App.loadSupabaseConfig = function () {
    const config = localStorage.getItem('supabaseConfig');
    if (config) {
        try {
            const parsed = JSON.parse(config);
            App.supabase.config.url = parsed.url;
            App.supabase.config.key = parsed.key;
            return true;
        } catch (e) { return false; }
    }
    return false;
};

App.saveSupabaseConfig = function () {
    const url = App.elements.supabaseUrlInput.value.trim();
    const key = App.elements.supabaseKeyInput.value.trim();

    if (!url || !key) {
        alert('Please enter both URL and Key.');
        return;
    }

    App.supabase.config.url = url;
    App.supabase.config.key = key;

    localStorage.setItem('supabaseConfig', JSON.stringify(App.supabase.config));
    App.hideSupabaseModal();
    App.supabase.sync();
};

App.clearSupabaseConfig = function () {
    localStorage.removeItem('supabaseConfig');
    try {
        const dbRequest = indexedDB.open('FileCache', 4);
        dbRequest.onsuccess = function (event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('files')) return;
            const transaction = db.transaction(['files'], 'readwrite');
            const store = transaction.objectStore('files');
            store.delete('SUPABASE_CACHE');
        };
    } catch (e) { }
};

App.checkAndLoadSupabaseCache = function (callback) {
    try {
        const dbRequest = indexedDB.open('FileCache', 4);
        dbRequest.onsuccess = function (event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('files')) {
                if (callback) callback(false);
                return;
            }

            const transaction = db.transaction(['files'], 'readonly');
            const store = transaction.objectStore('files');
            const getRequest = store.get('SUPABASE_CACHE');

            getRequest.onsuccess = function () {
                if (getRequest.result) {
                    const cachedFile = getRequest.result;
                    const age = Date.now() - cachedFile.timestamp;
                    // Supabase cache expiry: 365 days
                    if (age < (365 * 24 * 60 * 60 * 1000)) {
                        App.state.rawJsonData = cachedFile.data;
                        App.state.fileName = 'Supabase Connection (Cached)';
                        App.state.activeSource = 'supabase';
                        App.processAndRender();
                        App.updateSupabaseStatus(true);
                        if (callback) callback(true);
                    } else {
                        if (callback) callback(false);
                    }
                } else {
                    if (callback) callback(false);
                }
            };
        };
    } catch (e) {
        if (callback) callback(false);
    }
};
