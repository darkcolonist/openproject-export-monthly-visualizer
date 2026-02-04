/**
 * Dashboard View Component
 * Main data visualization screen with charts and tables
 */
import { h } from 'preact';
import { useRef, useEffect, useState, useCallback } from 'preact/hooks';
import htm from 'htm';
import {
    rawData,
    filteredData,
    fileName,
    chartVisible,
    hasData
} from 'app/store.js';
import { getMonths, getProjects, getDevelopers } from 'app/utils/parser.js';
import { getColor } from 'app/utils/colors.js';
import { getDashboardFile, goToUpload } from 'app/router.js';

const html = htm.bind(h);

// Helper to build detailed map
function buildDetailedMap(data) {
    const map = {};
    data.forEach(row => {
        const user = row.user;
        const project = row.project;
        const month = row.date;
        const hours = row.units;

        if (!map[user]) map[user] = {};
        if (!map[user][project]) map[user][project] = {};
        if (!map[user][project][month]) map[user][project][month] = 0;
        map[user][project][month] += hours;
    });
    return map;
}

export function DashboardView() {
    // Redirect to upload if no data and no pending file load
    useEffect(() => {
        const pendingFile = getDashboardFile();
        if (!hasData.value && !pendingFile) {
            goToUpload();
        }
    }, [hasData.value]);

    if (!hasData.value) {
        // If we have a pending file, we show nothing (loading overlay will be visible from main.js)
        if (getDashboardFile()) return null;
        return null;
    }



    return html`
        <div class="w-full h-full flex flex-col">
            ${chartVisible.value && html`<${ChartSection} />`}
            <${ScrollContent} />
            <${Footer} />
            <${FloatingNav} />
        </div>
    `;
}

function ChartSection() {
    const chartRef = useRef(null);
    const chartInstanceRef = useRef(null);
    const sectionRef = useRef(null);

    useEffect(() => {
        if (!chartRef.current || !rawData.value.length) return;

        // Destroy previous chart
        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }

        const ctx = chartRef.current.getContext('2d');
        const months = getMonths(filteredData.value);
        const projects = getProjects(filteredData.value);

        // Aggregate data by project and month
        const projectData = {};
        projects.forEach(proj => {
            projectData[proj] = {};
            months.forEach(month => projectData[proj][month] = 0);
        });

        filteredData.value.forEach(row => {
            if (projectData[row.project] && projectData[row.project][row.date] !== undefined) {
                projectData[row.project][row.date] += row.units;
            }
        });

        // Calculate total hours per project for sorting
        const projectTotals = projects.map(proj => ({
            name: proj,
            total: Object.values(projectData[proj]).reduce((a, b) => a + b, 0)
        })).sort((a, b) => b.total - a.total);

        const datasets = projectTotals.map((item, index) => ({
            label: item.name,
            data: months.map(month => projectData[item.name][month] || 0),
            backgroundColor: getColor(index),
            borderWidth: 0,
            borderRadius: 2,
            barPercentage: 0.6
        }));

        chartInstanceRef.current = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months.map(m => {
                    const [y, month] = m.split('-');
                    return new Date(parseInt(y), parseInt(month) - 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
                }),
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderWidth: 1,
                        filter: (item) => item.raw > 0,
                        callbacks: {
                            footer: (tooltipItems) => {
                                const sum = tooltipItems.reduce((acc, item) => acc + item.parsed.y, 0);
                                return `Total: ${sum.toFixed(2)} h`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: { display: false },
                        ticks: { color: '#94a3b8' }
                    },
                    y: {
                        stacked: true,
                        grid: { color: '#1e293b' },
                        ticks: { color: '#94a3b8' },
                        title: { display: true, text: 'Total Hours', color: '#64748b' }
                    }
                }
            }
        });

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
        };
    }, [filteredData.value]);

    // Scroll passthrough for chart section
    useEffect(() => {
        const section = sectionRef.current;
        if (!section) return;

        const handleWheel = (e) => {
            const scrollContent = document.getElementById('scroll-content');
            if (!scrollContent) return;

            // Check if scrolling vertically
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                scrollContent.scrollTop += e.deltaY;
                e.preventDefault();
            }
        };

        section.addEventListener('wheel', handleWheel, { passive: false });
        return () => section.removeEventListener('wheel', handleWheel);
    }, []);

    const handleDownload = () => {
        if (chartRef.current) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = chartRef.current.width;
            tempCanvas.height = chartRef.current.height;
            const tCtx = tempCanvas.getContext('2d');
            tCtx.fillStyle = '#0f172a';
            tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            tCtx.drawImage(chartRef.current, 0, 0);

            const link = document.createElement('a');
            link.download = `Monthly_Project_Report.png`;
            link.href = tempCanvas.toDataURL('image/png', 1.0);
            link.click();
        }
    };

    return html`
        <div ref=${sectionRef} id="chart-section" class="bg-slate-900 border-b border-slate-800 flex flex-col p-3 shrink-0 shadow-lg relative z-30 transition-all">
            <div class="flex justify-between items-start mb-2 shrink-0 px-4">
                <div>
                    <h3 class="text-lg font-bold text-slate-100">Monthly Hours Trend</h3>
                    <p class="text-xs text-slate-500">Stacked by <span class="font-bold text-blue-400">Project</span></p>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick=${handleDownload}
                        class="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 hover:bg-slate-700 transition-colors">
                        <i class="ph ph-download-simple"></i> Save Image
                    </button>
                </div>
            </div>
            <div class="relative w-full h-80 transition-all overflow-hidden px-4">
                <canvas ref=${chartRef}></canvas>
            </div>
            <${ChartLegend} />
        </div>
    `;
}

