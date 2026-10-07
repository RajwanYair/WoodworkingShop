import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import os from 'node:os';
import { sriPlugin } from './scripts/vite-plugin-sri.ts';

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string };
const capabilityReportRoot = resolve(os.tmpdir(), 'WoodworkingShop', 'capability-map');

function capabilityChunkManifestPlugin() {
  return {
    name: 'capability-chunk-manifest',
    buildStart() {
      mkdirSync(capabilityReportRoot, { recursive: true });
      writeFileSync(resolve(capabilityReportRoot, 'output-chunks.json'), '{}');
    },
    generateBundle(
      _options: unknown,
      bundle: Record<string, { type: string; fileName?: string; modules?: Record<string, unknown> }>,
    ) {
      const manifestPath = resolve(capabilityReportRoot, 'output-chunks.json');
      const outputChunks: Record<string, string> = existsSync(manifestPath)
        ? JSON.parse(readFileSync(manifestPath, 'utf8'))
        : {};
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk' || !output.modules) continue;
        for (const moduleId of Object.keys(output.modules)) {
          const normalizedId = moduleId.replaceAll('\\', '/');
          const sourcePath = normalizedId.slice(normalizedId.lastIndexOf('/src/') + 1);
          if (sourcePath.startsWith('src/') && output.fileName) outputChunks[resolve(sourcePath)] = output.fileName;
        }
      }
      mkdirSync(capabilityReportRoot, { recursive: true });
      writeFileSync(resolve(capabilityReportRoot, 'output-chunks.json'), JSON.stringify(outputChunks, null, 2));
    },
  };
}

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

function capabilityChunkPlugin() {
  return {
    name: 'capability-chunk-map',
    apply: 'build' as const,
    generateBundle(
      _options: unknown,
      bundle: Record<string, { type: string; fileName: string; modules?: Record<string, unknown> }>,
    ) {
      const chunks: Record<string, string[]> = {};
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue;
        for (const moduleId of Object.keys(output.modules ?? {})) {
          const cleanId = moduleId.split(/[?#]/, 1)[0];
          if (!cleanId) continue;
          const sourcePath = relative(process.cwd(), cleanId).replaceAll('\\', '/');
          if (!/^src\/(?:engine|utils|services)\//.test(sourcePath)) continue;
          const moduleChunks = chunks[sourcePath] ?? [];
          moduleChunks.push(output.fileName);
          chunks[sourcePath] = moduleChunks;
        }
      }
      const reportDirectory = resolve(os.tmpdir(), 'WoodworkingShop', 'capability-map');
      mkdirSync(reportDirectory, { recursive: true });
      writeFileSync(resolve(reportDirectory, 'chunks.json'), `${JSON.stringify(chunks, null, 2)}\n`);
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
    capabilityChunkManifestPlugin(),
    capabilityChunkPlugin(),
    cloudflareAnalyticsPlugin(),
    sriPlugin(),
    VitePWA({
      registerType: 'prompt',
      strategies: 'generateSW',
      base: '/WoodworkingShop/',
      injectRegister: false, // handled manually in useSwUpdate / main.tsx
      manifest: false, // keep the existing public/manifest.json
      includeManifestIcons: false, // preserve the explicit any/maskable icon declarations
      workbox: {
        // Explicit opt-outs — never auto-activate the new SW or claim clients
        // without the user clicking "Update now" in the SwUpdateBanner.
        skipWaiting: false,
        clientsClaim: false,
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['**/assets/PdfExportPanel-*.js'],
        navigateFallback: '/WoodworkingShop/index.html',
        navigateFallbackDenylist: [/^\/WoodworkingShop\/api\//],
        // Sprint 149 — offline fallback for navigation requests when cache is empty
        offlineGoogleAnalytics: false,
        runtimeCaching: [
          {
            urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith('/WoodworkingShop/assets/PdfExportPanel-'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'pdf-renderer',
              expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 * 365 },
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
      '@': resolve(import.meta.dirname, 'src'),
    },
  },
  build: {
    target: 'es2022',
    manifest: '.vite/manifest.json',
    chunkSizeWarningLimit: 1600,
    // v3.24.0: inject modulepreload polyfill for Safari < 16.4 compatibility
    modulePreload: {
      polyfill: true,
      resolveDependencies: (_filename, dependencies, { hostType }) =>
        hostType === 'html'
          ? dependencies.filter((dependency) => !dependency.includes('/pdf-renderer-'))
          : dependencies,
    },
    rolldownOptions: {
      output: {
        // Sprint 63 — consolidated chunk strategy:
        //   PDF export   : route-isolated; the renderer stays inside the lazy PDF panel chunk.
        //   i18n-vendor  : i18next + react-i18next — stable, cached separately from app code.
        //   vendor       : React + React-DOM + Zustand — small combined chunk; rarely changes
        //                  together with app code, benefits from long-term browser caching.
        //                  (react-vendor and state-vendor merged here — fewer chunk files.)
        //
        // Phase 18 prep: when Three.js is added, add:
        //   if (id.includes('three')) return 'three-vendor';
        codeSplitting: {
          groups: [
            {
              name: 'vendor',
              test: /node_modules[\\/](?:react|react-dom|zustand)(?:[\\/]|$)/,
              priority: 30,
            },
            {
              name: 'i18n-vendor',
              test: /node_modules[\\/](?:i18next|react-i18next)(?:[\\/]|$)/,
              priority: 20,
            },
            {
              name: 'pdf-renderer',
              test: /node_modules[\\/]@react-pdf[\\/]renderer(?:[\\/]|$)/,
              priority: 10,
            },
            {
              name: 'engine-optimizer',
              test: /[\\/](?:cut-optimizer|smart-optimizer|assembly-dag)[.\\/]/,
              priority: 5,
            },
          ],
        },
      },
    },
  },
});
