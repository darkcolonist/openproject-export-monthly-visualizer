<script setup>
import { toast } from '@/utils/toast';

const removeToast = (id) => {
    toast.remove(id);
};

const getIcon = (type) => {
    switch (type) {
        case 'success': return 'ph-check-circle';
        case 'error': return 'ph-x-circle';
        case 'warning': return 'ph-warning-circle';
        default: return 'ph-info';
    }
};

const getTypeClass = (type) => {
    switch (type) {
        case 'success': return 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400';
        case 'error': return 'bg-red-500/10 border-red-500/50 text-red-400';
        case 'warning': return 'bg-amber-500/10 border-amber-500/50 text-amber-400';
        default: return 'bg-blue-500/10 border-blue-500/50 text-blue-400';
    }
};
</script>

<template>
    <div class="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-3 pointer-events-none w-full max-w-sm px-4">
        <TransitionGroup name="toast">
            <div 
                v-for="item in toast.toasts.value" 
                :key="item.id"
                class="pointer-events-auto w-full"
            >
                <div 
                    :class="[
                        'flex items-center gap-3 p-4 rounded-xl border backdrop-blur-md shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300',
                        getTypeClass(item.type)
                    ]"
                >
                    <i :class="['ph text-xl shrink-0', getIcon(item.type)]"></i>
                    <p class="text-sm font-medium flex-1">{{ item.message }}</p>
                    <button @click="removeToast(item.id)" class="hover:opacity-70 transition-opacity">
                        <i class="ph ph-x text-lg"></i>
                    </button>
                </div>
            </div>
        </TransitionGroup>
    </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}
</style>