function ChartLegend() {
    const projects = getProjects(filteredData.value);

    // Calculate totals for sorting
    const projectTotals = {};
    filteredData.value.forEach(row => {
        if (!projectTotals[row.project]) projectTotals[row.project] = 0;
        projectTotals[row.project] += row.units;
    });

    const sortedProjects = [...projects].sort((a, b) => (projectTotals[b] || 0) - (projectTotals[a] || 0));

    return html`
        <div class="chart-legend mb-2 flex flex-wrap gap-2 px-4 mt-2 max-h-24 overflow-y-auto">
            ${sortedProjects.map((proj, index) => html`
                <div class="legend-item flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/50 text-xs">
                    <div class="w-3 h-3 rounded" style="background-color: ${getColor(index)}"></div>
                    <span class="text-slate-300">${proj}</span>
                    <span class="text-slate-500 text-[10px] ml-1">(${(projectTotals[proj] || 0).toFixed(1)} h)</span>
                </div>
            `)}
        </div>
    `;
}

function ScrollContent() {
    const scrollRef = useRef(null);
    const [activeSection, setActiveSection] = useState('chart-section');

    useEffect(() => {
        const scrollContent = scrollRef.current;
        if (!scrollContent) return;

        const handleScroll = () => {
            const scrollTop = scrollContent.scrollTop;
            const sections = ['chart-section', 'project-section', 'developer-section', 'insights-section'];
            let current = 'chart-section';

            for (const id of sections) {
                const el = document.getElementById(id);
                if (el) {
                    // Check if section is at least partially in view at the top
                    const offset = id === 'chart-section' ? 0 : el.offsetTop - 100;
                    if (scrollTop >= offset) {
                        current = id;
                    }
                }
            }
            setActiveSection(current);
        };

        scrollContent.addEventListener('scroll', handleScroll);
        return () => scrollContent.removeEventListener('scroll', handleScroll);
    }, []);

    // Initialize sticky headers logic
    useEffect(() => {
        const scrollContent = scrollRef.current;
        const floatingHeader = document.getElementById('floating-header');

        if (!scrollContent || !floatingHeader) return;

        let currentActiveHeader = null;
        let currentActiveWrapper = null;

        function getOffsetTop(el) {
            const containerRect = scrollContent.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();
            return elRect.top - containerRect.top + scrollContent.scrollTop;
        }

        function syncWidths(activeHeader, activeTable, cloneHeader) {
            if (!activeHeader || !cloneHeader || !activeTable) return;

            const sourceCells = activeHeader.querySelectorAll('th');
            const targetCells = cloneHeader.querySelectorAll('th');

            // Force the cloned table to match legacy scrollWidth exactly
            const tableClone = cloneHeader.closest('table');
            if (tableClone) {
                tableClone.style.tableLayout = 'fixed';
                tableClone.style.width = activeTable.scrollWidth + 'px';
                tableClone.style.minWidth = activeTable.scrollWidth + 'px';
            }

            sourceCells.forEach((cell, index) => {
                if (targetCells[index]) {
                    targetCells[index].style.boxSizing = 'border-box';
                    const rect = cell.getBoundingClientRect();
                    const width = rect.width + 'px';
                    targetCells[index].style.width = width;
                    targetCells[index].style.minWidth = width;
                    targetCells[index].style.maxWidth = width;
                }
            });
        }

        let activeHeaderId = null;

        function setFloatingHeader(activeHeader, activeTable, activeWrapper) {
            const headerId = activeHeader.id;
            const inner = floatingHeader.querySelector('.floating-header-inner');

            // Align horizontal position every time either way
            if (inner) {
                const wrapperRect = activeWrapper.getBoundingClientRect();
                const containerRect = floatingHeader.getBoundingClientRect();
                inner.style.marginLeft = (wrapperRect.left - containerRect.left) + 'px';
                inner.style.width = wrapperRect.width + 'px';
                inner.scrollLeft = activeWrapper.scrollLeft;
            }

            if (headerId === activeHeaderId) return;

            const clone = activeHeader.cloneNode(true);
            const tableClone = document.createElement('table');
            tableClone.className = activeTable.className;
            tableClone.style.cssText = activeTable.style.cssText;
            tableClone.style.tableLayout = 'fixed';
            tableClone.style.width = activeTable.scrollWidth + 'px';
            tableClone.style.marginBottom = '0';
            tableClone.appendChild(clone);

            const newInner = document.createElement('div');
            newInner.className = 'floating-header-inner';

            // Initial positioning
            const wrapperRect = activeWrapper.getBoundingClientRect();
            const containerRect = floatingHeader.getBoundingClientRect();
            newInner.style.marginLeft = (wrapperRect.left - containerRect.left) + 'px';
            newInner.style.width = wrapperRect.width + 'px';
            newInner.style.marginRight = '0';
            newInner.style.padding = '0';

            newInner.appendChild(tableClone);

            floatingHeader.innerHTML = '';
            floatingHeader.appendChild(newInner);
            floatingHeader.classList.add('active');

            newInner.scrollLeft = activeWrapper.scrollLeft;

            requestAnimationFrame(() => {
                syncWidths(activeHeader, activeTable, clone);
            });

            // Bidirectional horizontal scroll sync
            newInner.addEventListener('scroll', () => {
                const wrapper = currentActiveWrapper;
                if (wrapper && Math.abs(wrapper.scrollLeft - newInner.scrollLeft) > 1) {
                    wrapper.scrollLeft = newInner.scrollLeft;
                }
            });

            activeHeaderId = headerId;
            currentActiveWrapper = activeWrapper;
        }

        function clearFloatingHeader() {
            if (floatingHeader.classList.contains('active')) {
                floatingHeader.classList.remove('active');
                floatingHeader.innerHTML = '';
                activeHeaderId = null;
                currentActiveWrapper = null;
            }
        }

        function updateFloatingHeader() {
            const projectThead = document.getElementById('project-thead');
            const projectTable = document.getElementById('project-table');
            const developerThead = document.getElementById('developer-thead');
            const developerTable = document.getElementById('developer-table');

            if (!projectThead || !projectTable || !developerThead || !developerTable) return;

            const scrollTop = scrollContent.scrollTop;
            const headerHeight = projectThead.offsetHeight || 0;

            const projectTop = getOffsetTop(projectTable);
            const projectBottom = projectTop + projectTable.offsetHeight;

            const developerTop = getOffsetTop(developerTable);
            const developerBottom = developerTop + developerTable.offsetHeight;

            // Check if we are inside project table
            if (scrollTop >= projectTop && scrollTop < projectBottom - headerHeight) {
                setFloatingHeader(projectThead, projectTable, projectTable.parentElement);
            }
            // Check if we are inside developer table
            else if (scrollTop >= developerTop && scrollTop < developerBottom - headerHeight) {
                setFloatingHeader(developerThead, developerTable, developerTable.parentElement);
            }
            else {
                clearFloatingHeader();
            }
        }

        // Monitors table resizes to keep sticky headers synced
        const resizeObserver = new ResizeObserver(() => {
            if (currentActiveHeader) {
                updateFloatingHeader();
            }
        });

        // Initialize listeners
        scrollContent.addEventListener('scroll', updateFloatingHeader);
        window.addEventListener('resize', updateFloatingHeader);

        const wrapperListeners = [];

        const attachWrapperListener = (tableId) => {
            const table = document.getElementById(tableId);
            if (table && table.parentElement) {
                const wrapper = table.parentElement;

                const onScroll = () => {
                    const inner = floatingHeader.querySelector('.floating-header-inner');
                    const isActive = (tableId === 'project-table' && activeHeaderId === 'project-thead') ||
                        (tableId === 'developer-table' && activeHeaderId === 'developer-thead');

                    if (inner && isActive && Math.abs(inner.scrollLeft - wrapper.scrollLeft) > 1) {
                        inner.scrollLeft = wrapper.scrollLeft;
                    }
                };

                wrapper.addEventListener('scroll', onScroll);
                wrapperListeners.push({ el: wrapper, fn: onScroll });
            }
        };

        // Delay to ensure components are mounted and layout is stable
        const initTimeout = setTimeout(() => {
            attachWrapperListener('project-table');
            attachWrapperListener('developer-table');
            updateFloatingHeader();
        }, 400);

        return () => {
            clearTimeout(initTimeout);
            scrollContent.removeEventListener('scroll', updateFloatingHeader);
            window.removeEventListener('resize', updateFloatingHeader);
            wrapperListeners.forEach(({ el, fn }) => el.removeEventListener('scroll', fn));
        };
    }, [filteredData.value]);

    return html`
        <div id="scroll-content" ref=${scrollRef} class="flex-1 overflow-y-auto relative bg-slate-950">
            <div id="floating-header" class="floating-sticky-header"></div>
            <${ProjectSection} />
            <${DeveloperSection} />
            <${InsightsSection} />
            <${FloatingNav} activeSection=${activeSection} />
        </div>
    `;
}

