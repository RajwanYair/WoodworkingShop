import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateParts, computeEdgeBandingTotal, computePartsWeight } from '../../src/engine/parts';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import { expectBilingualNames } from '../assertions';
import { propertyRunOptions } from '../property-seeds';
import type { Part } from '../../src/engine/types';

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

  it('sizes top and bottom panels between the two side panels', () => {
    const generated = generateParts({ ...DEFAULT_CONFIG, width: 1003 });
    const expectedSpan = 1003 - 2 * 17;

    expect(generated.find((part) => part.name.en === 'Top Panel')?.length).toBe(expectedSpan);
    expect(generated.find((part) => part.name.en === 'Bottom Panel')?.length).toBe(expectedSpan);
  });

  it('has adjustable shelves matching shelfCount', () => {
    const shelves = parts.find((p) => p.name.en === 'Adjustable Shelf');
    expect(shelves).toBeDefined();
    expect(shelves!.qty).toBe(DEFAULT_CONFIG.shelfCount); // 4
  });

  it('has 2 doors for default config', () => {
    const generated = generateParts({ ...DEFAULT_CONFIG, width: 1004 });
    const doors = generated.filter((part) => part.name.en === 'Door');

    expect(doors).toHaveLength(1);
    expect(doors[0]?.qty).toBe(2);
    expectBilingualNames(doors);
  });

  it.each([
    ['all-visible', 'Front edge', 'All 4 edges'],
    ['doors-only', 'None', 'All 4 edges'],
    ['none', 'None', 'None'],
  ] as const)('applies %s edge banding to carcass and doors', (mode, carcassEdge, doorEdge) => {
    const generated = generateParts({ ...DEFAULT_CONFIG, width: 1007, edgeBanding: mode });

    expect(generated.find((part) => part.name.en === 'Top Panel')?.edgeBanding.en).toBe(carcassEdge);
    expect(generated.find((part) => part.name.en === 'Door')?.edgeBanding.en).toBe(doorEdge);
    expect(generated.find((part) => part.name.en === 'Toe Kick (Front)')?.edgeBanding.en).toBe(
      mode === 'all-visible' ? 'Front edge' : 'None',
    );
    expect(
      generated
        .filter((part) =>
          ['Side Panel', 'Top Panel', 'Bottom Panel', 'Fixed Shelf', 'Adjustable Shelf'].includes(part.name.en),
        )
        .map((part) => part.edgeBanding.en),
    ).toEqual([carcassEdge, carcassEdge, carcassEdge, carcassEdge, carcassEdge]);
  });

  it('has a back panel with thin material', () => {
    const back = parts.find((p) => p.name.en === 'Back Panel');
    expect(back).toBeDefined();
    expect(back!.thickness).toBe(4); // plywood-4
  });

  it.each([
    [1199, false],
    [1200, false],
    [1201, true],
  ])('includes a fixed shelf only above 1200 mm (height %i)', (height, includesFixedShelf) => {
    const generated = generateParts({ ...DEFAULT_CONFIG, height });
    expect(generated.some((part) => part.name.en === 'Fixed Shelf')).toBe(includesFixedShelf);
  });

  it('omits doors when doorStyle is none', () => {
    const cfg = { ...DEFAULT_CONFIG, doorStyle: 'none' as const };
    const p = generateParts(cfg);
    const doors = p.find((x) => x.name.en === 'Door');
    expect(doors).toBeUndefined();
  });

  it('generates glass doors from tempered glass with no edge banding', () => {
    const generated = generateParts({ ...DEFAULT_CONFIG, width: 1005, doorStyle: 'glass' });
    const glassDoors = generated.filter((part) => part.name.en === 'Glass Door');

    expect(glassDoors).toHaveLength(1);
    expect(glassDoors[0]).toMatchObject({
      qty: 2,
      material: 'tempered-glass-4',
      thickness: 4,
      edgeBanding: { en: 'None' },
    });
    expectBilingualNames(glassDoors);
  });

  it.each([
    ['carcass', 'plywood-17', 17],
    ['back', 'plywood-4', 4],
  ] as const)('generates a single panel from the %s material source', (panelMaterialSource, material, thickness) => {
    const generated = generateParts({
      ...DEFAULT_CONFIG,
      furnitureType: 'panel',
      width: 600,
      height: 800,
      panelMaterialSource,
    });

    expect(generated).toHaveLength(1);
    expectBilingualNames(generated);
    expect(generated[0]).toMatchObject({
      id: 'P01',
      qty: 1,
      name: { en: 'Panel' },
      material,
      thickness,
      length: 600,
      width: 800,
      edgeBanding: { en: 'All 4 edges' },
    });
  });

  it('omits edge banding from a single panel when disabled', () => {
    const generated = generateParts({ ...DEFAULT_CONFIG, furnitureType: 'panel', width: 601, edgeBanding: 'none' });
    expect(generated[0]?.edgeBanding.en).toBe('None');
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

  it.each([
    [0, false],
    [1, true],
  ])('includes an under-desk shelf only when shelfCount is positive (%i)', (shelfCount, includesShelf) => {
    const generated = generateParts({ ...DEFAULT_CONFIG, furnitureType: 'desk', shelfCount });
    expect(generated.some((part) => part.name.en === 'Under-desk Shelf')).toBe(includesShelf);
  });

  it.each([
    ['all-visible', 'All 4 edges', 'Front edge'],
    ['none', 'None', 'None'],
  ] as const)('applies %s edge banding to desk parts', (edgeBanding, desktopEdge, otherEdge) => {
    const generated = generateParts({
      ...DEFAULT_CONFIG,
      furnitureType: 'desk',
      width: edgeBanding === 'all-visible' ? 1201 : 1202,
      shelfCount: 1,
      edgeBanding,
    });

    expect(
      generated
        .filter((part) => ['Desktop', 'Side Panel', 'Under-desk Shelf'].includes(part.name.en))
        .map((part) => part.edgeBanding.en),
    ).toEqual([desktopEdge, otherEdge, otherEdge]);
    expectBilingualNames(generated);
  });

  it.each([
    [true, true],
    [false, false],
  ])('includes a desk back panel when hasBack is %s', (hasBack, includesBackPanel) => {
    const generated = generateParts({ ...DEFAULT_CONFIG, furnitureType: 'desk', hasBack });
    expect(generated.some((part) => part.name.en === 'Back Panel')).toBe(includesBackPanel);
  });

  it.each([
    { requestedCount: -2, edgeBanding: 'all-visible', expectedQuantities: [], expectedEdges: [] },
    { requestedCount: 0, edgeBanding: 'all-visible', expectedQuantities: [], expectedEdges: [] },
    { requestedCount: 2, edgeBanding: 'all-visible', expectedQuantities: [2], expectedEdges: ['Front edge'] },
    { requestedCount: 2, edgeBanding: 'none', expectedQuantities: [2], expectedEdges: ['None'] },
  ] as const)(
    'generates centre supports for count $requestedCount with $edgeBanding banding',
    ({ requestedCount, edgeBanding, expectedQuantities, expectedEdges }) => {
      const generated = generateParts({ ...DEFAULT_CONFIG, shelfCentreSupports: requestedCount, edgeBanding });
      const supports = generated.filter((part) => part.name.en === 'Centre Support');

      expect(supports.map((part) => part.qty)).toEqual(expectedQuantities);
      expect(supports.map((part) => part.edgeBanding.en)).toEqual(expectedEdges);
      expectBilingualNames(supports);
    },
  );

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

  it.each([
    [0, false],
    [100, true],
  ])('generates cabinet toe-kick boards only when kickHeight is %s', (kickHeight, includesToeKick) => {
    const generated = generateParts({ ...DEFAULT_CONFIG, kickHeight });
    expect(generated.some((part) => part.name.en.startsWith('Toe Kick'))).toBe(includesToeKick);
  });

  it('generates a wardrobe rail and toe-kick boards with configured dimensions', () => {
    const generated = generateParts({ ...DEFAULT_CONFIG, furnitureType: 'wardrobe' });

    expect(generated.find((part) => part.name.en === 'Hanging Rail')).toMatchObject({
      name: { en: 'Hanging Rail', he: 'מוט תלייה' },
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

  it('omits a hanging rail from standard cabinets', () => {
    const generated = generateParts({ ...DEFAULT_CONFIG, width: DEFAULT_CONFIG.width + 1 });
    expect(generated.some((part) => part.name.en === 'Hanging Rail')).toBe(false);
  });

  it('uses configured drawer heights and slide clearances in drawer parts', () => {
    const generated = generateParts({
      ...DEFAULT_CONFIG,
      depth: 400,
      drawerCount: 2,
      drawerHeights: [120, 240],
    });

    const drawerParts = generated.filter((part) => part.name.en.startsWith('Drawer '));
    expect(drawerParts).toHaveLength(8);
    expect(drawerParts.map((part) => part.name.he)).toEqual([
      'חזית מגירה 1',
      'דופן מגירה 1',
      'קצה מגירה 1',
      'תחתית מגירה 1',
      'חזית מגירה 2',
      'דופן מגירה 2',
      'קצה מגירה 2',
      'תחתית מגירה 2',
    ]);
    expect(drawerParts.map((part) => part.edgeBanding.en)).toEqual([
      'All 4 edges',
      'None',
      'None',
      'None',
      'All 4 edges',
      'None',
      'None',
      'None',
    ]);
    const unbandedDrawers = generateParts({
      ...DEFAULT_CONFIG,
      width: 1001,
      depth: 400,
      drawerCount: 1,
      edgeBanding: 'none',
    });
    expect(unbandedDrawers.find((part) => part.name.en === 'Drawer 1 Front')?.edgeBanding.en).toBe('None');
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
    const generated = generateParts({ ...DEFAULT_CONFIG, width: 1006 });
    expectBilingualNames(generated);
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
          const expectedIdentifiers = generated.map((_, index) => `P${String(index + 1).padStart(2, '0')}`);

          expect(generated.length).toBeGreaterThan(0);
          expect(identifiers).toEqual(expectedIdentifiers);
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
  it('derives raw stock dimensions only when the process is enabled and retains finished edge lengths', () => {
    const base = { ...DEFAULT_CONFIG, furnitureType: 'panel' as const, width: 600, height: 400 };
    const finished = generateParts(base)[0];
    const enabled = generateParts({
      ...base,
      edgeBandingProcess: { enabled: true, bandThicknessMm: 1, trimAllowanceMm: 0 },
    })[0];

    expect(finished).toMatchObject({ length: 600, width: 400, rawLength: 600, rawWidth: 400 });
    expect(enabled).toMatchObject({ length: 600, width: 400, rawLength: 598, rawWidth: 398 });
    expect(computeEdgeBandingTotal([enabled!])).toBe(2000);
  });

  it('computes front-edge and four-edge totals from independent part fixtures', () => {
    const parts: Part[] = [
      {
        id: 'P01',
        qty: 2,
        name: { en: 'Front edge panel', he: 'לוח קצה קדמי' },
        material: 'plywood-17',
        thickness: 17,
        length: 600,
        width: 300,
        edgeBanding: { en: 'Front edge', he: 'קצה קדמי' },
      },
      {
        id: 'P02',
        qty: 3,
        name: { en: 'Four-edge panel', he: 'לוח ארבעה קצוות' },
        material: 'plywood-17',
        thickness: 17,
        length: 1000,
        width: 300,
        edgeBanding: { en: 'All 4 edges', he: 'כל 4 הקצוות' },
      },
      {
        id: 'P03',
        qty: 4,
        name: { en: 'Unbanded panel', he: 'לוח ללא קנטים' },
        material: 'plywood-17',
        thickness: 17,
        length: 800,
        width: 400,
        edgeBanding: { en: 'None', he: 'ללא' },
      },
    ];

    expect(computeEdgeBandingTotal(parts)).toBe(9000);
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
