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
        chartSection: document.getElementById('chart-section'),
        chartContent: document.getElementById('chart-content'),
        toggleChartBtn: document.getElementById('toggle-chart-btn'),
        chartCanvas: document.getElementById('myChart'),
        projectLegend: document.getElementById('project-legend'),
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
        developerLegend: document.getElementById('developer-legend'),
        insightPlaceholder: document.getElementById('insight-placeholder'),
        floatingNav: document.getElementById('floating-nav'),
        navButtons: document.querySelectorAll('.nav-btn'),
        // Date Filter Elements
        headerDateFilter: document.getElementById('header-date-filter'),
        dateFilterTrigger: document.getElementById('date-filter-trigger'),
        dateRangeDisplay: document.getElementById('date-range-display'),
        headerNewBtn: document.getElementById('header-new-btn'),
        // Supabase & Settings
        settingsBtn: document.getElementById('settings-btn'),
        settingsMenu: document.getElementById('settings-menu'),
        supabaseStatus: document.getElementById('supabase-status'),
        connectSupabaseBtn: document.getElementById('connect-supabase-btn'),
        disconnectSupabaseBtn: document.getElementById('disconnect-supabase-btn'),
        syncSupabaseBtn: document.getElementById('sync-supabase-btn'),
        supabaseModal: document.getElementById('supabase-modal'),
        supabaseUrlInput: document.getElementById('supabase-url'),
        supabaseKeyInput: document.getElementById('supabase-key'),
        supabaseDateFilterBtn: document.getElementById('supabase-date-filter-btn'),
        supabaseDateRangeText: document.getElementById('supabase-date-range-text'),
        supabaseDatePickerInline: document.getElementById('supabase-date-picker-inline'),
        supabaseWarning: document.getElementById('supabase-warning'),
        loadingOverlay: document.getElementById('loading-overlay'),
        loadingText: document.getElementById('loading-text')
    };
};

