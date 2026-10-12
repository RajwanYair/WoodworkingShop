import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config.ts';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    name: 'components-browser',
    include: ['tests/components-browser/**/*.browser.test.tsx'],
    exclude: ['node_modules/**', 'dist/**'],
    setupFiles: [],
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
});
