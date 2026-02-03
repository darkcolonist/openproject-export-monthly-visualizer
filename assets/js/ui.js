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
    localStorage.removeItem('lastLoadedFile');

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
    const {
        supabaseModal,
        supabaseUrlInput,
        supabaseKeyInput,
        settingsMenu,
        supabaseDateFilterBtn,
        testSupabaseConnectionBtn,
        supabaseConfigAdvanced,
        saveSupabaseBtn
    } = App.elements;

    if (settingsMenu) settingsMenu.classList.add('hidden');

    if (supabaseModal) {
        supabaseModal.classList.remove('hidden');

        // Fill existing config
        if (App.supabase.config.url) supabaseUrlInput.value = App.supabase.config.url;
        if (App.supabase.config.key) supabaseKeyInput.value = App.supabase.config.key;

        // Reset visibility/state if not already connected
        const isAlreadyConnected = !!(App.supabase.config.url && App.supabase.config.key);
        if (!isAlreadyConnected) {
            if (supabaseConfigAdvanced) supabaseConfigAdvanced.classList.add('hidden');
            if (saveSupabaseBtn) saveSupabaseBtn.disabled = true;
            if (testSupabaseConnectionBtn) {
                testSupabaseConnectionBtn.innerHTML = '<i class="ph ph-plugs"></i> Connect';
                testSupabaseConnectionBtn.classList.remove('bg-green-500/20', 'text-green-400', 'border-green-500/30');
                testSupabaseConnectionBtn.classList.add('bg-slate-800', 'text-blue-400', 'border-slate-700');
            }
        } else {
            // If already has config, show advanced
            if (supabaseConfigAdvanced) supabaseConfigAdvanced.classList.remove('hidden');
            if (saveSupabaseBtn) saveSupabaseBtn.disabled = false;
            if (testSupabaseConnectionBtn) {
                testSupabaseConnectionBtn.innerHTML = '<i class="ph ph-check-circle"></i> Connected';
                testSupabaseConnectionBtn.classList.add('bg-green-500/20', 'text-green-400', 'border-green-500/30');
                testSupabaseConnectionBtn.classList.remove('bg-slate-800', 'text-blue-400', 'border-slate-700');
            }
        }

        // Add listeners for URL/Key changes
        if (supabaseUrlInput && !supabaseUrlInput.hasListener) {
            supabaseUrlInput.addEventListener('input', App.updateSupabaseConnectButtonState);
            supabaseUrlInput.hasListener = true;
        }
        if (supabaseKeyInput && !supabaseKeyInput.hasListener) {
            supabaseKeyInput.addEventListener('input', App.updateSupabaseConnectButtonState);
            supabaseKeyInput.hasListener = true;
        }

        // Add listener for Connect button
        if (testSupabaseConnectionBtn && !testSupabaseConnectionBtn.hasListener) {
            testSupabaseConnectionBtn.addEventListener('click', App.refreshSupabaseCount);
            testSupabaseConnectionBtn.hasListener = true;
        }

        // Hide warning by default
        if (App.elements.supabaseWarning) App.elements.supabaseWarning.classList.add('hidden');

        // Setup individual button listener
        if (supabaseDateFilterBtn && !supabaseDateFilterBtn.hasListener) {
            supabaseDateFilterBtn.addEventListener('click', App.toggleSupabaseDatePicker);
            supabaseDateFilterBtn.hasListener = true;
        }

        App.updateSupabaseConnectButtonState();
        App.updateSupabaseDateRangeDisplay();
    }
};

App.updateSupabaseConnectButtonState = function () {
    const { supabaseUrlInput, supabaseKeyInput, testSupabaseConnectionBtn, supabaseConfigAdvanced, saveSupabaseBtn } = App.elements;
    if (!supabaseUrlInput || !supabaseKeyInput || !testSupabaseConnectionBtn) return;

    const hasValues = supabaseUrlInput.value.trim() !== '' && supabaseKeyInput.value.trim() !== '';
    testSupabaseConnectionBtn.disabled = !hasValues;

    // If user changes inputs, we should probably hide advanced section again and reset button text
    // but only if the values actually changed from what's currently "connected"
    const currentUrl = App.supabase.config.url || '';
    const currentKey = App.supabase.config.key || '';

    if (supabaseUrlInput.value.trim() !== currentUrl || supabaseKeyInput.value.trim() !== currentKey) {
        testSupabaseConnectionBtn.innerHTML = '<i class="ph ph-plugs"></i> Connect';
        testSupabaseConnectionBtn.classList.remove('bg-green-500/20', 'text-green-400', 'border-green-500/30');
        testSupabaseConnectionBtn.classList.add('bg-slate-800', 'text-blue-400', 'border-slate-700');

        if (supabaseConfigAdvanced) supabaseConfigAdvanced.classList.add('hidden');
        if (saveSupabaseBtn) saveSupabaseBtn.disabled = true;
    } else if (currentUrl && currentKey) {
        // Matches current valid config
        testSupabaseConnectionBtn.innerHTML = '<i class="ph ph-check-circle"></i> Connected';
        testSupabaseConnectionBtn.classList.add('bg-green-500/20', 'text-green-400', 'border-green-500/30');
        testSupabaseConnectionBtn.classList.remove('bg-slate-800', 'text-blue-400', 'border-slate-700');

        if (supabaseConfigAdvanced) supabaseConfigAdvanced.classList.remove('hidden');
        if (saveSupabaseBtn) saveSupabaseBtn.disabled = false;
    }
};

