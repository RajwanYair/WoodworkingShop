import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateParts, computeEdgeBandingTotal, computePartsWeight } from '../../src/engine/parts';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import { expectBilingualNames } from '../assertions';
import { propertyRunOptions } from '../property-seeds';

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

  it.each([
    ['all-visible', 'Front edge', 'All 4 edges'],
    ['doors-only', 'None', 'All 4 edges'],
    ['none', 'None', 'None'],
  ] as const)('applies %s edge banding to carcass and doors', (mode, carcassEdge, doorEdge) => {
    const generated = generateParts({ ...DEFAULT_CONFIG, edgeBanding: mode });

    expect(generated.find((part) => part.name.en === 'Top Panel')?.edgeBanding.en).toBe(carcassEdge);
    expect(generated.find((part) => part.name.en === 'Door')?.edgeBanding.en).toBe(doorEdge);
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

  it('generates a single panel from the selected material source', () => {
    const generated = generateParts({
      ...DEFAULT_CONFIG,
      furnitureType: 'panel',
      width: 600,
      height: 800,
      panelMaterialSource: 'back',
    });

    expect(generated).toHaveLength(1);
    expect(generated[0]).toMatchObject({
      id: 'P01',
      qty: 1,
      name: { en: 'Panel' },
      material: 'plywood-4',
      thickness: 4,
      length: 600,
      width: 800,
      edgeBanding: { en: 'All 4 edges' },
    });
  });

  it('generates desk parts without cabinet-only doors, drawers, supports, or toe kicks', () => {
    const generated = generateParts({
      ...DEFAULT_CONFIG,
      furnitureType: 'desk',
      width: 1200,
      height: 750,
      shelfCount: 1,
      shelfCentreSupports: 2,
      drawerCount: 2,
    });

    expect(generated.find((part) => part.name.en === 'Desktop')).toMatchObject({
      length: 1200,
      width: 600,
    });
    expect(generated.find((part) => part.name.en === 'Side Panel')).toMatchObject({
      qty: 2,
      length: 733,
    });
    expect(generated.find((part) => part.name.en === 'Modesty Panel')).toMatchObject({
      length: 1166,
      width: 300,
    });
    expect(generated.find((part) => part.name.en === 'Under-desk Shelf')?.qty).toBe(1);
    expect(generated.some((part) => /Door|Drawer|Centre Support|Toe Kick/.test(part.name.en))).toBe(false);
  });

  it('omits doors, drawers, and toe kicks from bookshelves while retaining shelves', () => {
    const generated = generateParts({
      ...DEFAULT_CONFIG,
      furnitureType: 'bookshelf',
      height: 1800,
      shelfCount: 5,
      drawerCount: 2,
      doorStyle: 'flat',
    });

    expect(generated.find((part) => part.name.en === 'Adjustable Shelf')?.qty).toBe(5);
    expect(generated.some((part) => /Door|Drawer|Toe Kick/.test(part.name.en))).toBe(false);
  });

  it('generates a wardrobe rail and toe-kick boards with configured dimensions', () => {
    const generated = generateParts({ ...DEFAULT_CONFIG, furnitureType: 'wardrobe' });

    expect(generated.find((part) => part.name.en === 'Hanging Rail')).toMatchObject({
      thickness: 25,
      length: 966,
      width: 25,
    });
    expect(generated.find((part) => part.name.en === 'Toe Kick (Front)')).toMatchObject({
      length: 1000,
      width: 100,
    });
    expect(generated.find((part) => part.name.en === 'Toe Kick (Side)')).toMatchObject({
      qty: 2,
      length: 583,
      width: 100,
    });
  });

  it('uses configured drawer heights and slide clearances in drawer parts', () => {
    const generated = generateParts({
      ...DEFAULT_CONFIG,
      depth: 400,
      drawerCount: 2,
      drawerHeights: [120, 240],
    });

    expect(generated.filter((part) => part.name.en.startsWith('Drawer '))).toHaveLength(8);
    expect(
      generateParts({ ...DEFAULT_CONFIG, drawerCount: 0 }).filter((part) => part.name.en.startsWith('Drawer ')),
    ).toHaveLength(0);

    expect(generated.find((part) => part.name.en === 'Drawer 1 Front')).toMatchObject({
      length: 150,
      width: 966,
    });
    expect(generated.find((part) => part.name.en === 'Drawer 2 Front')).toMatchObject({
      length: 270,
      width: 966,
    });
    expect(generated.find((part) => part.name.en === 'Drawer 1 Box Side')).toMatchObject({
      qty: 2,
      length: 353,
      width: 120,
    });
    expect(generated.find((part) => part.name.en === 'Drawer 1 Box End')).toMatchObject({
      qty: 2,
      length: 906,
      width: 120,
    });
    expect(generated.find((part) => part.name.en === 'Drawer 2 Bottom')).toMatchObject({
      material: 'plywood-4',
      length: 351,
      width: 906,
      thickness: 4,
    });
  });

  it('omits back panel when hasBack=false (Sprint A2)', () => {
    const cfg = { ...DEFAULT_CONFIG, hasBack: false };
    const p = generateParts(cfg);
    const back = p.find((x) => x.name.en === 'Back Panel');
    expect(back).toBeUndefined();
  });

  it('keeps back panel when hasBack=undefined (backward compat)', () => {
    const cfg = { ...DEFAULT_CONFIG };
    delete (cfg as { hasBack?: boolean }).hasBack;
    const p = generateParts(cfg);
    const back = p.find((x) => x.name.en === 'Back Panel');
    expect(back).toBeDefined();
  });

  it('all parts have bilingual names', () => {
    expectBilingualNames(parts);
  });

  it('generates uniquely identified parts with finite positive dimensions for valid cabinet configurations', () => {
    fc.assert(
      fc.property(
        fc.record({
          width: fc.integer({ min: 700, max: 1800 }),
          height: fc.integer({ min: 1000, max: 2500 }),
          depth: fc.integer({ min: 400, max: 900 }),
          shelfCount: fc.integer({ min: 0, max: 8 }),
          drawerCount: fc.integer({ min: 0, max: 3 }),
          doorCount: fc.constantFrom(1, 2),
        }),
        (overrides) => {
          const generated = generateParts({ ...DEFAULT_CONFIG, ...overrides });
          const identifiers = generated.map((part) => part.id);

          expect(generated.length).toBeGreaterThan(0);
          expect(new Set(identifiers).size).toBe(identifiers.length);
          expect(
            generated.every(
              (part) =>
                Number.isFinite(part.length) &&
                part.length > 0 &&
                Number.isFinite(part.width) &&
                part.width > 0 &&
                Number.isFinite(part.thickness) &&
                part.thickness > 0 &&
                Number.isInteger(part.qty) &&
                part.qty > 0,
            ),
          ).toBe(true);
        },
      ),
      propertyRunOptions('tests/engine/parts.test.ts', 200),
    );
  });
});

