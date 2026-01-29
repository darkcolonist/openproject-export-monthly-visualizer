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

            const monthMap = {};
            const userMap = {};
            const allUsersSet = new Set();
            const projectMap = {};
            const allProjectsSet = new Set();
            const allMonthsSet = new Set();

            const detailedMap = {}; // New detailed structure

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

                        // ... Date parsing logic existing ... 
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
                            allMonthsSet.add(monthKey);
                            monthMap[monthKey] = monthLabel;

                            // Standard Aggregations
                            allUsersSet.add(user);
                            if (!userMap[user]) userMap[user] = {};
                            if (!userMap[user][monthKey]) userMap[user][monthKey] = 0;
                            userMap[user][monthKey] += hours;

                            allProjectsSet.add(project);
                            if (!projectMap[project]) projectMap[project] = {};
                            if (!projectMap[project][monthKey]) projectMap[project][monthKey] = 0;
                            projectMap[project][monthKey] += hours;

                            // Detailed Map Building for Insights
                            if (!detailedMap[user]) detailedMap[user] = {};
                            if (!detailedMap[user][project]) detailedMap[user][project] = {};
                            if (!detailedMap[user][project][monthKey]) detailedMap[user][project][monthKey] = 0;
                            detailedMap[user][project][monthKey] += hours;
                        }
                    }
                }
            });

            // Save to state
            App.state.detailedMap = detailedMap;

            const sortedMonthKeys = Array.from(allMonthsSet).sort();
            const monthLabels = sortedMonthKeys.map(k => monthMap[k]);

            // Validation: Check if we have valid data
            const hasProjects = allProjectsSet.size > 0;
            const hasDevelopers = allUsersSet.size > 0;
            const hasMonths = allMonthsSet.size > 0;

            if (!hasProjects || !hasDevelopers || !hasMonths) {
                App.showErrorModal(
                    'Invalid File Format',
                    `The file "${file.name}" does not match the expected format. Please ensure your file contains the required columns: Date, User, Units, and Project. Download the sample template below for reference.`
                );
                return;
            }

            // Cache file with row count (only if validation passes)
            if (!skipCache) {
                App.cacheFile(file, e.target.result, jsonData.length);
            }

            const projectsList = Array.from(allProjectsSet).sort();
            const activeProjectsRaw = projectsList.filter(proj => {
                const total = Object.values(projectMap[proj]).reduce((a, b) => a + b, 0);
                return total > 0;
            });

            activeProjectsRaw.sort((a, b) => {
                const totalA = Object.values(projectMap[a]).reduce((sum, val) => sum + val, 0);
                const totalB = Object.values(projectMap[b]).reduce((sum, val) => sum + val, 0);
                return totalB - totalA;
            });

            // Calculate total hours across all projects for thresholding
            const totalHoursAll = activeProjectsRaw.reduce((sum, proj) => {
                return sum + Object.values(projectMap[proj]).reduce((s, v) => s + v, 0);
            }, 0);

            // Merging logic: Keep top 12 or those > 1% of total
            const MAX_PROJECTS = 12;
            const THRESHOLD_PERCENT = 0.01; // 1%

            const mainProjects = [];
            const otherProjects = [];

            // Global color map for consistency
            App.state.projectColorMap = {};

            activeProjectsRaw.forEach((proj, index) => {
                const projTotal = Object.values(projectMap[proj]).reduce((s, v) => s + v, 0);
                const isSmall = (projTotal / totalHoursAll) < THRESHOLD_PERCENT;

                if (index < MAX_PROJECTS && (!isSmall || index < 5)) {
                    mainProjects.push(proj);
                    App.state.projectColorMap[proj] = App.utils.getColor(index);
                } else {
                    otherProjects.push(proj);
                    App.state.projectColorMap[proj] = '#64748b'; // Shared others color
                }
            });

            let finalProjectMap = { ...projectMap };

            // We keep all projects separate for the chart to allow individual tooltips
            const chartDatasets = activeProjectsRaw.map((project) => {
                const dataPoints = sortedMonthKeys.map(mKey => projectMap[project][mKey] || 0);
                const isMain = mainProjects.includes(project);

                return {
                    label: project,
                    data: dataPoints,
                    backgroundColor: App.state.projectColorMap[project],
                    isOther: !isMain,
                    borderWidth: 0,
                    borderRadius: 2,
                    barPercentage: 0.6
                };
            });

            // For the summary state used by the Legend Modal
            if (otherProjects.length > 0) {
                App.state.otherProjectsList = otherProjects.map(p => {
                    const hours = Object.values(projectMap[p]).reduce((a, b) => a + b, 0);
                    return {
                        name: p,
                        hours: hours,
                        percent: (hours / totalHoursAll * 100).toFixed(1)
                    };
                }).sort((a, b) => b.hours - a.hours);

                // For the table, we DO want to merge for a cleaner breakdown
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
            });

            activeUsersFilter.sort((a, b) => {
                const totalA = Object.values(userMap[a]).reduce((sum, val) => sum + val, 0);
                const totalB = Object.values(userMap[b]).reduce((sum, val) => sum + val, 0);
                return totalB - totalA;
            });

            const { uploadContainer, dashboardContainer, fileInfo, toggleChartBtn } = App.elements;
            if (uploadContainer) {
                uploadContainer.style.display = 'none';
            }
            if (dashboardContainer) {
                dashboardContainer.classList.remove('hidden');
                setTimeout(() => dashboardContainer.classList.remove('opacity-0'), 50);
            }
            if (toggleChartBtn) {
                toggleChartBtn.classList.remove('hidden');
            }
            if (fileInfo) {
                fileInfo.textContent = `Source: ${file.name} | ${sortedMonthKeys.length} Months Found`;
            }

            App.renderStackedChart(monthLabels, chartDatasets);
            App.renderProjectTable(sortedMonthKeys, monthLabels, finalTableProjects, finalProjectMap);
            App.renderTable(sortedMonthKeys, monthLabels, activeUsersFilter, userMap);

            // Populate Insights
            App.populateInsightControls(activeUsersFilter, detailedMap);

            setTimeout(() => {
                App.initializeStickyHeaders();
                App.initializeScrollNavigationHighlighting();
            }, 100);
            App.generateBookmarkUrl(file.name);

        } catch (err) {
            console.error(err);
            alert("Error parsing file. Please check the format.");
        }
    };
    reader.readAsArrayBuffer(file);
};
