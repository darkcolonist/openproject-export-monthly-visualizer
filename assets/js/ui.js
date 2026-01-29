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
    
    // Refresh the cached files list
    setTimeout(() => {
        if (typeof App.displayCachedFilesList === 'function') {
            App.displayCachedFilesList();
        }
    }, 100);
};

App.showConfirm = function showConfirm(message, onConfirm) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]';
    
    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'bg-slate-900 rounded-xl border border-slate-700 p-6 max-w-md mx-4 shadow-2xl';
    
    // Create modal content
    const messageEl = document.createElement('p');
    messageEl.className = 'text-slate-200 mb-6 text-center';
    messageEl.textContent = message;
    
    // Create buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'flex gap-3 justify-center';
    
    // Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors border border-slate-700';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => {
        document.body.removeChild(overlay);
    };
    
    // Confirm button
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors';
    confirmBtn.textContent = 'Clear Cache';
    confirmBtn.onclick = () => {
        document.body.removeChild(overlay);
        onConfirm();
    };
    
    // Assemble modal
    buttonsContainer.appendChild(cancelBtn);
    buttonsContainer.appendChild(confirmBtn);
    modal.appendChild(messageEl);
    modal.appendChild(buttonsContainer);
    overlay.appendChild(modal);
    
    // Add to body
    document.body.appendChild(overlay);
    
    // Close on overlay click
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    };
};
