import { ref, reactive } from 'vue';

const toasts = ref([]);

export const toast = {
    toasts,

    show(message, type = 'info', duration = 3000) {
        const id = Date.now() + Math.random();
        const toastItem = {
            id,
            message,
            type, // 'success', 'error', 'info', 'warning'
            duration
        };

        toasts.value.push(toastItem);

        if (duration > 0) {
            setTimeout(() => {
                this.remove(id);
            }, duration);
        }

        return id;
    },

    success(message, duration) {
        return this.show(message, 'success', duration);
    },

    error(message, duration) {
        return this.show(message, 'error', duration);
    },

    info(message, duration) {
        return this.show(message, 'info', duration);
    },

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    },

    remove(id) {
        const index = toasts.value.findIndex(t => t.id === id);
        if (index > -1) {
            toasts.value.splice(index, 1);
        }
    }
};
