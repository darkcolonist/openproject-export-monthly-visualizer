<script setup>
defineProps({
    text: {
        type: String,
        default: 'Processing...'
    }
});
</script>

<template>
    <div class="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/50 backdrop-blur-[2px]">
        <div class="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4">
            <div class="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
            <p class="text-sm font-medium text-slate-200">{{ text }}</p>
        </div>
    </div>
</template>
