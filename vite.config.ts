import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string };

// https://vite.dev/config/
export default defineConfig({
  base: '/WoodworkingShop/',
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
    // v3.24.0: inject modulepreload polyfill for Safari < 16.4 compatibility
    modulePreload: { polyfill: true },
    rollupOptions: {
      output: {
        // Rollup 4+ requires manualChunks as a function (object form removed)
        manualChunks: (id) => {
          if (id.includes('@react-pdf/renderer')) return 'pdf-renderer';
          if (id.includes('/react-dom/') || id.includes('/node_modules/react/')) return 'react-vendor';
          if (id.includes('/i18next') || id.includes('/react-i18next')) return 'i18n-vendor';
          if (id.includes('/zustand')) return 'state-vendor';
        },
      },
    },
  },
});
