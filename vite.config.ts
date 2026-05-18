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
        manualChunks: {
          // Heavy PDF renderer — rarely changes, keep in its own long-lived chunk
          'pdf-renderer': ['@react-pdf/renderer'],
          // React runtime — changes least often; maximises cache hit rate
          'react-vendor': ['react', 'react-dom', 'react-dom/client'],
          // i18n — separate so language changes don't bust React cache
          'i18n-vendor': ['i18next', 'react-i18next'],
          // State + router utilities
          'state-vendor': ['zustand'],
        },
      },
    },
  },
});
