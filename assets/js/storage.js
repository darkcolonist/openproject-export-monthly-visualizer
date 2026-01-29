window.App = window.App || {};

App.checkUrlParameter = function checkUrlParameter() {
    const urlParams = new URLSearchParams(window.location.search);
    const uploadParam = urlParams.get('upload');
    const { dropZone } = App.elements;

    if (uploadParam && dropZone) {
        localStorage.setItem('requestedFilePath', uploadParam);
        const filename = uploadParam.split(/[\\/]/).pop();
        const dropZoneText = dropZone.querySelector('p:last-child');
        if (dropZoneText) {
            dropZoneText.innerHTML = `<span class="text-blue-400 font-semibold">Looking for: ${filename}</span><br><span class="text-xs">Click to select this file</span>`;
        }
        App.loadCachedFile(filename);
    }
};

App.cacheFile = function cacheFile(file, data) {
    try {
        const dbRequest = indexedDB.open('FileCache', 1);

        dbRequest.onupgradeneeded = function(event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('files')) {
                db.createObjectStore('files', { keyPath: 'name' });
            }
        };

        dbRequest.onsuccess = function(event) {
            const db = event.target.result;
            const transaction = db.transaction(['files'], 'readwrite');
            const store = transaction.objectStore('files');

            store.put({
                name: file.name,
                data: data,
                timestamp: Date.now()
            });
        };
    } catch (e) {
        console.log('Could not cache file:', e);
    }
};

App.loadCachedFile = function loadCachedFile(filename) {
    try {
        const dbRequest = indexedDB.open('FileCache', 1);

        dbRequest.onsuccess = function(event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('files')) return;

            const transaction = db.transaction(['files'], 'readonly');
            const store = transaction.objectStore('files');
            const getRequest = store.get(filename);

            getRequest.onsuccess = function() {
                if (getRequest.result) {
                    const cachedFile = getRequest.result;
                    const age = Date.now() - cachedFile.timestamp;

                    if (age < 3600000) {
                        console.log('Loading cached file:', filename);
                        const blob = new Blob([cachedFile.data]);
                        const file = new File([blob], filename);
                        App.handleFile(file);
                    }
                }
            };
        };
    } catch (e) {
        console.log('Could not load cached file:', e);
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
    const bookmarkUrl = `${baseUrl}?upload="${encodeURIComponent(filename)}"`;

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

App.getReloadButton = function getReloadButton() {
    const lastFile = localStorage.getItem('lastLoadedFile');
    const lastTime = localStorage.getItem('lastLoadedTime');
    const { dropZone } = App.elements;

    if (lastFile && lastTime && dropZone) {
        const age = Date.now() - parseInt(lastTime, 10);
        if (age < 86400000) {
            const hint = document.createElement('div');
            hint.className = 'mt-4 text-center';
            hint.innerHTML = `
                <button onclick="reloadLastFile()" class="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-2 mx-auto">
                    <i class="ph ph-clock-counter-clockwise"></i>
                    <span>Reload: ${lastFile}</span>
                </button>
            `;
            dropZone.parentElement.appendChild(hint);
        }
    }
};

App.reloadLastFile = function reloadLastFile() {
    const lastFile = localStorage.getItem('lastLoadedFile');
    if (lastFile) {
        App.loadCachedFile(lastFile);
    }
};
