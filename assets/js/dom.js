window.App = window.App || {};

App.cacheDom = function cacheDom() {
    App.elements = {
        dropZone: document.getElementById('drop-zone'),
        fileInput: document.getElementById('file-input'),
        uploadContainer: document.getElementById('upload-container'),
        dashboardContainer: document.getElementById('dashboard-container'),
        fileInfo: document.getElementById('file-info'),
        tableHeaderRow: document.getElementById('table-header-row'),
        tableBody: document.getElementById('table-body'),
        projectTableHeaderRow: document.getElementById('project-table-header-row'),
        projectTableBody: document.getElementById('project-table-body'),
        chartContent: document.getElementById('chart-content'),
        toggleChartBtn: document.getElementById('toggle-chart-btn'),
        chartCanvas: document.getElementById('myChart'),
        scrollContent: document.getElementById('scroll-content'),
        floatingHeader: document.getElementById('floating-header'),
        projectThead: document.getElementById('project-thead'),
        developerThead: document.getElementById('developer-thead'),
        projectTable: document.getElementById('project-table'),
        developerTable: document.getElementById('developer-table'),
        copyBookmarkBtn: document.getElementById('copy-bookmark-btn'),
        // Insight Elements
        insightDevSelect: document.getElementById('insight-dev-select'),
        insightProjSelect: document.getElementById('insight-proj-select'),
        developerChartCanvas: document.getElementById('developerChart'),
        insightPlaceholder: document.getElementById('insight-placeholder'),
        floatingNav: document.getElementById('floating-nav'),
        navButtons: document.querySelectorAll('.nav-btn')
    };
};

