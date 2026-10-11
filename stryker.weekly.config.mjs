import baseConfig from './stryker.config.mjs';

export default {
  ...baseConfig,
  mutate: ['src/engine/dimensions.ts', 'src/utils/bom-export.ts'],
  testFiles: ['tests/engine/dimensions.test.ts', 'tests/utils/bom-export.test.ts'],
  thresholds: {
    ...baseConfig.thresholds,
    break: 79,
  },
};
