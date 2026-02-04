window.App = window.App || {};

App.handleFile = function handleFile(file, skipCache = false) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const fileBuffer = new Uint8Array(e.target.result);
            const workbook = XLSX.read(fileBuffer, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

            const rawRows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            let headerIndex = 0;
            for (let i = 0; i < rawRows.length; i++) {
                const rowStr = (rawRows[i] || []).join(' ').toLowerCase();
                if (rowStr.includes('date') && rowStr.includes('user')) {
                    headerIndex = i;
                    break;
                }
            }

            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { range: headerIndex, defval: "" });
            if (!jsonData.length) { alert("No valid data found."); return; }

            // Store in state
            App.state.rawJsonData = jsonData;
            App.state.fileName = file.name;
            App.state.startDate = null; // Reset filters for new file
            App.state.endDate = null;

            // Cache file (only if validation passes in processAndRender)
            const validation = App.validateData(jsonData);
            if (!validation.valid) {
                App.showErrorModal('Invalid File Format', validation.message);
                return;
            }

            if (!skipCache) {
                App.cacheFile(file, e.target.result, jsonData.length);
            }

            App.processAndRender();
            App.generateBookmarkUrl(file.name);

        } catch (err) {
            console.error(err);
            alert("Error parsing file. Please check the format.");
        }
    };
    reader.readAsArrayBuffer(file);
};

App.validateData = function (jsonData) {
    const firstRow = jsonData[0] || {};
    const dateKey = Object.keys(firstRow).find(k => k.trim().toLowerCase().includes('date'));
    const userKey = Object.keys(firstRow).find(k => k.trim().toLowerCase() === 'user');
    const unitsKey = Object.keys(firstRow).find(k => k.trim().toLowerCase() === 'units');
    const projectKey = Object.keys(firstRow).find(k => k.trim().toLowerCase() === 'project');

    if (!dateKey || !userKey || !unitsKey || !projectKey) {
        return {
            valid: false,
            message: `The file does not match the expected format. Please ensure your file contains the required columns: Date, User, Units, and Project.`
        };
    }
    return { valid: true };
};

