<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { 
    hasData, 
    filteredData, 
    chartVisible 
} from '@/store';

import ChartSection from '@/components/dashboard/ChartSection.vue';
import ProjectSection from '@/components/dashboard/ProjectSection.vue';
import DeveloperSection from '@/components/dashboard/DeveloperSection.vue';
import InsightsSection from '@/components/dashboard/InsightsSection.vue';
import FloatingNav from '@/components/dashboard/FloatingNav.vue';
import Footer from '@/components/common/Footer.vue';

// In Vue 3, we don't have the router imported yet, but App.vue handles view switching based on `hasData`.
// We just need to ensure if data is lost, we emit back.

const scrollRef = ref(null);
const activeSection = ref('chart-section');
const floatingHeaderRef = ref(null);

// Scroll spy logic
const handleScroll = () => {
    const scrollContent = scrollRef.value;
    if (!scrollContent) return;

    const scrollTop = scrollContent.scrollTop;
    const sections = ['chart-section', 'project-section', 'developer-section', 'insights-section'];
    let current = 'chart-section';

    for (const id of sections) {
        const el = document.getElementById(id);
        if (el) {
            // Check if section is at least partially in view at the top works better with some offset
            const offset = id === 'chart-section' ? 0 : el.offsetTop - 100;
            if (scrollTop >= offset) {
                current = id;
            }
        }
    }
    activeSection.value = current;
    
    updateFloatingHeader();
};

// --- Sticky Header Logic ---
let currentActiveHeader = null;
let activeHeaderId = null;
let currentActiveWrapper = null;
let wrapperListeners = [];

function getOffsetTop(el) {
    const scrollContent = scrollRef.value;
    const containerRect = scrollContent.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    return elRect.top - containerRect.top + scrollContent.scrollTop;
}

function syncWidths(activeHeader, activeTable, cloneHeader) {
    if (!activeHeader || !cloneHeader || !activeTable) return;

    const sourceCells = activeHeader.querySelectorAll('th');
    const targetCells = cloneHeader.querySelectorAll('th');

    // Force the cloned table to match scrollWidth
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

function setFloatingHeader(activeHeader, activeTable, activeWrapper) {
    const floatingHeader = floatingHeaderRef.value;
    if (!floatingHeader) return;

    const headerId = activeHeader.id;
    const inner = floatingHeader.querySelector('.floating-header-inner');

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

    // Bidirectional scroll sync
    const onInnerScroll = () => {
         const wrapper = currentActiveWrapper;
         if (wrapper && Math.abs(wrapper.scrollLeft - newInner.scrollLeft) > 1) {
             wrapper.scrollLeft = newInner.scrollLeft;
         }
    };
    newInner.addEventListener('scroll', onInnerScroll);

    activeHeaderId = headerId;
    currentActiveWrapper = activeWrapper;
}

function clearFloatingHeader() {
    const floatingHeader = floatingHeaderRef.value;
    if (floatingHeader && floatingHeader.classList.contains('active')) {
         floatingHeader.classList.remove('active');
         floatingHeader.innerHTML = '';
         activeHeaderId = null;
         currentActiveWrapper = null;
    }
}

function updateFloatingHeader() {
    const scrollContent = scrollRef.value;
    if (!scrollContent) return;

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
        currentActiveHeader = projectThead;
    }
    // Check if we are inside developer table
    else if (scrollTop >= developerTop && scrollTop < developerBottom - headerHeight) {
        setFloatingHeader(developerThead, developerTable, developerTable.parentElement);
        currentActiveHeader = developerThead;
    }
    else {
        clearFloatingHeader();
        currentActiveHeader = null;
    }
}

const attachWrapperListener = (tableId) => {
    const table = document.getElementById(tableId);
    if (table && table.parentElement) {
        const wrapper = table.parentElement;
        const floatingHeader = floatingHeaderRef.value;

        const onScroll = () => {
            const inner = floatingHeader?.querySelector('.floating-header-inner');
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

onMounted(() => {
    const scrollContent = scrollRef.value;
    if (scrollContent) {
        scrollContent.addEventListener('scroll', handleScroll);
    }
    window.addEventListener('resize', updateFloatingHeader);

    // Initial listener attach
    setTimeout(() => {
        attachWrapperListener('project-table');
        attachWrapperListener('developer-table');
        updateFloatingHeader();
    }, 400);
});

onUnmounted(() => {
    const scrollContent = scrollRef.value;
    if (scrollContent) {
        scrollContent.removeEventListener('scroll', handleScroll);
    }
    window.removeEventListener('resize', updateFloatingHeader);
    wrapperListeners.forEach(({ el, fn }) => el.removeEventListener('scroll', fn));
});

// Watch filteredData to re-sync headers if content changes
watch(filteredData, () => {
     setTimeout(updateFloatingHeader, 100);
});
</script>

<template>
    <div class="w-full h-full flex flex-col relative">
        <ChartSection v-if="chartVisible" />
        
        <div id="scroll-content" ref="scrollRef" class="flex-1 overflow-y-auto relative bg-slate-950">
            <div id="floating-header" ref="floatingHeaderRef" class="floating-sticky-header"></div>
            <ProjectSection />
            <DeveloperSection />
            <InsightsSection />
            <Footer />
            <FloatingNav :activeSection="activeSection" />
        </div>
    </div>
</template>

<style>
/* Ensure floating header styles are available if not global */
.floating-sticky-header {
    position: sticky;
    top: 0;
    z-index: 50;
    width: 100%;
    pointer-events: none; /* Allow clicks to pass through to underlying if needed, but headers usually non-interactive ex sorting */
}
.floating-sticky-header.active {
    pointer-events: auto;
}
.floating-header-inner {
    overflow: hidden; /* Hide scrollbars for the floating header */
    background-color: #1e293b; /* slate-800 */
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
</style>
