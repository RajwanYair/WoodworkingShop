import { defineConfig } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';

const platformUrl = 'http://127.0.0.1:5187/WoodworkingShop/';

export default defineConfig({
  testDir: './tests/platform/browser',
  testMatch: '**/*.spec.ts',
  outputDir: path.join(os.tmpdir(), 'WoodworkingShop', 'platform-browser-results'),
  timeout: 15_000,
  expect: { timeout: 5_000 },
  reporter: 'list',
  use: {
    baseURL: platformUrl,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium-platform', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5187 --strictPort',
    url: platformUrl,
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
