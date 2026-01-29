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
                            } catch (e) {}
                        }

                        if (monthKey) {
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
                        }
                    }
                }
            });

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
            const activeProjects = projectsList.filter(proj => {
                const total = Object.values(projectMap[proj]).reduce((a, b) => a + b, 0);
                return total > 0;
            });

            activeProjects.sort((a, b) => {
                const totalA = Object.values(projectMap[a]).reduce((sum, val) => sum + val, 0);
                const totalB = Object.values(projectMap[b]).reduce((sum, val) => sum + val, 0);
                return totalB - totalA;
            });

            const chartDatasets = activeProjects.map((project, index) => {
                const dataPoints = sortedMonthKeys.map(mKey => projectMap[project][mKey] || 0);
                return {
                    label: project,
                    data: dataPoints,
                    backgroundColor: App.utils.getColor(index),
                    borderWidth: 0,
                    borderRadius: 2,
                    barPercentage: 0.6
                };
            });

            const usersList = Array.from(allUsersSet).sort();
            usersList.sort((a, b) => {
                const totalA = Object.values(userMap[a]).reduce((sum, val) => sum + val, 0);
                const totalB = Object.values(userMap[b]).reduce((sum, val) => sum + val, 0);
                return totalB - totalA;
            });

            const { uploadContainer, dashboardContainer, fileInfo } = App.elements;
            if (uploadContainer) {
                uploadContainer.style.display = 'none';
            }
            if (dashboardContainer) {
                dashboardContainer.classList.remove('hidden');
                setTimeout(() => dashboardContainer.classList.remove('opacity-0'), 50);
            }
            if (fileInfo) {
                fileInfo.textContent = `Source: ${file.name} | ${sortedMonthKeys.length} Months Found`;
            }

            App.renderStackedChart(monthLabels, chartDatasets);
            App.renderProjectTable(sortedMonthKeys, monthLabels, activeProjects, projectMap);
            App.renderTable(sortedMonthKeys, monthLabels, usersList, userMap);

            setTimeout(() => App.initializeStickyHeaders(), 100);
            App.generateBookmarkUrl(file.name);
        } catch (err) {
            console.error(err);
            alert("Error parsing file. Please check the format.");
        }
    };
    reader.readAsArrayBuffer(file);
};
