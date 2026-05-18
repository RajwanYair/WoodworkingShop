import { defineConfig, devices } from '@playwright/test';
import os from 'os';
import path from 'path';

const tmpDir = path.join(os.tmpdir(), 'WoodworkingShop');

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
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: path.join(tmpDir, 'playwright-report') }]]
    : [['list'], ['html', { open: 'never', outputFolder: path.join(tmpDir, 'playwright-report') }]],
  use: {
    // In CI: preview server serves the pre-built dist on port 4173.
    // Locally: dev server on port 5173.
    baseURL: process.env.CI ? 'http://localhost:4173/WoodworkingShop/' : 'http://localhost:5173/WoodworkingShop/',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: {
    // CI: serve the pre-built dist artifact via `vite preview` (no rebuild needed).
    // Local: use the hot-reload dev server.
    command: process.env.CI ? 'npm run preview -- --port 4173 --strictPort' : 'npm run dev',
    url: process.env.CI ? 'http://localhost:4173/WoodworkingShop/' : 'http://localhost:5173/WoodworkingShop/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
