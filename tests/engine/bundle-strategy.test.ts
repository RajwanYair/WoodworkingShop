import { describe, it, expect } from 'vitest';
import {
  CHUNK_NAMES,
  MODULE_CHUNK_DESCRIPTORS,
  BUNDLE_BUDGET,
  resolveChunkName,
  exceedsPerFileBudget,
  exceedsTotalJsBudget,
  getMissingChunks,
} from '../../src/engine/bundle-strategy';

describe('CHUNK_NAMES', () => {
  it('exposes the four expected chunk names', () => {
    expect(CHUNK_NAMES.PDF_RENDERER).toBe('pdf-renderer');
    expect(CHUNK_NAMES.I18N_VENDOR).toBe('i18n-vendor');
    expect(CHUNK_NAMES.VENDOR).toBe('vendor');
    expect(CHUNK_NAMES.ENGINE_OPTIMIZER).toBe('engine-optimizer');
  });
});

describe('MODULE_CHUNK_DESCRIPTORS', () => {
  it('has a descriptor for every CHUNK_NAMES value', () => {
    const covered = new Set(MODULE_CHUNK_DESCRIPTORS.map((d) => d.chunkName));
    for (const name of Object.values(CHUNK_NAMES)) {
      expect(covered.has(name), `Missing descriptor for chunk '${name}'`).toBe(true);
    }
  });

  it('every descriptor has at least one modulePattern', () => {
    for (const d of MODULE_CHUNK_DESCRIPTORS) {
      expect(d.modulePatterns.length, `${d.chunkName} has no patterns`).toBeGreaterThan(0);
    }
  });

  it('every gzipHintKB is a positive number', () => {
    for (const d of MODULE_CHUNK_DESCRIPTORS) {
      expect(d.gzipHintKB, `${d.chunkName} gzipHintKB must be > 0`).toBeGreaterThan(0);
    }
  });
});

describe('BUNDLE_BUDGET', () => {
  it('has positive budget values', () => {
    expect(BUNDLE_BUDGET.totalJsKB).toBeGreaterThan(0);
    expect(BUNDLE_BUDGET.totalCssKB).toBeGreaterThan(0);
    expect(BUNDLE_BUDGET.totalAllKB).toBeGreaterThan(BUNDLE_BUDGET.totalJsKB);
    expect(BUNDLE_BUDGET.perFileDefaultKB).toBeGreaterThan(0);
    expect(BUNDLE_BUDGET.perFilePdfKB).toBeGreaterThan(BUNDLE_BUDGET.perFileDefaultKB);
  });
});

describe('resolveChunkName', () => {
  it.each([
    ['node_modules/@react-pdf/renderer/index.js', 'pdf-renderer'],
    ['/node_modules/i18next/dist/cjs/i18next.js', 'i18n-vendor'],
    ['/node_modules/react-i18next/index.js', 'i18n-vendor'],
    ['/node_modules/react-dom/index.js', 'vendor'],
    ['/node_modules/react/', 'vendor'],
    ['/node_modules/zustand/index.js', 'vendor'],
    ['src/engine/cut-optimizer.ts', 'engine-optimizer'],
    ['src/engine/smart-optimizer.ts', 'engine-optimizer'],
    ['src/engine/assembly-dag.ts', 'engine-optimizer'],
  ])('maps %s → %s', (moduleId, expected) => {
    expect(resolveChunkName(moduleId)).toBe(expected);
  });

  it.each([['src/engine/parts.ts'], ['src/components/App.tsx'], ['/node_modules/some-other-lib/index.js'], ['']])(
    'returns undefined for %s (default chunk)',
    (moduleId) => {
      expect(resolveChunkName(moduleId)).toBeUndefined();
    },
  );

  it('first matching descriptor wins', () => {
    // A hypothetical id matching both i18next and react-i18next patterns
    // — should resolve to i18n-vendor from the first match
    const id = '/node_modules/react-i18next/dist/react-i18next.js';
    expect(resolveChunkName(id)).toBe('i18n-vendor');
  });
});

describe('exceedsPerFileBudget', () => {
  it.each([
    [499, 'vendor', false],
    [500, 'vendor', false],
    [501, 'vendor', true],
    [1599, 'pdf-renderer', false],
    [1600, 'pdf-renderer', false],
    [1601, 'pdf-renderer', true],
    [200, 'engine-optimizer', false],
    [501, 'engine-optimizer', true],
  ])('(%dKB, %s) → %s', (fileSizeKB, chunkName, expected) => {
    expect(exceedsPerFileBudget(fileSizeKB, chunkName)).toBe(expected);
  });

  it('accepts a custom budget override', () => {
    const customBudget = { ...BUNDLE_BUDGET, perFileDefaultKB: 100 };
    expect(exceedsPerFileBudget(101, 'vendor', customBudget)).toBe(true);
    expect(exceedsPerFileBudget(100, 'vendor', customBudget)).toBe(false);
  });
});

describe('exceedsTotalJsBudget', () => {
  it.each([
    [2399, false],
    [2400, false],
    [2401, true],
  ])('%dKB → %s', (totalJsKB, expected) => {
    expect(exceedsTotalJsBudget(totalJsKB)).toBe(expected);
  });

  it('accepts a custom budget override', () => {
    const customBudget = { ...BUNDLE_BUDGET, totalJsKB: 1000 };
    expect(exceedsTotalJsBudget(1001, customBudget)).toBe(true);
    expect(exceedsTotalJsBudget(1000, customBudget)).toBe(false);
  });
});

describe('getMissingChunks', () => {
  it('returns empty when all chunk names are present', () => {
    const allNames = MODULE_CHUNK_DESCRIPTORS.map((d) => d.chunkName);
    expect(getMissingChunks(allNames)).toHaveLength(0);
  });

  it('returns descriptors for absent chunks', () => {
    const result = getMissingChunks(['vendor', 'i18n-vendor']);
    const missingNames = result.map((d) => d.chunkName);
    expect(missingNames).toContain('pdf-renderer');
    expect(missingNames).toContain('engine-optimizer');
    expect(missingNames).not.toContain('vendor');
    expect(missingNames).not.toContain('i18n-vendor');
  });

  it('returns all descriptors when output list is empty', () => {
    expect(getMissingChunks([])).toHaveLength(MODULE_CHUNK_DESCRIPTORS.length);
  });
});
