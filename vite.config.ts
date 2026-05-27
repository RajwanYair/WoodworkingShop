import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import { sriPlugin } from './scripts/vite-plugin-sri';

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string };

/**
 * Phase 12 / Sprint 15 — Cloudflare Web Analytics beacon injection.
 * When `VITE_CF_ANALYTICS_TOKEN` is set at build time, injects the
 * privacy-first beacon script (no cookies, no PII) before </body>.
 */
function cloudflareAnalyticsPlugin() {
  const token = process.env['VITE_CF_ANALYTICS_TOKEN'];
  if (!token) return null;
  return {
    name: 'cf-analytics-inject',
    transformIndexHtml(html: string) {
      const snippet = `\n    <!-- Cloudflare Web Analytics (Phase 12 / Sprint 15) — no cookies, no PII -->\n    <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${token}"}'></script>`;
      return html.replace('</body>', `${snippet}\n  </body>`);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  cacheDir: resolve(os.tmpdir(), 'WoodworkingShop', '.vite_cache'),
  base: '/WoodworkingShop/',
  plugins: [
    react(),
    tailwindcss(),
    cloudflareAnalyticsPlugin(),
    sriPlugin(),
    VitePWA({
      registerType: 'prompt',
      strategies: 'generateSW',
      base: '/WoodworkingShop/',
      injectRegister: false, // handled manually in useSwUpdate / main.tsx
      manifest: false, // keep the existing public/manifest.json
      workbox: {
        // Explicit opt-outs — never auto-activate the new SW or claim clients
        // without the user clicking "Update now" in the SwUpdateBanner.
        skipWaiting: false,
        clientsClaim: false,
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/WoodworkingShop/index.html',
        navigateFallbackDenylist: [/^\/WoodworkingShop\/api\//],
        // Sprint 149 — offline fallback for navigation requests when cache is empty
        offlineGoogleAnalytics: false,
        runtimeCaching: [
          {
            // Cache Google Fonts stylesheets
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            // Cache Google Fonts files
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            // Sprint 149 — cache CDN assets (cdnjs) with SWR for offline resilience
            urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'cdn-assets',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Sprint 149 — cache locale JSON files for offline i18n
            urlPattern: ({ url }: { url: URL }) =>
              url.pathname.startsWith('/WoodworkingShop/') && url.pathname.endsWith('.json'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'app-json-data',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            // Sprint 149 — cache app images/SVGs for offline use
            urlPattern: ({ url }: { url: URL }) =>
              url.pathname.startsWith('/WoodworkingShop/') && /\.(?:png|jpg|svg|webp)$/i.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'app-images',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
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
        // Sprint 63 — consolidated chunk strategy:
        //   pdf-renderer : lazily-imported 300 KB PDF engine — own chunk for deferred loading.
        //   i18n-vendor  : i18next + react-i18next — stable, cached separately from app code.
        //   vendor       : React + React-DOM + Zustand — small combined chunk; rarely changes
        //                  together with app code, benefits from long-term browser caching.
        //                  (react-vendor and state-vendor merged here — fewer chunk files.)
        //
        // Phase 18 prep: when Three.js is added, add:
        //   if (id.includes('three')) return 'three-vendor';
        manualChunks: (id) => {
          if (id.includes('@react-pdf/renderer')) return 'pdf-renderer';
          if (id.includes('/i18next') || id.includes('/react-i18next')) return 'i18n-vendor';
          if (id.includes('/react-dom/') || id.includes('/node_modules/react/') || id.includes('/zustand'))
            return 'vendor';
          // Sprint 140 — defer parse cost of heavy optimizer engine to OptimizerView lazy chunk
          if (id.includes('/cut-optimizer') || id.includes('/smart-optimizer') || id.includes('/assembly-dag'))
            return 'engine-optimizer';
        },
      },
    },
  },
});
