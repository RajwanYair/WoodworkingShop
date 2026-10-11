import os from 'node:os';
import path from 'node:path';
import config from './vitest.config.ts';

export default {
  ...config,
  test: {
    ...config.test,
    include: ['tests/components/**/*.test.ts', 'tests/components/**/*.test.tsx'],
    coverage: {
      ...config.test.coverage,
      include: ['src/components/**'],
      exclude: [],
      reportsDirectory: path.join(os.tmpdir(), 'WoodworkingShop', 'coverage-components'),
      thresholds: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0,
      },
    },
  },
};
