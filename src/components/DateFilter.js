/**
 * DateFilter Component
 * Month range picker using Air Datepicker
 */
import { h } from 'preact';
import { useRef, useEffect, useState } from 'preact/hooks';
import htm from 'htm';
import {
    startDate,
    endDate,
    setDateRange,
    rawData
} from 'app/store.js';
import { getMonths } from 'app/utils/parser.js';

const html = htm.bind(h);

export function DateFilter({ onClose }) {
    const startPickerRef = useRef(null);
    const endPickerRef = useRef(null);
    const startDatepickerRef = useRef(null);
    const endDatepickerRef = useRef(null);
    const [localStart, setLocalStart] = useState(startDate.value || '');
    const [localEnd, setLocalEnd] = useState(endDate.value || '');

    // Get available months from data
    const availableMonths = getMonths(rawData.value);
    const minMonth = availableMonths.length > 0 ? availableMonths[0] : null;
    const maxMonth = availableMonths.length > 0 ? availableMonths[availableMonths.length - 1] : null;

    useEffect(() => {
        const localeEn = {
            days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            daysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            daysMin: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
            months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
            monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            today: 'Today',
            clear: 'Clear',
            dateFormat: 'yyyy-MM',
            timeFormat: 'hh:mm aa',
            firstDay: 0
        };

        const minDate = minMonth ? new Date(parseInt(minMonth.split('-')[0]), parseInt(minMonth.split('-')[1]) - 1, 1) : null;
        const dataMaxDate = maxMonth ? new Date(parseInt(maxMonth.split('-')[0]), parseInt(maxMonth.split('-')[1]) - 1, 1) : null;
        const now = new Date();
        const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const maxDate = dataMaxDate && dataMaxDate > currentMonthDate ? dataMaxDate : currentMonthDate;

        // Initialize Air Datepicker for start date
        if (startPickerRef.current && !startDatepickerRef.current) {
            startDatepickerRef.current = new AirDatepicker(startPickerRef.current, {
                locale: localeEn,
                view: 'months',
                minView: 'months',
                container: 'body',
                dateFormat: 'yyyy-MM',
                autoClose: true,
                position: 'bottom center',
                classes: 'dark-datepicker',
                minDate: minDate,
                maxDate: localEnd ? new Date(parseInt(localEnd.split('-')[0]), parseInt(localEnd.split('-')[1]) - 1, 1) : maxDate,
                onSelect: ({ date }) => {
                    if (date) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const newStart = `${year}-${month}`;
                        setLocalStart(newStart);

                        // Update end picker's minDate
                        if (endDatepickerRef.current) {
                            endDatepickerRef.current.update({
                                minDate: date
                            });
                        }
                    } else {
                        setLocalStart('');
                        if (endDatepickerRef.current) {
                            endDatepickerRef.current.update({
                                minDate: minDate
                            });
                        }
                    }
                }
            });

            // Set initial value if exists
            if (localStart) {
                const [y, m] = localStart.split('-');
                startDatepickerRef.current.selectDate(new Date(parseInt(y), parseInt(m) - 1, 1));
            }
        }

        // Initialize Air Datepicker for end date
        if (endPickerRef.current && !endDatepickerRef.current) {
            endDatepickerRef.current = new AirDatepicker(endPickerRef.current, {
                locale: localeEn,
                view: 'months',
                minView: 'months',
                container: 'body',
                dateFormat: 'yyyy-MM',
                autoClose: true,
                position: 'bottom center',
                classes: 'dark-datepicker',
                minDate: localStart ? new Date(parseInt(localStart.split('-')[0]), parseInt(localStart.split('-')[1]) - 1, 1) : minDate,
                maxDate: maxDate,
                onSelect: ({ date }) => {
                    if (date) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const newEnd = `${year}-${month}`;
                        setLocalEnd(newEnd);

                        // Update start picker's maxDate
                        if (startDatepickerRef.current) {
                            startDatepickerRef.current.update({
                                maxDate: date
                            });
                        }
                    } else {
                        setLocalEnd('');
                        if (startDatepickerRef.current) {
                            startDatepickerRef.current.update({
                                maxDate: maxDate
                            });
                        }
                    }
                }
            });

            // Set initial value if exists
            if (localEnd) {
                const [y, m] = localEnd.split('-');
                endDatepickerRef.current.selectDate(new Date(parseInt(y), parseInt(m) - 1, 1));
            }
        }

        return () => {
            if (startDatepickerRef.current) {
                startDatepickerRef.current.destroy();
                startDatepickerRef.current = null;
            }
            if (endDatepickerRef.current) {
                endDatepickerRef.current.destroy();
                endDatepickerRef.current = null;
            }
        };
    }, []);

    const handleApply = () => {
        setDateRange(localStart || null, localEnd || null);
        if (onClose) onClose();
    };

    const handleReset = () => {
        setLocalStart('');
        setLocalEnd('');
        if (startDatepickerRef.current) startDatepickerRef.current.clear();
        if (endDatepickerRef.current) endDatepickerRef.current.clear();
        setDateRange(null, null);
        if (onClose) onClose();
    };

    const handleSetAll = () => {
        if (minMonth && maxMonth) {
            setLocalStart(minMonth);
            setLocalEnd(maxMonth);

            const [sy, sm] = minMonth.split('-');
            const [ey, em] = maxMonth.split('-');

            if (startDatepickerRef.current) {
                startDatepickerRef.current.selectDate(new Date(parseInt(sy), parseInt(sm) - 1, 1));
            }
            if (endDatepickerRef.current) {
                endDatepickerRef.current.selectDate(new Date(parseInt(ey), parseInt(em) - 1, 1));
            }
        }
    };

    return html`
        <div class="absolute top-full left-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div class="p-4 border-b border-slate-800">
                <h3 class="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <i class="ph ph-calendar text-blue-400"></i>
                    Date Range Filter
                </h3>
                <p class="text-[10px] text-slate-500 mt-1">
                    Data spans: ${minMonth || 'N/A'} → ${maxMonth || 'N/A'}
                </p>
            </div>

            <div class="p-4 space-y-4">
                <div class="grid grid-cols-2 gap-3">
                    <div class="flex flex-col gap-1">
                        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">From</label>
                        <input 
                            ref=${startPickerRef}
                            type="text"
                            placeholder="Start Month"
                            value=${localStart}
                            class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 cursor-pointer"
                            readonly
                        />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">To</label>
                        <input 
                            ref=${endPickerRef}
                            type="text"
                            placeholder="End Month"
                            value=${localEnd}
                            class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 cursor-pointer"
                            readonly
                        />
                    </div>
                </div>

                <div class="flex gap-2">
                    <button 
                        onclick=${handleSetAll}
                        class="flex-1 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
                    >
                        Select All
                    </button>
                    <button 
                        onclick=${handleReset}
                        class="flex-1 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
                    >
                        Reset
                    </button>
                </div>
            </div>

            <div class="p-4 bg-slate-800/50 border-t border-slate-800 flex justify-end gap-2">
                <button 
                    onclick=${onClose}
                    class="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                    Cancel
                </button>
                <button 
                    onclick=${handleApply}
                    class="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                >
                    Apply Filter
                </button>
            </div>
        </div>
    `;
}

export default DateFilter;
