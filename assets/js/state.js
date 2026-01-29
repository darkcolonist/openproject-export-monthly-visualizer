window.App = window.App || {};

App.state = {
    chartInstance: null,
    developerChartInstance: null,
    detailedMap: null // Structure: { [Developer]: { [Project]: { [MonthKey]: hours } } }
};

App.elements = {};