describe('computeEdgeBandingTotal', () => {
  it('computes total edge banding length', () => {
    const generated = generateParts({ ...DEFAULT_CONFIG, edgeBanding: 'all-visible' });
    const total = computeEdgeBandingTotal(generated);
    const expected = generated.reduce(
      (sum, part) =>
        sum +
        (part.edgeBanding.en === 'Front edge'
          ? part.length * part.qty
          : part.edgeBanding.en === 'All 4 edges'
            ? 2 * (part.length + part.width) * part.qty
            : 0),
      0,
    );

    expect(total).toBe(expected);
  });

  it('returns 0 when no edge banding', () => {
    const cfg = { ...DEFAULT_CONFIG, edgeBanding: 'none' as const };
    const parts = generateParts(cfg);
    const total = computeEdgeBandingTotal(parts);
    expect(total).toBe(0);
  });
});

describe('computePartsWeight — Sprint 62', () => {
  it('returns a positive weight for the default cabinet', () => {
    const parts = generateParts(DEFAULT_CONFIG);
    const weight = computePartsWeight(parts);
    expect(weight).toBeGreaterThan(0);
  });

  it('returns 0 for an empty parts list', () => {
    expect(computePartsWeight([])).toBe(0);
  });

  it('larger cabinet weighs more than smaller cabinet', () => {
    const small = generateParts({ ...DEFAULT_CONFIG, width: 400, height: 800, depth: 300 });
    const large = generateParts({ ...DEFAULT_CONFIG, width: 1200, height: 2400, depth: 600 });
    expect(computePartsWeight(large)).toBeGreaterThan(computePartsWeight(small));
  });

  it('skips parts with unknown material without throwing', () => {
    const parts = generateParts(DEFAULT_CONFIG);
    const modified = [{ ...parts[0], material: 'nonexistent-mat-xyz' }];
    expect(() => computePartsWeight(modified)).not.toThrow();
    expect(computePartsWeight(modified)).toBe(0);
  });

  it('weight scales with quantity', () => {
    const parts = generateParts(DEFAULT_CONFIG);
    const base = computePartsWeight(parts);
    const doubled = parts.map((p) => ({ ...p, qty: p.qty * 2 }));
    expect(computePartsWeight(doubled)).toBeCloseTo(base * 2, 5);
  });
});
