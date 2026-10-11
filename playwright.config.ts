import { defineConfig, devices } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';

const tmpDir = path.join(os.tmpdir(), 'WoodworkingShop');
const previewDist = process.env['WOODWORKINGSHOP_E2E_DIST_DIR'] ?? 'dist';
const previewPort = process.env['WOODWORKINGSHOP_E2E_PORT'] ?? '4173';
const physicalCameraEnabled = process.env['WOODWORKINGSHOP_PHYSICAL_CAMERA'] === '1';
const previewUrl = `http://localhost:${previewPort}/WoodworkingShop/`;

/**
 * Playwright E2E config for WoodworkingShop SPA.
 * Smoke-tests only — assert the app boots, key UI surfaces render, and no
 * console errors / a11y violations leak through. Unit-level behaviour is
 * covered by Vitest under `tests/`.
 */
export default defineConfig({
  testDir: './tests/e2e',
  outputDir: path.join(tmpDir, 'test-results'),
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  updateSnapshots: 'missing',
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? // In CI: write the HTML report to the workspace so actions/upload-artifact can find it.
      // The 'github' reporter posts annotations directly to the PR without a file.
      [['github'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : // Locally: keep the HTML report out of the workspace (avoid git noise).
      [['list'], ['html', { open: 'never', outputFolder: path.join(tmpDir, 'playwright-report') }]],
  use: {
    // In CI: preview server serves the pre-built dist on port 4173.
    // Locally: dev server on port 5173.
    baseURL: previewUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, grepInvert: /@physical-camera/ },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, grepInvert: /@physical-camera/ },
    {
      name: 'webkit-desktop',
      use: { ...devices['Desktop Safari'] },
      grep: /@preview-acceptance/,
    },
    {
      name: 'webkit-mobile',
      use: { ...devices['iPhone 13'] },
      grep: /@preview-acceptance/,
    },
    ...(physicalCameraEnabled
      ? [
          {
            name: 'chromium-physical-camera',
            use: { ...devices['Desktop Chrome'], headless: false },
            grep: /@physical-camera/,
          },
        ]
      : []),
  ],
  webServer: {
    // Match the deployed base path and exercise the production service worker locally.
    command: `npm run preview -- --outDir "${previewDist}" --port ${previewPort} --strictPort`,
    url: previewUrl,
    reuseExistingServer:
      !process.env['CI'] && !process.env['WOODWORKINGSHOP_E2E_DIST_DIR'] && !process.env['WOODWORKINGSHOP_E2E_PORT'],
    timeout: 60_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
