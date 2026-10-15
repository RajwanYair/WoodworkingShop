export const COVERAGE_AREA_DIRECTORIES: {
  readonly engine: readonly ['engine'];
  readonly utils: readonly ['utils'];
  readonly store: readonly ['store'];
  readonly hooks: readonly ['hooks'];
  readonly components: readonly ['app', 'features', 'ui'];
};

export function coverageAreaForDirectory(
  directory: string,
): 'engine' | 'utils' | 'store' | 'hooks' | 'components' | null;
