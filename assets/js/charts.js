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
                    filter: function(tooltipItem) {
                        return tooltipItem.raw > 0;
                    },
                    callbacks: {
                        footer: (tooltipItems) => {
                            let sum = 0;
                            tooltipItems.forEach(function(tooltipItem) {
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
    const { chartContent, toggleChartBtn } = App.elements;
    if (!chartContent || !toggleChartBtn) return;

    if (chartContent.classList.contains('h-0')) {
        chartContent.classList.remove('h-0');
        chartContent.classList.add('h-80');
        toggleChartBtn.innerHTML = '<i class="ph ph-caret-up"></i> Collapse';
    } else {
        chartContent.classList.remove('h-80');
        chartContent.classList.add('h-0');
        toggleChartBtn.innerHTML = '<i class="ph ph-caret-down"></i> Expand';
    }
};
