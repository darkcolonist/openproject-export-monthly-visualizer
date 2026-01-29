window.App = window.App || {};

App.scrollToSection = function scrollToSection(id) {
    const { scrollContent } = App.elements;
    const el = document.getElementById(id);
    if (el && scrollContent) {
        if (id === 'chart-section') {
            scrollContent.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        const top = el.offsetTop;
        scrollContent.scrollTo({
            top: top,
            behavior: "smooth"
        });
    }
};

App.initializeStickyHeaders = function initializeStickyHeaders() {
    const {
        scrollContent,
        floatingHeader,
        projectThead,
        developerThead,
        projectTable,
        developerTable
    } = App.elements;

    if (!scrollContent || !floatingHeader || !projectThead || !developerThead || !projectTable || !developerTable) {
        return;
    }

    const projectWrapper = projectTable.parentElement;
    const developerWrapper = developerTable.parentElement;
    let currentActiveHeader = null;
    let currentActiveWrapper = null;

    function getOffsetTop(el) {
        const containerRect = scrollContent.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        return elRect.top - containerRect.top + scrollContent.scrollTop;
    }

    function setFloatingHeader(activeHeader, activeTable, activeWrapper) {
        if (activeHeader === currentActiveHeader) {
            return;
        }

        const clone = activeHeader.cloneNode(true);
        const tableClone = document.createElement('table');
        tableClone.className = activeTable.className;
        tableClone.style.cssText = activeTable.style.cssText;
        tableClone.style.tableLayout = 'fixed';
        tableClone.style.width = `${activeTable.scrollWidth}px`;
        tableClone.appendChild(clone);

        const inner = document.createElement('div');
        inner.className = 'floating-header-inner';
        inner.appendChild(tableClone);

        floatingHeader.innerHTML = '';
        floatingHeader.appendChild(inner);
        floatingHeader.classList.add('active');

        inner.scrollLeft = activeWrapper.scrollLeft;
        requestAnimationFrame(() => {
            const sourceCells = activeHeader.querySelectorAll('th');
            const targetCells = clone.querySelectorAll('th');
            sourceCells.forEach((cell, index) => {
                const width = cell.getBoundingClientRect().width;
                if (targetCells[index]) {
                    targetCells[index].style.width = `${width}px`;
                    targetCells[index].style.minWidth = `${width}px`;
                    targetCells[index].style.maxWidth = `${width}px`;
                }
            });
        });
        inner.addEventListener('scroll', () => {
            if (currentActiveWrapper) {
                currentActiveWrapper.scrollLeft = inner.scrollLeft;
            }
        });
        currentActiveHeader = activeHeader;
        currentActiveWrapper = activeWrapper;
    }

    function clearFloatingHeader() {
        floatingHeader.classList.remove('active');
        floatingHeader.innerHTML = '';
        currentActiveHeader = null;
        currentActiveWrapper = null;
    }

    function updateFloatingHeader() {
        const scrollTop = scrollContent.scrollTop;
        const headerHeight = projectThead.offsetHeight || 0;

        const projectTop = getOffsetTop(projectTable);
        const projectBottom = projectTop + projectTable.offsetHeight;

        const developerTop = getOffsetTop(developerTable);
        const developerBottom = developerTop + developerTable.offsetHeight;

        const projectActive = scrollTop + headerHeight >= projectTop && scrollTop < projectBottom - headerHeight;
        const developerActive = scrollTop + headerHeight >= developerTop && scrollTop < developerBottom - headerHeight;

        if (projectActive) {
            setFloatingHeader(projectThead, projectTable, projectWrapper);
        } else if (developerActive) {
            setFloatingHeader(developerThead, developerTable, developerWrapper);
        } else {
            clearFloatingHeader();
        }
    }

    scrollContent.addEventListener('scroll', updateFloatingHeader);

    projectWrapper.addEventListener('scroll', () => {
        const inner = floatingHeader.querySelector('.floating-header-inner');
        if (currentActiveWrapper === projectWrapper && inner) {
            inner.scrollLeft = projectWrapper.scrollLeft;
        }
    });

    developerWrapper.addEventListener('scroll', () => {
        const inner = floatingHeader.querySelector('.floating-header-inner');
        if (currentActiveWrapper === developerWrapper && inner) {
            inner.scrollLeft = developerWrapper.scrollLeft;
        }
    });

    updateFloatingHeader();
};

App.initializeScrollNavigationHighlighting = function initializeScrollNavigationHighlighting() {
    const { scrollContent, navButtons } = App.elements;
    if (!scrollContent || !navButtons || navButtons.length === 0) return;

    const sections = [
        'chart-section',
        'project-section',
        'developer-section',
        'insights-section'
    ].map(id => document.getElementById(id)).filter(Boolean);

    function updateActiveNav() {
        const scrollTop = scrollContent.scrollTop;
        let activeSectionId = 'chart-section';

        // The chart-section is outside scrollContent, so if scrollTop is 0, it's chart.
        // If we move down, we check other sections.
        if (scrollTop > 100) {
            sections.forEach(section => {
                if (section.id === 'chart-section') return;

                // offsetTop is relative to scroll-content because it's position: relative
                if (scrollTop >= section.offsetTop - 150) {
                    activeSectionId = section.id;
                }
            });
        }

        navButtons.forEach(btn => {
            const btnSection = btn.getAttribute('data-section');
            if (btnSection === activeSectionId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    scrollContent.addEventListener('scroll', updateActiveNav);
    // Initial call after a small delay to ensure rendering is complete
    setTimeout(updateActiveNav, 100);
};

