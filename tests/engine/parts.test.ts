import { describe, it, expect } from 'vitest';
import { generateParts, computeEdgeBandingTotal } from '../../src/engine/parts';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import { expectBilingualNames } from '../assertions';

describe('generateParts', () => {
  const parts = generateParts(DEFAULT_CONFIG);

  it('generates the expected number of part types', () => {
    // sides, top, bottom, fixed shelf (H>1200), adjustable shelves, doors, back
    expect(parts.length).toBeGreaterThanOrEqual(6);
  });

  it('has 2 side panels', () => {
    const sides = parts.find((p) => p.name.en === 'Side Panel');
    expect(sides).toBeDefined();
    expect(sides!.qty).toBe(2);
  });

  it('side panel dimensions match config', () => {
    const sides = parts.find((p) => p.name.en === 'Side Panel')!;
    expect(sides.length).toBe(DEFAULT_CONFIG.height); // 2000
    expect(sides.width).toBe(DEFAULT_CONFIG.depth); // 600
    expect(sides.thickness).toBe(17); // plywood-17
  });

  it('has adjustable shelves matching shelfCount', () => {
    const shelves = parts.find((p) => p.name.en === 'Adjustable Shelf');
    expect(shelves).toBeDefined();
    expect(shelves!.qty).toBe(DEFAULT_CONFIG.shelfCount); // 4
  });

  it('has 2 doors for default config', () => {
    const doors = parts.find((p) => p.name.en === 'Door');
    expect(doors).toBeDefined();
    expect(doors!.qty).toBe(2);
  });

  it('has a back panel with thin material', () => {
    const back = parts.find((p) => p.name.en === 'Back Panel');
    expect(back).toBeDefined();
    expect(back!.thickness).toBe(4); // plywood-4
  });

  it('includes fixed shelf when height > 1200', () => {
    const fixed = parts.find((p) => p.name.en === 'Fixed Shelf');
    expect(fixed).toBeDefined();
    expect(fixed!.qty).toBe(1);
  });

  it('omits fixed shelf when height ≤ 1200', () => {
    const cfg = { ...DEFAULT_CONFIG, height: 1000 };
    const p = generateParts(cfg);
    const fixed = p.find((x) => x.name.en === 'Fixed Shelf');
    expect(fixed).toBeUndefined();
  });

  it('omits doors when doorStyle is none', () => {
    const cfg = { ...DEFAULT_CONFIG, doorStyle: 'none' as const };
    const p = generateParts(cfg);
    const doors = p.find((x) => x.name.en === 'Door');
    expect(doors).toBeUndefined();
  });

  it('all parts have bilingual names', () => {
    expectBilingualNames(parts);
  });
});

describe('computeEdgeBandingTotal', () => {
  it('computes total edge banding length', () => {
    const parts = generateParts(DEFAULT_CONFIG);
    const total = computeEdgeBandingTotal(parts);
    expect(total).toBeGreaterThan(0);
  });

  it('returns 0 when no edge banding', () => {
    const cfg = { ...DEFAULT_CONFIG, edgeBanding: 'none' as const };
    const parts = generateParts(cfg);
    const total = computeEdgeBandingTotal(parts);
    expect(total).toBe(0);
  });
});
