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
};

document.addEventListener('DOMContentLoaded', () => {
    App.cacheDom();
    App.bindEvents();

    App.initializeDatabase((success) => {
        if (success) {
            App.checkUrlParameter();
            setTimeout(App.displayCachedFilesList, 100);
        }
    });
});

window.toggleChart = App.toggleChart;
window.downloadChart = App.downloadChart;
window.scrollToSection = App.scrollToSection;
window.copyBookmarkUrl = App.copyBookmarkUrl;
