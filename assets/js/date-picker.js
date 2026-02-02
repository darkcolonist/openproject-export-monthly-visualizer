window.App = window.App || {};

// Manual English Locale for Air Datepicker to avoid extra network requests
App.utils.enLocale = {
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    daysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    daysMin: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    today: 'Today',
    clear: 'Clear',
    dateFormat: 'MM/dd/yyyy',
    timeFormat: 'hh:mm aa',
    firstDay: 0
};

App.showDateFilterModal = function () {
    const jsonData = App.state.rawJsonData;
    if (!jsonData) return;

    // Create Modal Overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    // Create Modal Container
    const container = document.createElement('div');
    container.className = 'modal-container w-[368px] overflow-visible bg-slate-900 border-slate-700 shadow-2xl';
    container.innerHTML = `
        <div class="modal-header border-slate-800">
            <h3 class="text-lg font-bold text-slate-100 flex items-center gap-2">
                <i class="ph ph-calendar-plus text-blue-400"></i> Select Date Range
            </h3>
            <button class="text-slate-400 hover:text-white transition-colors" onclick="this.closest('.modal-overlay').remove()">
                <i class="ph ph-x text-xl"></i>
            </button>
        </div>
        <div class="modal-content p-6 flex flex-col items-center">
            <div id="air-datepicker-container" class="w-full min-h-[250px]"></div>
            
            <div id="selected-range-preview" class="mt-4 w-full p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 text-center">
                <span class="text-xs text-slate-500 uppercase font-bold tracking-widest block mb-1">Preview</span>
                <span id="preview-text" class="text-sm text-slate-300 font-medium italic">Select two months to define a range</span>
            </div>
        </div>
        <div class="modal-footer border-slate-800 flex gap-3">
            <button id="modal-clear-btn" class="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-xl text-sm font-medium transition-all">
                Show Everything
            </button>
            <button id="modal-apply-btn" class="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-900/20 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed" disabled>
                Apply Range
            </button>
        </div>
    `;

    overlay.appendChild(container);
    document.body.appendChild(overlay);

    const applyBtn = container.querySelector('#modal-apply-btn');
    const clearBtn = container.querySelector('#modal-clear-btn');
    const previewText = container.querySelector('#preview-text');

    // Get range boundaries from data
    const allMonths = [];
    jsonData.forEach(row => {
        const dateKey = Object.keys(row).find(k => k.trim().toLowerCase().includes('date'));
        let dateVal = row[dateKey];
        let d = null;
        if (typeof dateVal === 'number') {
            const dateObj = XLSX.SSF.parse_date_code(dateVal);
            d = new Date(dateObj.y, dateObj.m - 1, 1);
        } else {
            d = new Date(dateVal);
        }
        if (d && !isNaN(d)) {
            // Normalize to first day of month
            allMonths.push(new Date(d.getFullYear(), d.getMonth(), 1));
        }
    });

    const minDate = new Date(Math.min(...allMonths));
    const maxDate = new Date(Math.max(...allMonths));

    // Initialize Air Datepicker
    const datepicker = new AirDatepicker('#air-datepicker-container', {
        locale: App.utils.enLocale,
        view: 'months',
        minView: 'months',
        dateFormat: 'MMMM yyyy',
        range: true,
        multipleDatesSeparator: ' - ',
        selectedDates: (App.state.startDate && App.state.endDate) ? [
            new Date(App.state.startDate + '-01'),
            new Date(App.state.endDate + '-01')
        ] : [],
        minDate: minDate,
        maxDate: maxDate,
        onSelect({ date }) {
            const dates = Array.isArray(date) ? date : (date ? [date] : []);
            const formatted = (d) => d.toLocaleString('en-US', { month: 'short', year: 'numeric' });

            if (dates.length >= 1) {
                applyBtn.disabled = false;
                if (dates.length === 2) {
                    previewText.innerHTML = `<span class="text-blue-400 font-bold">${formatted(dates[0])}</span> <span class="text-slate-600">to</span> <span class="text-blue-400 font-bold">${formatted(dates[1])}</span>`;
                } else {
                    previewText.innerHTML = `Single month: <span class="text-blue-400 font-bold">${formatted(dates[0])}</span>`;
                }
                previewText.classList.remove('italic');
            } else {
                applyBtn.disabled = true;
                previewText.textContent = 'Select a month to define a range';
                previewText.classList.add('italic');
            }
        }
    });

    applyBtn.onclick = () => {
        const selected = datepicker.selectedDates;
        if (selected.length >= 1) {
            const sorted = [...selected].sort((a, b) => a - b);
            const formatDate = (d) => {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                return `${y}-${m}`;
            };

            App.state.startDate = formatDate(sorted[0]);
            App.state.endDate = formatDate(sorted[selected.length - 1]);
            overlay.remove();
            App.processAndRender();
        }
    };

    clearBtn.onclick = () => {
        App.state.startDate = null;
        App.state.endDate = null;
        overlay.remove();
        App.processAndRender();
    };

    const handleEsc = (e) => { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', handleEsc); } };
    document.addEventListener('keydown', handleEsc);
};

App.updateDateRangeDisplay = function () {
    const { dateRangeDisplay } = App.elements;
    if (!dateRangeDisplay) return;

    if (!App.state.startDate && !App.state.endDate) {
        dateRangeDisplay.textContent = 'Showing everything';
        dateRangeDisplay.classList.remove('text-blue-400');
        dateRangeDisplay.classList.add('text-slate-200');
    } else {
        const format = (key) => {
            if (!key) return '';
            const [y, m] = key.split('-');
            return new Date(y, m - 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
        };

        const startLabel = format(App.state.startDate);
        const endLabel = format(App.state.endDate);

        dateRangeDisplay.textContent = `${startLabel} - ${endLabel}`;
        dateRangeDisplay.classList.add('text-blue-400');
        dateRangeDisplay.classList.remove('text-slate-200');
    }
};
