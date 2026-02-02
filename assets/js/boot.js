window.App = window.App || {};

App.bindEvents = function bindEvents() {
    const { dropZone, fileInput, applyFilterBtn, clearFilterBtn } = App.elements;

    if (dropZone && fileInput) {
        dropZone.addEventListener('click', () => fileInput.click());

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-active');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-active');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-active');
            if (e.dataTransfer.files.length) App.handleFile(e.dataTransfer.files[0]);
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) App.handleFile(e.target.files[0]);
        });
    }

    if (App.elements.dateFilterTrigger) {
        App.elements.dateFilterTrigger.addEventListener('click', () => App.showDateFilterModal());
    }

    if (App.elements.settingsBtn) {
        App.elements.settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            App.toggleSettingsMenu();
        });
    }

    // Close settings on outside click
    document.addEventListener('click', (e) => {
        if (App.elements.settingsMenu && !App.elements.settingsMenu.contains(e.target) && e.target !== App.elements.settingsBtn) {
            App.elements.settingsMenu.classList.add('hidden');
        }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    App.cacheDom();
    App.bindEvents();
    App.initializeChartScrollPassthrough();

    App.initializeDatabase((success) => {
        if (success) {
            // Priority 1: URL Parameter (Deep Link)
            App.checkUrlParameter();

            // Priority 2: Supabase Connection (if configured and data exists)
            if (App.loadSupabaseConfig()) {
                App.checkAndLoadSupabaseCache((loaded) => {
                    if (!loaded) {
                        // Priority 3: Cached XLS Files List
                        setTimeout(App.displayCachedFilesList, 100);
                    }
                });
            } else {
                // Priority 3: Cached XLS Files List
                setTimeout(App.displayCachedFilesList, 100);
            }
        }
    });
});

window.toggleChart = App.toggleChart;
window.downloadChart = App.downloadChart;
window.scrollToSection = App.scrollToSection;
window.copyBookmarkUrl = App.copyBookmarkUrl;
