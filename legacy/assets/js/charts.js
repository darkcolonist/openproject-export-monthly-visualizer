window.App = window.App || {};

Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = '#334155';

App.renderStackedChart = function renderStackedChart(labels, datasets) {
    const { chartCanvas } = App.elements;
    if (!chartCanvas) return;
    const ctx = chartCanvas.getContext('2d');

    if (App.state.chartInstance) App.state.chartInstance.destroy();

    App.state.chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    grid: { display: false },
                    ticks: {
                        font: { family: "'Inter', sans-serif", size: 11 },
                        color: '#94a3b8'
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    grid: { color: '#1e293b' },
                    ticks: { color: '#94a3b8' },
                    title: { display: true, text: 'Total Hours', color: '#64748b' }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderWidth: 1,
                    titleColor: '#f1f5f9',
                    bodyColor: '#cbd5e1',
                    padding: 10,
                    filter: function (tooltipItem) {
                        return tooltipItem.raw > 0;
                    },
                    callbacks: {
                        footer: (tooltipItems) => {
                            let sum = 0;
                            tooltipItems.forEach(function (tooltipItem) {
                                sum += tooltipItem.parsed.y;
                            });
                            return 'Total: ' + sum.toFixed(2) + ' h';
                        }
                    }
                }
            },
            layout: { padding: 0 }
        }
    });

    // Render Custom Legend
    App.renderLegend(datasets, App.elements.projectLegend);
};

App.renderLegend = function renderLegend(datasets, container, contextType = 'global') {
    if (!container) return;
    container.innerHTML = '';

    // Process datasets to identify "Other" projects
    const processedDatasets = datasets.map(ds => ({
        ...ds,
        isOther: ds.isOther || ds.backgroundColor === '#64748b',
        totalHours: ds.data.reduce((a, b) => a + b, 0)
    }));

    const mainDatasets = processedDatasets.filter(ds => !ds.isOther);
    const otherDatasets = processedDatasets.filter(ds => ds.isOther);

    // 1. Render Main Projects (Sorted by hours)
    mainDatasets.sort((a, b) => b.totalHours - a.totalHours);

    mainDatasets.forEach(ds => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `<div class="legend-color" style="background-color: ${ds.backgroundColor}"></div><span>${ds.label} <span class="text-slate-500 text-[10px] ml-1">(${ds.totalHours.toFixed(1)} h)</span></span>`;
        container.appendChild(item);
    });

    // 2. Render "Others" Pill with context
    if (otherDatasets.length > 0) {
        const totalOthersHours = otherDatasets.reduce((sum, ds) => sum + ds.totalHours, 0);
        const item = document.createElement('div');
        item.className = 'legend-item others';
        item.title = 'Click to see details';
        item.innerHTML = `<div class="legend-color" style="background-color: #64748b"></div><span>Others (${otherDatasets.length}) <span class="text-slate-500 text-[10px] ml-1">(${totalOthersHours.toFixed(1)} h)</span></span>`;

        item.onclick = (e) => {
            e.stopPropagation();
            // Pass the context: which projects to show and their data
            const otherProjectsData = otherDatasets.map(ds => ({
                name: ds.label,
                totalHours: ds.totalHours
            })).sort((a, b) => b.totalHours - a.totalHours);

            App.showOthersModal(otherProjectsData, contextType === 'global' ? 'All Projects' : 'Developer Projects');
        };

        container.appendChild(item);
    }
};