App.hideSupabaseModal = function () {
    const { supabaseModal, supabaseDatePickerInline } = App.elements;
    if (supabaseModal) supabaseModal.classList.add('hidden');
    if (supabaseDatePickerInline) supabaseDatePickerInline.classList.add('hidden');
};

App.toggleSupabaseDatePicker = function () {
    const { supabaseDatePickerInline } = App.elements;
    if (!supabaseDatePickerInline) return;

    const isHidden = supabaseDatePickerInline.classList.contains('hidden');
    if (isHidden) {
        supabaseDatePickerInline.classList.remove('hidden');
        App.initSupabaseDatePicker();
    } else {
        supabaseDatePickerInline.classList.add('hidden');
    }
};

App.initSupabaseDatePicker = function () {
    if (App.supabaseDatePicker) return;

    const container = document.getElementById('supabase-air-datepicker');
    if (!container) return;

    App.supabaseDatePicker = new AirDatepicker('#supabase-air-datepicker', {
        locale: App.utils.enLocale,
        view: 'months',
        minView: 'months',
        dateFormat: 'MMMM yyyy',
        range: true,
        multipleDatesSeparator: ' - ',
        selectedDates: (App.supabase.config.startDate && App.supabase.config.endDate) ? [
            new Date(App.supabase.config.startDate + '-01'),
            new Date(App.supabase.config.endDate + '-01')
        ] : [],
        onSelect({ date }) {
            const dates = Array.isArray(date) ? date : (date ? [date] : []);
            if (dates.length >= 1) {
                const sorted = [...dates].sort((a, b) => a - b);
                const formatDate = (d) => {
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    return `${y}-${m}`;
                };

                App.supabase.config.startDate = formatDate(sorted[0]);
                App.supabase.config.endDate = formatDate(sorted[dates.length - 1]);
            } else {
                App.supabase.config.startDate = null;
                App.supabase.config.endDate = null;
            }
            App.updateSupabaseDateRangeDisplay();
        }
    });
};

