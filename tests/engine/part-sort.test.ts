import { describe, it, expect } from 'vitest';
import { sortParts, sortPartsByPreset, invertSortCriteria, SORT_PRESETS } from '../../src/engine/part-sort';
import type { SortablePart } from '../../src/engine/part-sort';

function p(id: string, overrides: Partial<SortablePart> = {}): SortablePart {
  return {
    id,
    name: { en: `Part ${id}`, he: `חלק ${id}` },
    material: 'MDF 18mm',
    type: 'panel',
    zone: 'base',
    thicknessMm: 18,
    widthMm: 400,
    lengthMm: 720,
    quantity: 1,
    ...overrides,
  };
}

const PARTS: SortablePart[] = [
  p('1', { material: 'Plywood', lengthMm: 600 }),
  p('2', { material: 'MDF', lengthMm: 900 }),
  p('3', { material: 'MDF', lengthMm: 720 }),
  p('4', { material: 'Oak veneer', lengthMm: 300 }),
];

describe('sortParts — single key', () => {
  it('sorts by material asc', () => {
    const sorted = sortParts(PARTS, [{ key: 'material', dir: 'asc' }]);
    expect(sorted[0].material).toBe('MDF');
    expect(sorted[sorted.length - 1].material).toBe('Plywood');
  });

  it('sorts by length desc', () => {
    const sorted = sortParts(PARTS, [{ key: 'length', dir: 'desc' }]);
    expect(sorted[0].lengthMm).toBe(900);
    expect(sorted[sorted.length - 1].lengthMm).toBe(300);
  });
});

describe('sortParts — multi-key', () => {
  it('breaks ties with secondary key', () => {
    const sorted = sortParts(PARTS, [
      { key: 'material', dir: 'asc' },
      { key: 'length', dir: 'desc' },
    ]);
    // Both MDF parts should appear before Plywood; within MDF, longer first
    const mdfParts = sorted.filter((p) => p.material === 'MDF');
    expect(mdfParts[0].lengthMm).toBe(900);
    expect(mdfParts[1].lengthMm).toBe(720);
  });
});

describe('sortParts — does not mutate input', () => {
  it('returns a new array', () => {
    const input = [...PARTS];
    const sorted = sortParts(input, [{ key: 'length', dir: 'asc' }]);
    expect(sorted).not.toBe(input);
    expect(input).toEqual(PARTS); // unchanged
  });
});

describe('sortParts — empty', () => {
  it('returns empty for empty input', () => {
    expect(sortParts([], [{ key: 'name', dir: 'asc' }])).toHaveLength(0);
  });
});

describe('sortPartsByPreset', () => {
  it('applies material-then-length-desc preset', () => {
    const sorted = sortPartsByPreset(PARTS, 'material-then-length-desc');
    const mdfParts = sorted.filter((p) => p.material === 'MDF');
    expect(mdfParts[0].lengthMm).toBe(900);
  });

  it('applies name-asc preset', () => {
    const parts = [p('z', { name: { en: 'Zig', he: '' } }), p('a', { name: { en: 'Alpha', he: '' } })];
    const sorted = sortPartsByPreset(parts, 'name-asc');
    expect(sorted[0].name.en).toBe('Alpha');
  });
});

describe('SORT_PRESETS', () => {
  it('has all expected presets', () => {
    expect(SORT_PRESETS['material-then-length-desc']).toBeDefined();
    expect(SORT_PRESETS['type-then-length-desc']).toBeDefined();
    expect(SORT_PRESETS['thickness-desc-then-length-desc']).toBeDefined();
    expect(SORT_PRESETS['name-asc']).toBeDefined();
  });
});

describe('invertSortCriteria', () => {
  it('flips asc to desc and desc to asc', () => {
    const inverted = invertSortCriteria([
      { key: 'material', dir: 'asc' },
      { key: 'length', dir: 'desc' },
    ]);
    expect(inverted[0].dir).toBe('desc');
    expect(inverted[1].dir).toBe('asc');
  });
});
