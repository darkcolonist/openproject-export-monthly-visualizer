window.App = window.App || {};

App.state = {
    chartInstance: null,
    developerChartInstance: null,
    detailedMap: null, // Structure: { [Developer]: { [Project]: { [MonthKey]: hours } } }
    rawJsonData: null,
    fileName: null,
    startDate: null, // YYYY-MM
    endDate: null    // YYYY-MM
};

App.elements = {};
