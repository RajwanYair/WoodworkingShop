import { defineConfig, devices } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';

const tmpDir = path.join(os.tmpdir(), 'WoodworkingShop');
const previewDist = process.env['WOODWORKINGSHOP_E2E_DIST_DIR'] ?? 'dist';
const previewPort = process.env['WOODWORKINGSHOP_E2E_PORT'] ?? '4173';
const previewUrl = `http://localhost:${previewPort}/WoodworkingShop/`;

/**
 * Playwright E2E config for user journeys, browser compatibility, accessibility,
 * downloads, offline behavior, and visual acceptance. Pure logic stays in Vitest.
 */
export default defineConfig({
  testDir: './tests/e2e',
  outputDir: path.join(tmpDir, 'test-results'),
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  updateSnapshots: process.env.CI ? 'none' : 'missing',
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? // Shards emit mergeable results; the GitHub reporter posts annotations directly to the PR.
      [['github'], ['blob', { outputDir: path.join(tmpDir, 'blob-report') }]]
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
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, grepInvert: /@chromium-only|@visual/ },
    {
      name: 'webkit-desktop',
      use: { ...devices['Desktop Safari'] },
      grep: /@preview-acceptance/,
      grepInvert: /@chromium-only|@visual/,
    },
    {
      name: 'webkit-mobile',
      use: { ...devices['iPhone 13'] },
      grep: /@preview-acceptance/,
      grepInvert: /@chromium-only|@visual/,
    },
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