App.processAndRender = function () {
    const jsonData = App.state.rawJsonData;
    if (!jsonData) return;

    const { startDate, endDate } = App.state;

    const monthMap = {};
    const userMap = {};
    const allUsersSet = new Set();
    const projectMap = {};
    const allProjectsSet = new Set();
    const allMonthsSet = new Set();
    const detailedMap = {};

    jsonData.forEach(row => {
        const dateKey = Object.keys(row).find(k => k.trim().toLowerCase().includes('date'));
        const userKey = Object.keys(row).find(k => k.trim().toLowerCase() === 'user');
        const unitsKey = Object.keys(row).find(k => k.trim().toLowerCase() === 'units');
        const projectKey = Object.keys(row).find(k => k.trim().toLowerCase() === 'project');

        if (dateKey && userKey && unitsKey) {
            let dateVal = row[dateKey];
            const user = (row[userKey] || "Unknown User").trim();
            const project = projectKey ? (row[projectKey] || "Unassigned").trim() : "Unassigned";
            const hours = parseFloat(row[unitsKey]) || 0;

            if (hours > 0) {
                let monthKey = "";
                let monthLabel = "";

                if (typeof dateVal === 'number') {
                    const dateObj = XLSX.SSF.parse_date_code(dateVal);
                    const mm = String(dateObj.m).padStart(2, '0');
                    monthKey = `${dateObj.y}-${mm}`;
                    monthLabel = new Date(dateObj.y, dateObj.m - 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
                } else {
                    try {
                        const d = new Date(dateVal);
                        if (!isNaN(d)) {
                            const mm = String(d.getMonth() + 1).padStart(2, '0');
                            monthKey = `${d.getFullYear()}-${mm}`;
                            monthLabel = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
                        }
                    } catch (e) { }
                }

                if (monthKey) {
                    // APPLY DATE FILTER
                    if (startDate && monthKey < startDate) return;
                    if (endDate && monthKey > endDate) return;

                    allMonthsSet.add(monthKey);
                    monthMap[monthKey] = monthLabel;

                    allUsersSet.add(user);
                    if (!userMap[user]) userMap[user] = {};
                    if (!userMap[user][monthKey]) userMap[user][monthKey] = 0;
                    userMap[user][monthKey] += hours;

                    allProjectsSet.add(project);
                    if (!projectMap[project]) projectMap[project] = {};
                    if (!projectMap[project][monthKey]) projectMap[project][monthKey] = 0;
                    projectMap[project][monthKey] += hours;

                    if (!detailedMap[user]) detailedMap[user] = {};
                    if (!detailedMap[user][project]) detailedMap[user][project] = {};
                    if (!detailedMap[user][project][monthKey]) detailedMap[user][project][monthKey] = 0;
                    detailedMap[user][project][monthKey] += hours;
                }
            }
        }
    });

    App.state.detailedMap = detailedMap;
    const sortedMonthKeys = Array.from(allMonthsSet).sort();
    const monthLabels = sortedMonthKeys.map(k => monthMap[k]);

    const activeProjectsRaw = Array.from(allProjectsSet).sort().filter(proj => {
        const total = Object.values(projectMap[proj]).reduce((a, b) => a + b, 0);
        return total > 0;
    });

    activeProjectsRaw.sort((a, b) => {
        const totalA = Object.values(projectMap[a]).reduce((sum, val) => sum + val, 0);
        const totalB = Object.values(projectMap[b]).reduce((sum, val) => sum + val, 0);
        return totalB - totalA;
    });

    const totalHoursAll = activeProjectsRaw.reduce((sum, proj) => {
        return sum + Object.values(projectMap[proj]).reduce((s, v) => s + v, 0);
    }, 0);

    const MAX_PROJECTS = 12;
    const THRESHOLD_PERCENT = 0.01;
    const mainProjects = [];
    const otherProjects = [];
    App.state.projectColorMap = {};

    activeProjectsRaw.forEach((proj, index) => {
        const projTotal = Object.values(projectMap[proj]).reduce((s, v) => s + v, 0);
        const isSmall = (projTotal / totalHoursAll) < THRESHOLD_PERCENT;
        if (index < MAX_PROJECTS && (!isSmall || index < 5)) {
            mainProjects.push(proj);
            App.state.projectColorMap[proj] = App.utils.getColor(index);
        } else {
            otherProjects.push(proj);
            App.state.projectColorMap[proj] = '#64748b';
        }
    });

    let finalProjectMap = { ...projectMap };
    const chartDatasets = activeProjectsRaw.map((project) => {
        const dataPoints = sortedMonthKeys.map(mKey => projectMap[project][mKey] || 0);
        return {
            label: project,
            data: dataPoints,
            backgroundColor: App.state.projectColorMap[project],
            isOther: !mainProjects.includes(project),
            borderWidth: 0,
            borderRadius: 2,
            barPercentage: 0.6
        };
    });

    if (otherProjects.length > 0) {
        App.state.otherProjectsList = otherProjects.map(p => {
            const hours = Object.values(projectMap[p]).reduce((a, b) => a + b, 0);
            return {
                name: p,
                hours: hours,
                percent: (hours / totalHoursAll * 100).toFixed(1)
            };
        }).sort((a, b) => b.hours - a.hours);

        const othersName = `Others (${otherProjects.length} projects)`;
        finalProjectMap[othersName] = {};
        otherProjects.forEach(proj => {
            Object.keys(projectMap[proj]).forEach(mKey => {
                if (!finalProjectMap[othersName][mKey]) finalProjectMap[othersName][mKey] = 0;
                finalProjectMap[othersName][mKey] += projectMap[proj][mKey];
            });
        });
    } else {
        App.state.otherProjectsList = [];
    }

    const finalTableProjects = [
        ...mainProjects,
        ...(otherProjects.length > 0 ? [`Others (${otherProjects.length} projects)`] : [])
    ];

    const usersList = Array.from(allUsersSet).sort();
    const activeUsersFilter = usersList.filter(user => {
        const total = Object.values(userMap[user]).reduce((a, b) => a + b, 0);
        return total > 0;
    }).sort((a, b) => {
        const totalA = Object.values(userMap[a]).reduce((sum, val) => sum + val, 0);
        const totalB = Object.values(userMap[b]).reduce((sum, val) => sum + val, 0);
        return totalB - totalA;
    });

    const { uploadContainer, dashboardContainer, fileInfo, toggleChartBtn, headerDateFilter } = App.elements;
    if (uploadContainer) uploadContainer.style.display = 'none';
    if (dashboardContainer) {
        dashboardContainer.classList.remove('hidden');
        setTimeout(() => dashboardContainer.classList.remove('opacity-0'), 50);
    }
    if (toggleChartBtn) toggleChartBtn.classList.remove('hidden');
    if (headerDateFilter) {
        headerDateFilter.classList.remove('hidden');
        setTimeout(() => headerDateFilter.classList.remove('opacity-0'), 100);
    }

    if (fileInfo) {
        fileInfo.textContent = `Source: ${App.state.fileName} | ${sortedMonthKeys.length} Months Displayed`;
    }

    App.renderStackedChart(monthLabels, chartDatasets);
    App.renderProjectTable(sortedMonthKeys, monthLabels, finalTableProjects, finalProjectMap);
    App.renderTable(sortedMonthKeys, monthLabels, activeUsersFilter, userMap);
    App.populateInsightControls(activeUsersFilter, detailedMap);

    App.updateDateRangeDisplay();

    setTimeout(() => {
        App.initializeStickyHeaders();
        App.initializeScrollNavigationHighlighting();
    }, 100);
};
