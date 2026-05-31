import { describe, expect, it } from 'vitest';
import { optimizeWithMultiStock } from '../../src/engine/multi-stock-optimizer';
import type { Part } from '../../src/engine/types';

function part(overrides: Partial<Part> = {}): Part {
  return {
    id: 'P1',
    name: { en: 'Panel', he: 'פנל' },
    qty: 4,
    material: 'melamine-18',
    thickness: 18,
    length: 1000,
    width: 500,
    edgeBanding: { en: '', he: '' },
    ...overrides,
  };
}

describe('optimizeWithMultiStock', () => {
  it('selects the better candidate for a single material based on score', () => {
    const result = optimizeWithMultiStock(
      [part()],
      [
        { material: 'melamine-18', width: 1220, length: 1220, label: 'small' },
        { material: 'melamine-18', width: 2440, length: 1220, label: 'large' },
      ],
      4,
      'freeform',
    );

    expect(result.selections).toHaveLength(1);
    expect(result.selections[0]?.candidate.label).toBe('small');
    expect(result.result.totalSheets).toBeGreaterThan(0);
  });

  it('chooses candidates independently per material', () => {
    const parts: Part[] = [
      part({ id: 'P1', material: 'melamine-18', qty: 2, length: 900, width: 400 }),
      part({ id: 'P2', material: 'plywood-17', qty: 2, length: 900, width: 400 }),
    ];

    const result = optimizeWithMultiStock(parts, [
      { material: 'melamine-18', width: 1220, length: 1220, label: 'melamine-small' },
      { material: 'melamine-18', width: 2440, length: 1220, label: 'melamine-large' },
      { material: 'plywood-17', width: 1220, length: 1220, label: 'plywood-small' },
      { material: 'plywood-17', width: 2440, length: 1220, label: 'plywood-large' },
    ]);

    expect(result.selections).toHaveLength(2);
    expect(result.selections.map((s) => s.material).sort()).toEqual(['melamine-18', 'plywood-17']);
  });

  it('falls back to default stock when no candidates are provided for a material', () => {
    const result = optimizeWithMultiStock([part()], []);

    expect(result.selections).toHaveLength(1);
    expect(result.selections[0]?.candidate.label).toBe('default');
    expect(result.result.totalSheets).toBeGreaterThan(0);
  });

  it.each([
    { width: 0, length: 1220 },
    { width: 1220, length: -1 },
  ])('throws RangeError for invalid candidate dimensions', ({ width, length }) => {
    expect(() =>
      optimizeWithMultiStock([part()], [{ material: 'melamine-18', width, length }]),
    ).toThrow(/candidate dimensions must be > 0/i);
  });
});