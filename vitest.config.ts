import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string };
const tmpDir = path.join(os.tmpdir(), 'WoodworkingShop');

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  resolve: {
    alias: {
      // Stub the vite-plugin-pwa virtual module so components importing it
      // can be tested without the full Vite build pipeline.
      'virtual:pwa-register': path.resolve(__dirname, 'tests/__mocks__/virtual-pwa-register.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: path.join(tmpDir, 'coverage'),
      include: ['src/engine/**', 'src/utils/**', 'src/store/**', 'src/hooks/**'],
      exclude: ['src/engine/types.ts', 'src/engine/index.ts', 'src/utils/download.ts', 'src/hooks/useTouchGestures.ts'],
      thresholds: {
        statements: 85,
        branches: 78,
        functions: 83,
        lines: 85,
      },
    },
  },
});
