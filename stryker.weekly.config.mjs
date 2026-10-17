import baseConfig from './stryker.config.mjs';

export default {
  ...baseConfig,
  incremental: false,
  mutate: ['src/engine/geometry/dimensions.ts', 'src/utils/bom-export.ts'],
  vitest: {
    configFile: 'vitest.mutation.config.ts',
    related: false,
  },
  thresholds: {
    ...baseConfig.thresholds,
    break: 79,
  },
};