function ProjectSection() {
    const months = getMonths(filteredData.value);
    const projects = getProjects(filteredData.value);

    // Aggregate data by project and month
    const projectData = {};
    projects.forEach(proj => {
        projectData[proj] = { total: 0 };
        months.forEach(month => projectData[proj][month] = 0);
    });

    filteredData.value.forEach(row => {
        if (projectData[row.project]) {
            projectData[row.project][row.date] = (projectData[row.project][row.date] || 0) + row.units;
            projectData[row.project].total += row.units;
        }
    });

    // Sort by total hours
    const sortedProjects = [...projects].sort((a, b) => projectData[b].total - projectData[a].total);

    // Helper to format cell value with styling for zeros
    const formatCell = (value) => {
        const num = value || 0;
        const isZero = num === 0;
        return {
            text: num.toFixed(1) + 'h',
            class: isZero ? 'text-slate-600' : 'text-slate-300'
        };
    };

    return html`
        <div id="project-section" class="flex flex-col p-0 overflow-hidden shrink-0 table-section">
            <div class="p-3 bg-slate-950 shrink-0">
                <h3 class="text-xs font-bold text-slate-100 flex items-center gap-2 px-5">
                    <i class="ph ph-briefcase text-blue-400"></i> Project Breakdown
                </h3>
            </div>
            <div class="px-8 pb-8">
                <div class="bg-slate-900 rounded-xl border border-slate-800">
                    <div class="table-scroll-wrapper overflow-x-auto">
                        <table id="project-table" class="text-sm text-left border-collapse" style="min-width: 100%;">
                            <thead id="project-thead" class="text-xs text-slate-400 uppercase bg-slate-800">
                                <tr>
                                    <th class="px-4 py-3 sticky left-0 bg-slate-800 z-20 border-b border-r border-slate-700 font-semibold">Project</th>
                                    ${months.map(month => html`<th class="px-4 py-3 text-right border-b border-r border-slate-700 font-semibold whitespace-nowrap">${formatMonth(month)}</th>`)}
                                    <th class="px-4 py-3 text-right font-bold text-blue-400 border-b border-slate-700">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sortedProjects.map((proj, idx) => html`
                                    <tr class="hover:bg-slate-800/50 transition-colors ${idx < sortedProjects.length - 1 ? 'border-b border-slate-800' : ''}">
                                        <td class="px-4 py-3 font-medium text-slate-200 sticky left-0 bg-slate-900 z-10 border-r border-slate-800">${proj}</td>
                                        ${months.map(month => {
        const cell = formatCell(projectData[proj][month]);
        return html`<td class="px-4 py-3 text-right ${cell.class} border-r border-slate-800/50">${cell.text}</td>`;
    })}
                                        <td class="px-4 py-3 text-right font-bold text-blue-400">${projectData[proj].total.toFixed(1)}h</td>
                                    </tr>
                                `)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function DeveloperSection() {
    const months = getMonths(filteredData.value);
    const developers = getDevelopers(filteredData.value);

    // Aggregate data by developer and month
    const devData = {};
    developers.forEach(dev => {
        devData[dev] = { total: 0 };
        months.forEach(month => devData[dev][month] = 0);
    });

    filteredData.value.forEach(row => {
        if (devData[row.user]) {
            devData[row.user][row.date] = (devData[row.user][row.date] || 0) + row.units;
            devData[row.user].total += row.units;
        }
    });

    // Sort by total hours
    const sortedDevs = [...developers].sort((a, b) => devData[b].total - devData[a].total);

    // Helper to format cell value with styling for zeros
    const formatCell = (value) => {
        const num = value || 0;
        const isZero = num === 0;
        return {
            text: num.toFixed(1) + 'h',
            class: isZero ? 'text-slate-600' : 'text-slate-300'
        };
    };

    return html`
        <div id="developer-section" class="flex flex-col p-0 overflow-hidden shrink-0 table-section">
            <div class="p-3 bg-slate-950 shrink-0">
                <h3 class="text-xs font-bold text-slate-100 flex items-center gap-2 px-5">
                    <i class="ph ph-users text-blue-400"></i> Developer Breakdown
                </h3>
            </div>
            <div class="px-8 pb-8">
                <div class="bg-slate-900 rounded-xl border border-slate-800">
                    <div class="table-scroll-wrapper overflow-x-auto">
                        <table id="developer-table" class="text-sm text-left border-collapse" style="min-width: 100%;">
                            <thead id="developer-thead" class="text-xs text-slate-400 uppercase bg-slate-800">
                                <tr>
                                    <th class="px-4 py-3 sticky left-0 bg-slate-800 z-20 border-b border-r border-slate-700 font-semibold">Developer</th>
                                    ${months.map(month => html`<th class="px-4 py-3 text-right border-b border-r border-slate-700 font-semibold whitespace-nowrap">${formatMonth(month)}</th>`)}
                                    <th class="px-4 py-3 text-right font-bold text-blue-400 border-b border-slate-700">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sortedDevs.map((dev, idx) => html`
                                    <tr class="hover:bg-slate-800/50 transition-colors ${idx < sortedDevs.length - 1 ? 'border-b border-slate-800' : ''}">
                                        <td class="px-4 py-3 font-medium text-slate-200 sticky left-0 bg-slate-900 z-10 border-r border-slate-800">${dev}</td>
                                        ${months.map(month => {
        const cell = formatCell(devData[dev][month]);
        return html`<td class="px-4 py-3 text-right ${cell.class} border-r border-slate-800/50">${cell.text}</td>`;
    })}
                                        <td class="px-4 py-3 text-right font-bold text-blue-400">${devData[dev].total.toFixed(1)}h</td>
                                    </tr>
                                `)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function InsightsSection() {
    const [selectedDev, setSelectedDev] = useState('');
    const [selectedProj, setSelectedProj] = useState('all');
    const chartRef = useRef(null);
    const chartInstanceRef = useRef(null);

    const detailedMap = buildDetailedMap(filteredData.value);
    const developers = getDevelopers(filteredData.value);

    // Get projects for selected developer
    const devProjects = selectedDev && detailedMap[selectedDev]
        ? Object.keys(detailedMap[selectedDev]).sort()
        : [];

    // Calculate totals for developers
    const devTotals = {};
    developers.forEach(dev => {
        devTotals[dev] = 0;
        if (detailedMap[dev]) {
            Object.values(detailedMap[dev]).forEach(projObj => {
                Object.values(projObj).forEach(h => devTotals[dev] += h);
            });
        }
    });

    // Sort developers by total hours
    const sortedDevs = [...developers].sort((a, b) => devTotals[b] - devTotals[a]);

    // Calculate project totals for selected developer
    const projTotals = {};
    if (selectedDev && detailedMap[selectedDev]) {
        Object.entries(detailedMap[selectedDev]).forEach(([proj, months]) => {
            projTotals[proj] = Object.values(months).reduce((a, b) => a + b, 0);
        });
    }

    const handleDevChange = (e) => {
        setSelectedDev(e.target.value);
        setSelectedProj('all');
    };

    const handleProjChange = (e) => {
        setSelectedProj(e.target.value);
    };

    // Render chart when developer or project changes
    useEffect(() => {
        if (!chartRef.current || !selectedDev) {
            // Clear chart if no developer selected
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
                chartInstanceRef.current = null;
            }
            return;
        }

        const devData = detailedMap[selectedDev] || {};

        // Get all months for this developer
        const allMonthsSet = new Set();
        Object.values(devData).forEach(projObj => {
            Object.keys(projObj).forEach(m => allMonthsSet.add(m));
        });
        const sortedMonths = Array.from(allMonthsSet).sort();

        // Determine which projects to show
        let projectsToShow = selectedProj === 'all' ? Object.keys(devData) : [selectedProj];

        // Sort by total hours
        projectsToShow = projectsToShow
            .filter(p => devData[p])
            .map(p => ({
                name: p,
                total: Object.values(devData[p]).reduce((a, b) => a + b, 0)
            }))
            .sort((a, b) => b.total - a.total)
            .map(p => p.name);

        // Build datasets
        const datasets = projectsToShow.map((proj, idx) => {
            const dataPoints = sortedMonths.map(mKey => devData[proj]?.[mKey] || 0);
            return {
                label: proj,
                data: dataPoints,
                backgroundColor: getColor(idx),
                borderWidth: 0,
                borderRadius: 2,
                barPercentage: 0.6
            };
        });

        // Destroy previous chart
        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }

        const ctx = chartRef.current.getContext('2d');
        chartInstanceRef.current = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedMonths.map(m => {
                    const [y, month] = m.split('-');
                    return new Date(parseInt(y), parseInt(month) - 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
                }),
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderWidth: 1,
                        filter: (item) => item.raw > 0,
                        callbacks: {
                            footer: (tooltipItems) => {
                                const sum = tooltipItems.reduce((acc, item) => acc + item.parsed.y, 0);
                                return `Total: ${sum.toFixed(2)} h`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: { display: false },
                        ticks: { color: '#94a3b8' }
                    },
                    y: {
                        stacked: true,
                        grid: { color: '#1e293b' },
                        ticks: { color: '#94a3b8' },
                        title: { display: true, text: 'Hours Spent', color: '#64748b' }
                    }
                }
            }
        });

    }, [selectedDev, selectedProj, detailedMap]);

    // Cleanup chart on unmount
    useEffect(() => {
        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
        };
    }, []);

    return html`
        <div id="insights-section" class="flex flex-col p-0 overflow-hidden shrink-0 table-section mb-10">
            <div class="p-3 bg-slate-950 shrink-0 flex justify-between items-center">
                <h3 class="text-xs font-bold text-slate-100 flex items-center gap-2 px-5">
                    <i class="ph ph-chart-bar text-blue-400"></i> Developer Project Insights
                </h3>
            </div>

            <div class="px-8">
                <div class="bg-slate-900 rounded-xl border border-slate-800 p-6">
                    <!-- Controls -->
                    <div class="flex flex-wrap gap-4 mb-6">
                        <div class="flex flex-col gap-1 w-full sm:w-64">
                            <label class="text-xs text-slate-400 font-medium">Select Developer</label>
                            <div class="relative">
                                <select 
                                    value=${selectedDev}
                                    onChange=${handleDevChange}
                                    class="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                                >
                                    <option value="">Select a Developer...</option>
                                    ${sortedDevs.map(dev => html`
                                        <option value="${dev}">${dev} (${devTotals[dev].toFixed(1)} h)</option>
                                    `)}
                                </select>
                                <i class="ph ph-caret-down absolute right-3 top-3 text-slate-400 pointer-events-none"></i>
                            </div>
                        </div>

                        <div class="flex flex-col gap-1 w-full sm:w-64">
                            <label class="text-xs text-slate-400 font-medium">Filter by Project</label>
                            <div class="relative">
                                <select 
                                    value=${selectedProj}
                                    onChange=${handleProjChange}
                                    disabled=${!selectedDev}
                                    class="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 appearance-none disabled:opacity-50"
                                >
                                    <option value="all">All Projects</option>
                                    ${devProjects.map(proj => html`
                                        <option value="${proj}">${proj} (${(projTotals[proj] || 0).toFixed(1)} h)</option>
                                    `)}
                                </select>
                                <i class="ph ph-caret-down absolute right-3 top-3 text-slate-400 pointer-events-none"></i>
                            </div>
                        </div>
                    </div>

                    <!-- Chart Container -->
                    <div class="relative w-full h-96">
                        <canvas ref=${chartRef}></canvas>
                        ${!selectedDev && html`
                            <div class="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
                                Select a developer to view insights
                            </div>
                        `}
                    </div>

                    <!-- Legend -->
                    ${selectedDev && html`
                        <div class="chart-legend mt-4 flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                            ${(selectedProj === 'all' ? devProjects : [selectedProj])
                .filter(p => projTotals[p] > 0)
                .sort((a, b) => (projTotals[b] || 0) - (projTotals[a] || 0))
                .map((proj, index) => html`
                                <div class="legend-item flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/50 text-xs">
                                    <div class="w-3 h-3 rounded" style="background-color: ${getColor(index)}"></div>
                                    <span class="text-slate-300">${proj}</span>
                                    <span class="text-slate-500 text-[10px] ml-1">(${(projTotals[proj] || 0).toFixed(1)} h)</span>
                                </div>
                            `)}
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
}

