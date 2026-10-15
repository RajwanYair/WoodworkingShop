import { describe, expect, it } from 'vitest';
import { coverageAreaForDirectory } from '../../scripts/coverage-ratchet.js';
import { COVERAGE_OWNERS, coverageOwner } from '../../scripts/test-coverage-map.js';

describe('coverage ownership', () => {
  it('inventories the feature-sliced UI owners instead of src/components', () => {
    expect(COVERAGE_OWNERS).toEqual(['engine', 'utils', 'store', 'hooks', 'app', 'features', 'ui']);
    expect(COVERAGE_OWNERS).not.toContain('components');
  });

  it.each([
    ['src/app/Header.tsx', 'app'],
    ['src/features/preview/PreviewPanel.tsx', 'features'],
    ['src/ui/Icons.tsx', 'ui'],
    ['src/engine/core/types.ts', 'engine'],
    ['src/utils/route-table.ts', 'utils'],
    ['src/store/slices/uiSlice.ts', 'store'],
    ['src/hooks/useFocusTrap.ts', 'hooks'],
  ])('assigns %s to %s', (sourcePath, owner) => {
    expect(coverageOwner(sourcePath)).toBe(owner);
  });

  it.each(['src/components/Header.tsx', 'components/Header.tsx', 'src/platform/storage.ts'])(
    'does not assign an inventory owner to %s',
    (sourcePath) => {
      expect(coverageOwner(sourcePath)).toBeNull();
    },
  );

  it.each([
    ['app', 'components'],
    ['features', 'components'],
    ['ui', 'components'],
    ['engine', 'engine'],
    ['utils', 'utils'],
    ['store', 'store'],
    ['hooks', 'hooks'],
  ])('keeps the %s coverage floor under %s', (directory, area) => {
    expect(coverageAreaForDirectory(directory)).toBe(area);
  });

  it('does not keep a coverage floor for the removed components directory', () => {
    expect(coverageAreaForDirectory('components')).toBeNull();
  });
});
