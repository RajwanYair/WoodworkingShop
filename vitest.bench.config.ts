import { defineConfig } from 'vitest/config';
import os from 'node:os';
import path from 'node:path';

const tmpDir = path.join(os.tmpdir(), 'WoodworkingShop');

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/bench/**/*.bench.ts'],
    watch: false,
    benchmark: {
      outputJson: path.join(tmpDir, 'bench-results.json'),
      reporters: ['default'],
    },
  },
});