App.updateSupabaseDateRangeDisplay = function () {
    const { supabaseDateRangeText } = App.elements;
    if (!supabaseDateRangeText) return;

    const { startDate, endDate } = App.supabase.config;
    if (!startDate || !endDate) {
        supabaseDateRangeText.textContent = 'Last 3 Months (Default)';
        supabaseDateRangeText.classList.remove('text-blue-400');
        supabaseDateRangeText.classList.add('text-slate-400');
    } else {
        const format = (key) => {
            const [y, m] = key.split('-');
            return new Date(y, m - 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
        };
        supabaseDateRangeText.textContent = `${format(startDate)} - ${format(endDate)}`;
        supabaseDateRangeText.classList.add('text-blue-400');
        supabaseDateRangeText.classList.remove('text-slate-400');
    }

    App.refreshSupabaseCount();
};

App.refreshSupabaseCount = async function () {
    const {
        supabaseRowCount,
        supabaseCountValue,
        supabaseUrlInput,
        supabaseKeyInput,
        supabaseRowLimitText,
        testSupabaseConnectionBtn,
        supabaseConfigAdvanced,
        saveSupabaseBtn
    } = App.elements;

    if (!supabaseUrlInput || !supabaseKeyInput) return;

    const url = supabaseUrlInput.value.trim();
    const key = supabaseKeyInput.value.trim();

    if (!url || !key) return;

    // Update button state to show connecting
    if (testSupabaseConnectionBtn) {
        testSupabaseConnectionBtn.disabled = true;
        testSupabaseConnectionBtn.innerHTML = '<i class="ph ph-circle-notch animate-spin"></i> Connecting...';
    }

    try {
        const oldUrl = App.supabase.config.url;
        const oldKey = App.supabase.config.key;

        try {
            // Temporarily sync inputs to config for count fetch
            App.supabase.config.url = url;
            App.supabase.config.key = key;

            const count = await App.supabase.fetchDataCount();

            // If we reach here, connection likely succeeded
            if (testSupabaseConnectionBtn) {
                testSupabaseConnectionBtn.disabled = false;
                testSupabaseConnectionBtn.innerHTML = '<i class="ph ph-check-circle"></i> Connected';
                testSupabaseConnectionBtn.classList.add('bg-green-500/20', 'text-green-400', 'border-green-500/30');
                testSupabaseConnectionBtn.classList.remove('bg-slate-800', 'text-blue-400', 'border-slate-700', 'bg-red-500/10', 'text-red-400', 'border-red-500/20');
            }

            // Show advanced section and enable save
            if (supabaseConfigAdvanced) supabaseConfigAdvanced.classList.remove('hidden');
            if (saveSupabaseBtn) saveSupabaseBtn.disabled = false;

            // Update count display
            if (supabaseRowCount && supabaseCountValue) {
                supabaseRowCount.classList.remove('hidden');
                supabaseCountValue.textContent = `${count.toLocaleString()} rows`;
                supabaseCountValue.classList.remove('text-slate-500');

                const label = supabaseRowCount.querySelector('span:first-child');

                if (count >= 1000) {
                    supabaseCountValue.classList.add('text-red-400');
                    supabaseCountValue.classList.remove('text-green-400', 'text-slate-300');
                    if (label) {
                        label.classList.add('text-red-400');
                        label.classList.remove('text-slate-500', 'text-green-400');
                    }

                    if (supabaseRowLimitText) {
                        supabaseRowLimitText.parentElement.classList.add('text-red-400');
                        supabaseRowLimitText.parentElement.classList.remove('text-blue-400');
                        const tooltipHeader = supabaseRowLimitText.parentElement.querySelector('p:first-child');
                        if (tooltipHeader) {
                            tooltipHeader.classList.add('text-red-400');
                            tooltipHeader.classList.remove('text-blue-400');
                        }
                    }

                    if (App.elements.supabaseWarning) {
                        App.elements.supabaseWarning.classList.remove('hidden');
                        const warningText = App.elements.supabaseWarning.querySelector('p');
                        if (warningText) {
                            warningText.textContent = `Warning: Found ${count.toLocaleString()} rows. Only 1,000 rows will be fetched, and some data will be omitted. Consider narrowing your date range.`;
                        }
                    }
                } else {
                    supabaseCountValue.classList.add('text-green-400');
                    supabaseCountValue.classList.remove('text-red-400', 'text-slate-300');
                    if (label) {
                        label.classList.add('text-green-400');
                        label.classList.remove('text-slate-500', 'text-red-400');
                    }

                    if (supabaseRowLimitText) {
                        supabaseRowLimitText.parentElement.classList.remove('text-red-400');
                        supabaseRowLimitText.parentElement.classList.add('text-blue-400');
                        const tooltipHeader = supabaseRowLimitText.parentElement.querySelector('p:first-child');
                        if (tooltipHeader) {
                            tooltipHeader.classList.remove('text-red-400');
                            tooltipHeader.classList.add('text-blue-400');
                        }
                    }

                    if (App.elements.supabaseWarning) App.elements.supabaseWarning.classList.add('hidden');
                }
            }

            // Config remains updated to new valid values
            App.supabase.config.url = url;
            App.supabase.config.key = key;

        } catch (err) {
            // Restore old config on failure
            App.supabase.config.url = oldUrl;
            App.supabase.config.key = oldKey;

            if (testSupabaseConnectionBtn) {
                testSupabaseConnectionBtn.disabled = false;
                testSupabaseConnectionBtn.innerHTML = '<i class="ph ph-warning-circle"></i> Connection Failed';
                testSupabaseConnectionBtn.classList.add('bg-red-500/10', 'text-red-400', 'border-red-500/20');
                testSupabaseConnectionBtn.classList.remove('bg-slate-800', 'text-blue-400', 'border-slate-700', 'bg-green-500/20', 'text-green-400', 'border-green-500/30');
            }
            if (supabaseCountValue) {
                supabaseCountValue.textContent = 'Error';
                supabaseCountValue.classList.add('text-red-400');
            }
            console.error('Connection test failed:', err);
        }
    } catch (err) {
        // This outer catch block would only be hit if there's an error before the inner try-catch,
        // e.g., if oldUrl/oldKey access fails, which is unlikely.
        // The primary error handling is now in the inner catch.
        console.error('Unexpected error in refreshSupabaseCount:', err);
    }
};

App.clearSupabaseDateRange = function () {
    App.supabase.config.startDate = null;
    App.supabase.config.endDate = null;
    if (App.supabaseDatePicker) {
        App.supabaseDatePicker.clear();
    }
    App.updateSupabaseDateRangeDisplay();
};

App.updateSupabaseStatus = function (isConnected) {
    const { supabaseStatus, connectSupabaseBtn, disconnectSupabaseBtn, syncSupabaseBtn } = App.elements;

    // Find the text label inside the connect/disconnect buttons if needed
    const connectLabel = connectSupabaseBtn ? connectSupabaseBtn.querySelector('span') : null;

    if (isConnected) {
        if (supabaseStatus) {
            supabaseStatus.classList.remove('hidden');
            supabaseStatus.classList.add('flex');
        }
        if (connectSupabaseBtn) {
            connectSupabaseBtn.classList.remove('hidden');
            if (connectLabel) connectLabel.textContent = 'Configure Supabase';
        }
        if (disconnectSupabaseBtn) disconnectSupabaseBtn.classList.remove('hidden');
        if (syncSupabaseBtn) syncSupabaseBtn.classList.remove('hidden');
    } else {
        if (supabaseStatus) {
            supabaseStatus.classList.add('hidden');
            supabaseStatus.classList.remove('flex');
        }
        if (connectSupabaseBtn) {
            connectSupabaseBtn.classList.remove('hidden');
            if (connectLabel) connectLabel.textContent = 'Connect Supabase';
        }
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

