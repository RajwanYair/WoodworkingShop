import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: ['tests/engine/dimensions.test.ts', 'tests/utils/bom-export.test.ts'],
  },
});
