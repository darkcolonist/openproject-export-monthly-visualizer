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
    if (App.elements.toggleChartBtn) {
        App.elements.toggleChartBtn.classList.add('hidden');
    }
    if (App.elements.chartSection) {
        App.elements.chartSection.classList.remove('collapsed');
    }
    if (App.elements.headerDateFilter) {
        App.elements.headerDateFilter.classList.add('hidden');
        App.elements.headerDateFilter.classList.add('opacity-0');
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
    if (App.elements.projectLegend) App.elements.projectLegend.innerHTML = '';
    if (App.elements.developerLegend) App.elements.developerLegend.innerHTML = '';

    if (App.state.developerChartInstance) {
        App.state.developerChartInstance.destroy();
        App.state.developerChartInstance = null;
    }
    if (App.elements.insightPlaceholder) {
        App.elements.insightPlaceholder.style.display = 'flex';
    }

    if (fileInput) fileInput.value = '';

    if (App.elements.settingsMenu) {
        App.elements.settingsMenu.classList.add('hidden');
    }

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

App.showErrorModal = function showErrorModal(title, message) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]';

    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'bg-slate-900 rounded-xl border border-slate-700 p-6 max-w-md mx-4 shadow-2xl';

    // Create title
    const titleEl = document.createElement('h3');
    titleEl.className = 'text-xl font-bold text-red-400 mb-4 text-center flex items-center justify-center gap-2';
    titleEl.innerHTML = `<i class="ph ph-warning-circle text-2xl"></i> ${title}`;

    // Create modal content
    const messageEl = document.createElement('p');
    messageEl.className = 'text-slate-300 mb-6 text-center leading-relaxed';
    messageEl.textContent = message;

    // Create buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'flex gap-3 justify-center';

    // OK button
    const okBtn = document.createElement('button');
    okBtn.className = 'px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium';
    okBtn.textContent = 'OK';
    okBtn.onclick = () => {
        document.body.removeChild(overlay);
    };

    // Assemble modal
    buttonsContainer.appendChild(okBtn);
    modal.appendChild(titleEl);
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

    // Close on Escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
};

App.populateInsightControls = function populateInsightControls(usersList, detailedMap) {
    const { insightDevSelect, insightProjSelect } = App.elements;
    if (!insightDevSelect || !insightProjSelect) return;

    // Reset controls
    insightDevSelect.innerHTML = '<option value="">Select a Developer...</option>';
    insightProjSelect.innerHTML = '<option value="all">All Projects</option>';
    insightProjSelect.disabled = true;

    // Populate Developers with Total Hours
    usersList.forEach(user => {
        const devData = detailedMap[user] || {};
        let totalVal = 0;
        Object.values(devData).forEach(projObj => {
            Object.values(projObj).forEach(h => totalVal += h);
        });

        const opt = document.createElement('option');
        opt.value = user;
        opt.textContent = `${user} (${totalVal.toFixed(1)} h)`;
        insightDevSelect.appendChild(opt);
    });

    // Event Listeners
    // Remove old listeners to avoid duplicates if re-populated
    const newDevSelect = insightDevSelect.cloneNode(true);
    insightDevSelect.parentNode.replaceChild(newDevSelect, insightDevSelect);
    App.elements.insightDevSelect = newDevSelect;

    const newProjSelect = insightProjSelect.cloneNode(true);
    insightProjSelect.parentNode.replaceChild(newProjSelect, insightProjSelect);
    App.elements.insightProjSelect = newProjSelect;

    // Re-attach listeners
    App.elements.insightDevSelect.addEventListener('change', (e) => {
        const selectedDev = e.target.value;

        // Update Project Select
        const projSelect = App.elements.insightProjSelect;
        projSelect.innerHTML = '<option value="all">All Projects</option>';

        if (selectedDev && detailedMap[selectedDev]) {
            projSelect.disabled = false;
            const projects = Object.keys(detailedMap[selectedDev]).sort();
            projects.forEach(proj => {
                const projectData = detailedMap[selectedDev][proj];
                const projectTotal = Object.values(projectData).reduce((a, b) => a + b, 0);

                const opt = document.createElement('option');
                opt.value = proj;
                opt.textContent = `${proj} (${projectTotal.toFixed(1)} h)`;
                projSelect.appendChild(opt);
            });
        } else {
            projSelect.disabled = true;
        }

        // Render Chart
        App.renderDeveloperChart(selectedDev, 'all', detailedMap);
    });

    App.elements.insightProjSelect.addEventListener('change', (e) => {
        const selectedDev = App.elements.insightDevSelect.value;
        const selectedProj = e.target.value;
        App.renderDeveloperChart(selectedDev, selectedProj, detailedMap);
    });
};

// Supabase & Settings UI
App.showSupabaseModal = function () {
    const { supabaseModal, supabaseUrlInput, supabaseKeyInput, settingsMenu } = App.elements;
    if (settingsMenu) settingsMenu.classList.add('hidden');
    if (supabaseModal) {
        supabaseModal.classList.remove('hidden');
        if (App.supabase.config.url) supabaseUrlInput.value = App.supabase.config.url;
        if (App.supabase.config.key) supabaseKeyInput.value = App.supabase.config.key;
    }
};

App.hideSupabaseModal = function () {
    const { supabaseModal } = App.elements;
    if (supabaseModal) supabaseModal.classList.add('hidden');
};

App.updateSupabaseStatus = function (isConnected) {
    const { supabaseStatus, connectSupabaseBtn, disconnectSupabaseBtn, syncSupabaseBtn } = App.elements;

    if (isConnected) {
        if (supabaseStatus) supabaseStatus.classList.remove('hidden');
        if (supabaseStatus) supabaseStatus.classList.add('flex');
        if (connectSupabaseBtn) connectSupabaseBtn.classList.add('hidden');
        if (disconnectSupabaseBtn) disconnectSupabaseBtn.classList.remove('hidden');
        if (syncSupabaseBtn) syncSupabaseBtn.classList.remove('hidden');
    } else {
        if (supabaseStatus) supabaseStatus.classList.add('hidden');
        if (supabaseStatus) supabaseStatus.classList.remove('flex');
        if (connectSupabaseBtn) connectSupabaseBtn.classList.remove('hidden');
        if (disconnectSupabaseBtn) disconnectSupabaseBtn.classList.add('hidden');
        if (syncSupabaseBtn) syncSupabaseBtn.classList.add('hidden');
    }
};

App.showLoading = function (text = 'Processing...') {
    const { loadingOverlay, loadingText } = App.elements;
    if (loadingOverlay && loadingText) {
        loadingText.textContent = text;
        loadingOverlay.classList.remove('hidden');
    }
};

App.hideLoading = function () {
    const { loadingOverlay } = App.elements;
    if (loadingOverlay) loadingOverlay.classList.add('hidden');
};

App.toggleSettingsMenu = function () {
    const { settingsMenu } = App.elements;
    if (settingsMenu) {
        settingsMenu.classList.toggle('hidden');
    }
};
