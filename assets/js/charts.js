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
    const { developerChartCanvas, insightPlaceholder } = App.elements; // Need to ensure these are captured in dom.js or ui.js
    if (!developerChartCanvas) return;

    // Toggle placeholder
    if (!developer) {
        if (insightPlaceholder) insightPlaceholder.style.display = 'flex';
        if (App.state.developerChartInstance) {
            App.state.developerChartInstance.destroy();
            App.state.developerChartInstance = null;
        }
        return;
    }
    if (insightPlaceholder) insightPlaceholder.style.display = 'none';

    const ctx = developerChartCanvas.getContext('2d');
    if (App.state.developerChartInstance) App.state.developerChartInstance.destroy();

    const devData = detailedMap[developer] || {};

    // Determine Projects to show
    let projectsToShow = [];
    if (projectFilter && projectFilter !== 'all') {
        if (devData[projectFilter]) projectsToShow = [projectFilter];
    } else {
        projectsToShow = Object.keys(devData).sort();
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
    const datasets = projectsToShow.map((proj, index) => {
        const dataPoints = sortedMonthKeys.map(mKey => devData[proj][mKey] || 0);
        // Use a consistent color mapping or random
        return {
            label: proj,
            data: dataPoints,
            backgroundColor: App.utils.getColor(index + (projectFilter === 'all' ? 0 : 5)), // Offset color if single project
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
                    display: true,
                    position: 'bottom',
                    labels: { color: '#cbd5e1', usePointStyle: true, boxWidth: 8 }
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
};
