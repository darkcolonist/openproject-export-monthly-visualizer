import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('exceljs')) {
              return 'vendor-exceljs';
            }
            if (id.includes('xlsx')) {
              return 'vendor-xlsx';
            }
            if (id.includes('chart.js')) {
              return 'vendor-charts';
            }
            if (id.includes('@phosphor-icons')) {
              return 'vendor-phosphor';
            }
            if (id.includes('air-datepicker')) {
              return 'vendor-datepicker';
            }
            return 'vendor'; // all other node_modules (vue, vue-router, etc.)
          }
        }
      }
    }
  },
  optimizeDeps: {
    entries: ['./index.html']
  }
})