App.showOthersModal = function showOthersModal(projects, titlePrefix) {
    if (!projects || projects.length === 0) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    const totalHoursInModal = projects.reduce((sum, p) => sum + p.totalHours, 0);

    const container = document.createElement('div');
    container.className = 'modal-container';
    container.innerHTML = `
        <div class="modal-header">
            <h3 class="text-lg font-bold text-slate-100 flex items-center gap-2">
                <i class="ph ph-briefcase text-blue-400"></i> ${titlePrefix} (Merged)
            </h3>
            <button class="text-slate-400 hover:text-white transition-colors" onclick="this.closest('.modal-overlay').remove()">
                <i class="ph ph-x text-xl"></i>
            </button>
        </div>
        <div class="modal-content">
            ${projects.map(p => `
                <div class="modal-list-item">
                    <span class="text-sm text-slate-300 font-medium">${App.utils.escapeHtml(p.name)}</span>
                    <div class="text-right">
                        <div class="text-sm font-bold text-blue-400">${p.totalHours.toFixed(1)} h</div>
                        <div class="text-[10px] text-slate-500">${((p.totalHours / (totalHoursInModal || 1)) * 100).toFixed(1)}% of group</div>
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="modal-footer">
            <button class="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors" onclick="this.closest('.modal-overlay').remove()">Close</button>
        </div>
    `;

    overlay.appendChild(container);
    document.body.appendChild(overlay);

    const handleEsc = (e) => { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', handleEsc); } };
    document.addEventListener('keydown', handleEsc);
};

App.downloadChart = function downloadChart() {
    const { chartCanvas } = App.elements;
    if (!chartCanvas) return;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = chartCanvas.width;
    tempCanvas.height = chartCanvas.height;
    const tCtx = tempCanvas.getContext('2d');

    tCtx.fillStyle = '#0f172a';
    tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tCtx.drawImage(chartCanvas, 0, 0);

    const link = document.createElement('a');
    link.download = 'Monthly_Project_Report.png';
    link.href = tempCanvas.toDataURL('image/png', 1.0);
    link.click();
};

App.toggleChart = function toggleChart() {
    const { chartSection, toggleChartBtn } = App.elements;
    if (!chartSection || !toggleChartBtn) return;

    if (chartSection.classList.contains('collapsed')) {
        chartSection.classList.remove('collapsed');
        toggleChartBtn.innerHTML = '<i class="ph ph-caret-up"></i> Hide Graph';
    } else {
        chartSection.classList.add('collapsed');
        toggleChartBtn.innerHTML = '<i class="ph ph-caret-down"></i> Show Graph';
    }
};

App.renderDeveloperChart = function renderDeveloperChart(developer, projectFilter, detailedMap) {
    const { developerChartCanvas, insightPlaceholder, developerLegend } = App.elements;
    if (!developerChartCanvas) return;

    // Toggle placeholder
    if (!developer) {
        if (insightPlaceholder) insightPlaceholder.style.display = 'flex';
        if (App.state.developerChartInstance) {
            App.state.developerChartInstance.destroy();
            App.state.developerChartInstance = null;
        }
        if (developerLegend) developerLegend.innerHTML = '';
        return;
    }
    if (insightPlaceholder) insightPlaceholder.style.display = 'none';

    const ctx = developerChartCanvas.getContext('2d');
    if (App.state.developerChartInstance) App.state.developerChartInstance.destroy();

    const devData = detailedMap[developer] || {};

    // Calculate total hours per project for this developer to determine "Main" vs "Others"
    const devProjectsSorted = Object.keys(devData).map(p => {
        const total = Object.values(devData[p]).reduce((a, b) => a + b, 0);
        return { name: p, total };
    }).sort((a, b) => b.total - a.total);

    // Determine Projects to show
    let projectsToShow = [];
    let mainProjectsForDev = [];

    if (projectFilter && projectFilter !== 'all') {
        if (devData[projectFilter]) {
            projectsToShow = [projectFilter];
            mainProjectsForDev = [projectFilter];
        }
    } else {
        projectsToShow = devProjectsSorted.map(p => p.name);
        // Combine into "Others" only if project count > 10
        if (projectsToShow.length > 10) {
            mainProjectsForDev = projectsToShow.slice(0, 9);
        } else {
            mainProjectsForDev = projectsToShow;
        }
    }

    // Determine Months (Union of all months for this developer)
    const allMonthsSet = new Set();
    Object.values(devData).forEach(projObj => {
        Object.keys(projObj).forEach(m => allMonthsSet.add(m));
    });
    const sortedMonthKeys = Array.from(allMonthsSet).sort();

    // Format Month Labels
    const labels = sortedMonthKeys.map(key => {
        const [y, m] = key.split('-');
        const d = new Date(parseInt(y), parseInt(m) - 1);
        return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    });

    // Build Datasets
    const datasets = projectsToShow.map((proj, idx) => {
        const dataPoints = sortedMonthKeys.map(mKey => devData[proj][mKey] || 0);
        const isMain = mainProjectsForDev.includes(proj);

        // Determine color:
        // 1. If it's an "Other" project for this dev, use gray.
        // 2. Otherwise, try to use global color.
        // 3. if global color is gray (because it's Other globally) but it's Main for this dev, give it a real color.
        let color = (App.state.projectColorMap && App.state.projectColorMap[proj])
            ? App.state.projectColorMap[proj]
            : App.utils.getColor(idx);

        if (!isMain) {
            color = '#64748b'; // Gray for Others
        } else if (color === '#64748b') {
            // It's Main for this developer, so give it a real color even if it's "Other" globally
            color = App.utils.getColor(idx);
        }

        return {
            label: proj,
            data: dataPoints,
            backgroundColor: color,
            isOther: !isMain,
            borderWidth: 0,
            borderRadius: 2,
            barPercentage: 0.6
        };
    });

    App.state.developerChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    grid: { display: false },
                    ticks: {
                        font: { family: "'Inter', sans-serif", size: 11 },
                        color: '#94a3b8'
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    grid: { color: '#1e293b' },
                    ticks: { color: '#94a3b8' },
                    title: { display: true, text: 'Hours Spent', color: '#64748b' }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderWidth: 1,
                    titleColor: '#f1f5f9',
                    bodyColor: '#cbd5e1',
                    filter: function (tooltipItem) {
                        return tooltipItem.raw > 0;
                    },
                    callbacks: {
                        footer: (tooltipItems) => {
                            let sum = 0;
                            tooltipItems.forEach(function (tooltipItem) {
                                sum += tooltipItem.parsed.y;
                            });
                            return 'Total: ' + sum.toFixed(2) + ' h';
                        }
                    }
                }
            }
        }
    });

    // Render Custom Legend for Developer Chart - pass 'developer' context
    App.renderLegend(datasets, developerLegend, 'developer');
};
