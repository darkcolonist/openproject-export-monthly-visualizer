window.App = window.App || {};

App.bindUploadEvents = function bindUploadEvents() {
    const { dropZone, fileInput } = App.elements;
    if (!dropZone || !fileInput) return;

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
};

document.addEventListener('DOMContentLoaded', () => {
    App.cacheDom();
    App.bindUploadEvents();
    
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
