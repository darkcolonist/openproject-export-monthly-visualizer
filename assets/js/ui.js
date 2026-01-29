window.App = window.App || {};

App.resetToUpload = function resetToUpload() {
    const {
        uploadContainer,
        dashboardContainer,
        dropZone,
        projectTableHeaderRow,
        projectTableBody,
        tableHeaderRow,
        tableBody,
        fileInput
    } = App.elements;

    window.history.replaceState({}, '', window.location.pathname);
    localStorage.removeItem('requestedFilePath');

    if (dashboardContainer) {
        dashboardContainer.classList.add('hidden');
        dashboardContainer.classList.add('opacity-0');
    }
    if (uploadContainer) {
        uploadContainer.style.display = 'block';
    }

    if (dropZone) {
        const dropZoneText = dropZone.querySelector('p:last-child');
        if (dropZoneText) {
            dropZoneText.innerHTML = 'Supports Excel (.xls, .xlsx) & CSV';
        }
    }

    if (App.state.chartInstance) {
        App.state.chartInstance.destroy();
        App.state.chartInstance = null;
    }

    if (projectTableHeaderRow) projectTableHeaderRow.innerHTML = '';
    if (projectTableBody) projectTableBody.innerHTML = '';
    if (tableHeaderRow) tableHeaderRow.innerHTML = '';
    if (tableBody) tableBody.innerHTML = '';

    if (fileInput) fileInput.value = '';
};