function Footer() {
    const handleCopyUrl = () => {
        navigator.clipboard.writeText(window.location.href);
    };

    const months = getMonths(filteredData.value);

    return html`
        <footer class="w-full bg-slate-900 border-t border-slate-800 p-3 shrink-0 z-40 relative">
            <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-6">
                <span class="text-xs text-slate-400 font-medium">
                    Source: ${fileName.value} | ${months.length} Months Displayed
                </span>

                <div class="flex items-center gap-4">
                    <button onclick=${handleCopyUrl}
                        class="text-xs text-slate-400 hover:text-blue-400 flex items-center gap-1 transition-colors"
                        title="Copy URL from address bar">
                        <i class="ph ph-link"></i> Copy URL
                    </button>

                    <div class="w-px h-3 bg-slate-700 mx-1"></div>

                    <a href="https://github.com/darkcolonist/openproject-export-monthly-visualizer" target="_blank"
                        rel="noopener noreferrer"
                        class="text-xs text-slate-400 hover:text-blue-400 flex items-center gap-1 transition-colors">
                        <i class="ph ph-github-logo"></i> GitHub
                    </a>
                </div>
            </div>
        </footer>
    `;
}

function FloatingNav({ activeSection }) {
    const scrollToSection = (sectionId) => {
        const scrollContent = document.getElementById('scroll-content');
        const element = document.getElementById(sectionId);

        if (sectionId === 'chart-section') {
            // Scroll to top
            if (scrollContent) scrollContent.scrollTop = 0;
            return;
        }

        if (element && scrollContent) {
            // Get element position relative to scroll-content
            const elementTop = element.offsetTop;
            scrollContent.scrollTo({
                top: elementTop,
                behavior: 'smooth'
            });
        }
    };

    return html`
        <div class="fixed bottom-20 right-6 flex flex-col gap-2 z-50">
            <button onclick=${() => scrollToSection('chart-section')}
                class="nav-btn w-10 h-10 ${activeSection === 'chart-section' ? 'active bg-blue-600 text-white' : 'bg-slate-800 text-blue-400'} rounded-full border border-slate-700 shadow-lg hover:bg-slate-700 hover:scale-110 transition-all flex items-center justify-center"
                title="Top">
                <i class="ph ph-arrow-up"></i>
            </button>
            <button onclick=${() => scrollToSection('project-section')}
                class="nav-btn w-10 h-10 ${activeSection === 'project-section' ? 'active bg-blue-600 text-white' : 'bg-slate-800 text-blue-400'} rounded-full border border-slate-700 shadow-lg hover:bg-slate-700 hover:scale-110 transition-all flex items-center justify-center"
                title="Projects">
                <i class="ph ph-briefcase"></i>
            </button>
            <button onclick=${() => scrollToSection('developer-section')}
                class="nav-btn w-10 h-10 ${activeSection === 'developer-section' ? 'active bg-blue-600 text-white' : 'bg-slate-800 text-blue-400'} rounded-full border border-slate-700 shadow-lg hover:bg-slate-700 hover:scale-110 transition-all flex items-center justify-center"
                title="Developers">
                <i class="ph ph-users"></i>
            </button>
            <button onclick=${() => scrollToSection('insights-section')}
                class="nav-btn w-10 h-10 ${activeSection === 'insights-section' ? 'active bg-blue-600 text-white' : 'bg-slate-800 text-blue-400'} rounded-full border border-slate-700 shadow-lg hover:bg-slate-700 hover:scale-110 transition-all flex items-center justify-center"
                title="Insights">
                <i class="ph ph-chart-bar"></i>
            </button>
        </div>
    `;
}

// Helper function to format month
function formatMonth(monthKey) {
    const [y, m] = monthKey.split('-');
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

export default DashboardView;
