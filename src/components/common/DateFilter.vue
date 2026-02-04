<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { startDate, endDate, setDateRange, rawData } from '@/store';
import { getMonths } from '@/utils/parser';
import AirDatepicker from 'air-datepicker';
import localeEn from 'air-datepicker/locale/en';
import 'air-datepicker/air-datepicker.css';

const props = defineProps(['onClose']);
const emit = defineEmits(['close']);

const startPickerRef = ref(null);
const endPickerRef = ref(null);
const startDatepicker = ref(null);
const endDatepicker = ref(null);

const localStart = ref(startDate.value || '');
const localEnd = ref(endDate.value || '');

// Get available months
const availableMonths = getMonths(rawData.value);
const minMonth = availableMonths.length > 0 ? availableMonths[0] : null;
const maxMonth = availableMonths.length > 0 ? availableMonths[availableMonths.length - 1] : null;

onMounted(() => {
    const minDate = minMonth ? new Date(parseInt(minMonth.split('-')[0]), parseInt(minMonth.split('-')[1]) - 1, 1) : null;
    const dataMaxDate = maxMonth ? new Date(parseInt(maxMonth.split('-')[0]), parseInt(maxMonth.split('-')[1]) - 1, 1) : null;
    const now = new Date();
    const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const maxDate = dataMaxDate && dataMaxDate > currentMonthDate ? dataMaxDate : currentMonthDate;

    // Extend locale
    const locale = {
        ...localeEn,
        dateFormat: 'yyyy-MM',
    };

    // Initialize Start Picker
    if (startPickerRef.value) {
        startDatepicker.value = new AirDatepicker(startPickerRef.value, {
            locale: locale,
            view: 'months',
            minView: 'months',
            container: 'body', // Keep this or adjust based on positioning needs
            dateFormat: 'yyyy-MM',
            autoClose: true,
            position: 'bottom center',
            classes: 'dark-datepicker',
            minDate: minDate,
            maxDate: localEnd.value ? new Date(parseInt(localEnd.value.split('-')[0]), parseInt(localEnd.value.split('-')[1]) - 1, 1) : maxDate,
            onSelect: ({ date }) => {
                if (date) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const newStart = `${year}-${month}`;
                    localStart.value = newStart;

                    if (endDatepicker.value) {
                        endDatepicker.value.update({
                            minDate: date
                        });
                    }
                } else {
                    localStart.value = '';
                    if (endDatepicker.value) {
                        endDatepicker.value.update({
                            minDate: minDate
                        });
                    }
                }
            }
        });

        if (localStart.value) {
            const [y, m] = localStart.value.split('-');
            startDatepicker.value.selectDate(new Date(parseInt(y), parseInt(m) - 1, 1));
        }
    }

    // Initialize End Picker
    if (endPickerRef.value) {
        endDatepicker.value = new AirDatepicker(endPickerRef.value, {
            locale: locale,
            view: 'months',
            minView: 'months',
            container: 'body',
            dateFormat: 'yyyy-MM',
            autoClose: true,
            position: 'bottom center',
            classes: 'dark-datepicker',
            minDate: localStart.value ? new Date(parseInt(localStart.value.split('-')[0]), parseInt(localStart.value.split('-')[1]) - 1, 1) : minDate,
            maxDate: maxDate,
            onSelect: ({ date }) => {
                if (date) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const newEnd = `${year}-${month}`;
                    localEnd.value = newEnd;

                    if (startDatepicker.value) {
                        startDatepicker.value.update({
                            maxDate: date
                        });
                    }
                } else {
                    localEnd.value = '';
                    if (startDatepicker.value) {
                        startDatepicker.value.update({
                            maxDate: maxDate
                        });
                    }
                }
            }
        });

        if (localEnd.value) {
            const [y, m] = localEnd.value.split('-');
            endDatepicker.value.selectDate(new Date(parseInt(y), parseInt(m) - 1, 1));
        }
    }
});

onUnmounted(() => {
    if (startDatepicker.value) startDatepicker.value.destroy();
    if (endDatepicker.value) endDatepicker.value.destroy();
});

const handleApply = () => {
    setDateRange(localStart.value || null, localEnd.value || null);
    emit('close');
};

const handleReset = () => {
    localStart.value = '';
    localEnd.value = '';
    if (startDatepicker.value) startDatepicker.value.clear();
    if (endDatepicker.value) endDatepicker.value.clear();
    setDateRange(null, null);
    emit('close');
};

const handleSetAll = () => {
    if (minMonth && maxMonth) {
        localStart.value = minMonth;
        localEnd.value = maxMonth;

        const [sy, sm] = minMonth.split('-');
        const [ey, em] = maxMonth.split('-');

        if (startDatepicker.value) {
            startDatepicker.value.selectDate(new Date(parseInt(sy), parseInt(sm) - 1, 1));
        }
        if (endDatepicker.value) {
            endDatepicker.value.selectDate(new Date(parseInt(ey), parseInt(em) - 1, 1));
        }
    }
};

const onCancel = () => {
    emit('close');
};
</script>

<template>
    <div class="absolute top-full left-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
        <div class="p-4 border-b border-slate-800">
            <h3 class="text-sm font-bold text-slate-100 flex items-center gap-2">
                <i class="ph ph-calendar text-blue-400"></i>
                Date Range Filter
            </h3>
            <p class="text-[10px] text-slate-500 mt-1">
                Data spans: {{ minMonth || 'N/A' }} → {{ maxMonth || 'N/A' }}
            </p>
        </div>

        <div class="p-4 space-y-4">
            <div class="grid grid-cols-2 gap-3">
                <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">From</label>
                    <input 
                        ref="startPickerRef"
                        type="text"
                        placeholder="Start Month"
                        :value="localStart"
                        class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 cursor-pointer"
                        readonly
                    />
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">To</label>
                    <input 
                        ref="endPickerRef"
                        type="text"
                        placeholder="End Month"
                        :value="localEnd"
                        class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 cursor-pointer"
                        readonly
                    />
                </div>
            </div>

            <div class="flex gap-2">
                <button 
                    @click="handleSetAll"
                    class="flex-1 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
                >
                    Select All
                </button>
                <button 
                    @click="handleReset"
                    class="flex-1 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
                >
                    Reset
                </button>
            </div>
        </div>

        <div class="p-4 bg-slate-800/50 border-t border-slate-800 flex justify-end gap-2">
            <button 
                @click="onCancel"
                class="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
                Cancel
            </button>
            <button 
                @click="handleApply"
                class="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
            >
                Apply Filter
            </button>
        </div>
    </div>
</template>

<style>
/* Ensure air datepicker dark theme styles work if not globally included */
.dark-datepicker {
    --adp-background-color: #0f172a;
    --adp-color: #e2e8f0;
    --adp-color-secondary: #64748b;
    --adp-border-color: #1e293b;
    --adp-border-radius: 12px;
    --adp-cell-background-color-selected: #3b82f6;
    --adp-cell-background-color-selected-hover: #2563eb;
    --adp-day-name-color: #64748b;
    z-index: 1000 !important;
}
</style>
