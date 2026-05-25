import { describe, it, expect, beforeAll } from 'vitest';
import type { Part } from '../../src/engine/types';
import { optimizeCutSheets, findCoNestCandidates, applyCoNesting } from '../../src/engine/cut-optimizer';
import { generateParts } from '../../src/engine/parts';
import { DEFAULT_CONFIG } from '../../src/engine/materials';

/** Factory for a grain-sensitive plywood-17 part used in narrow-sheet override tests. */
const mkPlywoodPart = (id: string, width: number): Part => ({
  id,
  name: { en: id, he: id },
  qty: 1,
  material: 'plywood-17',
  thickness: 17,
  length: 400,
  width,
  edgeBanding: { en: '', he: '' },
});

/** Narrow sheet override that forces 400×700 parts to rotate (700 > 500 width). */
const NARROW_SHEET = { 'plywood-17': { width: 500, length: 1000 } } as const;

describe('optimizeCutSheets', () => {
  let defaultParts: ReturnType<typeof generateParts>;
  let defaultResult: ReturnType<typeof optimizeCutSheets>;

  beforeAll(() => {
    defaultParts = generateParts(DEFAULT_CONFIG);
    defaultResult = optimizeCutSheets(defaultParts);
  });

  it('produces sheets, places all parts, groups by material, yield in range, zero grain conflicts', () => {
    expect(defaultResult.totalSheets).toBeGreaterThanOrEqual(1);
    expect(defaultResult.sheets.length).toBe(defaultResult.totalSheets);
    expect(defaultResult.overallYield).toBeGreaterThan(0);
    expect(defaultResult.overallYield).toBeLessThanOrEqual(100);
    expect(new Set(defaultResult.sheets.map((s) => s.material)).size).toBeGreaterThanOrEqual(1);
    const placedCount = defaultResult.sheets.reduce((sum, s) => sum + s.parts.length, 0);
    const expectedCount = defaultParts.reduce((sum, p) => sum + p.qty, 0);
    expect(placedCount).toBe(expectedCount);
    expect(defaultResult.grainConflictCount).toBe(0);
  });

  it('all placed parts have valid coordinates and grainVertical boolean', () => {
    for (const sheet of defaultResult.sheets) {
      for (const p of sheet.parts) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.length).toBeGreaterThan(0);
        expect(p.width).toBeGreaterThan(0);
        expect(typeof p.grainVertical).toBe('boolean');
      }
    }
  });

  it('handles empty parts list', () => {
    const result = optimizeCutSheets([]);
    expect(result.totalSheets).toBe(0);
    expect(result.sheets).toEqual([]);
    expect(result.overallYield).toBe(0);
  });

  it('small cabinet fits on fewer sheets', () => {
    const small = { ...DEFAULT_CONFIG, width: 400, height: 800, depth: 300, shelfCount: 1 };
    expect(optimizeCutSheets(generateParts(small)).totalSheets).toBeLessThanOrEqual(2);
  });

  it('tall 12-shelf bookshelf fits all carcass parts on 1 plywood sheet', () => {
    const bookshelf = {
      ...DEFAULT_CONFIG,
      furnitureType: 'bookshelf' as const,
      width: 800,
      height: 2400,
      depth: 100,
      shelfCount: 12,
      doorStyle: 'none' as const,
      doorCount: 1 as const,
      drawerCount: 0,
    };
    const result = optimizeCutSheets(generateParts(bookshelf));
    expect(result.sheets.filter((s) => s.material === bookshelf.carcassMaterial).length).toBeLessThanOrEqual(1);
  });

  it('earliest-sheet preference: first sheet has highest yield', () => {
    const smallConfig = {
      ...DEFAULT_CONFIG,
      width: 300,
      height: 500,
      depth: 200,
      shelfCount: 0,
      doorStyle: 'none' as const,
      drawerCount: 0,
      hasBack: false,
    };
    const result = optimizeCutSheets(generateParts(smallConfig));
    const panelSheets = result.sheets.filter((s) => s.material === smallConfig.carcassMaterial);
    for (const sh of panelSheets) expect(sh.yieldPercent).toBeGreaterThan(0);
    if (panelSheets.length >= 2)
      expect(panelSheets[0].yieldPercent).toBeGreaterThanOrEqual(panelSheets[1].yieldPercent);
  });

  it('grain-locked parts preserve grainVertical boolean across placements', () => {
    const tallConfig = {
      ...DEFAULT_CONFIG,
      width: 800,
      height: 2000,
      depth: 400,
      shelfCount: 3,
      doorStyle: 'none' as const,
      drawerCount: 0,
    };
    for (const sheet of optimizeCutSheets(generateParts(tallConfig)).sheets) {
      for (const p of sheet.parts) expect(p.grainVertical === true || p.grainVertical === false).toBe(true);
    }
  });

  it('grainConflictCount is 0 for default config', () => {
    expect(defaultResult.grainConflictCount).toBe(0);
  });

  it.each([
    [700, true, 1],
    [300, false, 0],
  ] as [number, boolean, number][])(
    'grain conflict when width=%i: conflicted=%s, count=%i',
    (width, expectConflict, expectCount) => {
      const result = optimizeCutSheets([mkPlywoodPart('test', width)], 3, NARROW_SHEET);
      expect(result.grainConflictCount).toBe(expectCount);
      const placed = result.sheets.flatMap((s) => s.parts)[0];
      if (expectConflict) {
        expect(placed?.grainConflict).toBe(true);
        expect(placed?.rotated).toBe(true);
      } else {
        expect(placed?.grainConflict).toBeUndefined();
      }
    },
  );

  it('non-grain material parts never have grainConflict flag', () => {
    const part: Part = {
      id: 'test-mdf',
      name: { en: 'Back Panel', he: 'גב' },
      qty: 1,
      material: 'melamine-18',
      thickness: 18,
      length: 400,
      width: 700,
      edgeBanding: { en: '', he: '' },
    };
    const result = optimizeCutSheets([part], 3, { 'melamine-18': { width: 500, length: 1000 } });
    expect(result.grainConflictCount).toBe(0);
    for (const sheet of result.sheets) for (const p of sheet.parts) expect(p.grainConflict).toBeUndefined();
  });

  it('counts multiple grain conflicts across sheets', () => {
    const result = optimizeCutSheets([mkPlywoodPart('a', 700), mkPlywoodPart('b', 700)], 3, NARROW_SHEET);
    expect(result.grainConflictCount).toBe(2);
  });

  it('every placed part has a rationale starting with "BSSF"', () => {
    for (const sheet of defaultResult.sheets) for (const p of sheet.parts) expect(p.rationale).toMatch(/^BSSF\(/);
  });

  it.each([
    ['normal', { ...mkPlywoodPart('tall', 300), length: 800 }, /BSSF\(normal\)/],
    ['grain-forced', mkPlywoodPart('wide', 700), /grain-forced/],
    ['mm margin', mkPlywoodPart('any', 300), /\d+mm × \d+mm margin/],
  ] as const)('rationale includes "%s" pattern', (_, part, pattern) => {
    const placed = optimizeCutSheets([part], 3, NARROW_SHEET).sheets.flatMap((s) => s.parts)[0];
    expect(placed?.rationale).toMatch(pattern);
  });
});

describe('optimizeCutSheets — grain conflict aggregation', () => {
  it('grainConflictCount is 0 and no flags set for grain-free material', () => {
    const result = optimizeCutSheets(generateParts({ ...DEFAULT_CONFIG, carcassMaterial: 'melamine-18' }));
    expect(result.grainConflictCount).toBe(0);
    expect(result.sheets.flatMap((s) => s.parts).every((p) => !p.grainConflict)).toBe(true);
  });

  it('grainConflictCount matches per-part grainConflict flag count', () => {
    const result = optimizeCutSheets(generateParts(DEFAULT_CONFIG));
    const flagged = result.sheets.flatMap((s) => s.parts).filter((p) => p.grainConflict === true).length;
    expect(result.grainConflictCount).toBe(flagged);
  });

  it('grainConflict is set only when hasGrain part is forced to rotate on narrow sheet', () => {
    const result = optimizeCutSheets([mkPlywoodPart('wide', 700)], 3, NARROW_SHEET);
    const placed = result.sheets.flatMap((s) => s.parts);
    expect(placed.some((p) => p.grainConflict === true)).toBe(true);
    expect(result.grainConflictCount).toBe(placed.filter((p) => p.grainConflict).length);
  });
});

describe('findCoNestCandidates', () => {
  it('returns empty array when all sheets have distinct geometry', () => {
    const result = optimizeCutSheets([
      {
        id: 'A',
        name: { en: 'A', he: 'A' },
        qty: 1,
        length: 400,
        width: 200,
        material: 'plywood-18',
        thickness: 18,
        edgeBanding: { en: '', he: '' },
      },
    ]);
    expect(findCoNestCandidates(result)).toHaveLength(0);
  });

  it('detects candidates when two materials share thickness and sheet size', () => {
    const fakeResult = {
      sheets: [
        {
          sheetIndex: 0,
          material: 'plywood-18',
          thickness: 18,
          sheetWidth: 1220,
          sheetLength: 2440,
          parts: [],
          yieldPercent: 50,
        },
        {
          sheetIndex: 1,
          material: 'melamine-18',
          thickness: 18,
          sheetWidth: 1220,
          sheetLength: 2440,
          parts: [],
          yieldPercent: 50,
        },
      ],
      totalSheets: 2,
      overallYield: 50,
      totalWaste: 0,
      grainConflictCount: 0,
    };
    const candidates = findCoNestCandidates(fakeResult);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].materialKeys).toContain('plywood-18');
    expect(candidates[0].materialKeys).toContain('melamine-18');
    expect(candidates[0].thickness).toBe(18);
  });

  it('does not return groups with only one material', () => {
    const fakeResult = {
      sheets: [
        {
          sheetIndex: 0,
          material: 'plywood-18',
          thickness: 18,
          sheetWidth: 1220,
          sheetLength: 2440,
          parts: [],
          yieldPercent: 50,
        },
        {
          sheetIndex: 1,
          material: 'plywood-18',
          thickness: 18,
          sheetWidth: 1220,
          sheetLength: 2440,
          parts: [],
          yieldPercent: 50,
        },
      ],
      totalSheets: 2,
      overallYield: 50,
      totalWaste: 0,
      grainConflictCount: 0,
    };
    expect(findCoNestCandidates(fakeResult)).toHaveLength(0);
  });
});

describe('applyCoNesting', () => {
  const makePart = (id: string, w: number, l: number) => ({
    partId: id,
    label: id,
    x: 0,
    y: 0,
    width: w,
    length: l,
    grainVertical: true,
    edgeBanding: '',
  });

  it('returns original result unchanged when coNestKeys is empty', () => {
    const fakeResult = {
      sheets: [
        {
          sheetIndex: 0,
          material: 'plywood-18',
          thickness: 18,
          sheetWidth: 1220,
          sheetLength: 2440,
          parts: [makePart('P1', 200, 300)],
          yieldPercent: 5,
        },
      ],
      totalSheets: 1,
      overallYield: 5,
      totalWaste: 0,
      grainConflictCount: 0,
    };
    const out = applyCoNesting(fakeResult, new Set());
    expect(out).toBe(fakeResult);
  });

  it('reduces total sheet count when parts from two materials are co-nested', () => {
    // Synthetic result: two materials each with one half-full sheet of the same geometry
    const sharedParts = (mat: string, idx: number) => ({
      sheetIndex: idx,
      material: mat,
      thickness: 18,
      sheetWidth: 1220,
      sheetLength: 2440,
      parts: [makePart(`${mat}-P1`, 400, 400), makePart(`${mat}-P2`, 400, 400)],
      yieldPercent: 10,
    });
    const fakeResult = {
      sheets: [sharedParts('plywood-18', 0), sharedParts('melamine-18', 1)],
      totalSheets: 2,
      overallYield: 10,
      totalWaste: 0,
      grainConflictCount: 0,
    };
    const key = '18x1220x2440';
    const out = applyCoNesting(fakeResult, new Set([key]));
    // All 4 parts should fit on 1 shared sheet (400x400 × 4 = 640000mm² << 1220x2440 = 2976800mm²)
    expect(out.totalSheets).toBeLessThan(fakeResult.totalSheets);
    expect(out.sheets.every((s) => s.parts.every((p) => p.partMaterial !== undefined))).toBe(true);
  });

  it('sets partMaterial on co-nested parts', () => {
    const fakeResult = {
      sheets: [
        {
          sheetIndex: 0,
          material: 'plywood-18',
          thickness: 18,
          sheetWidth: 1220,
          sheetLength: 2440,
          parts: [makePart('P1', 200, 200)],
          yieldPercent: 3,
        },
        {
          sheetIndex: 1,
          material: 'melamine-18',
          thickness: 18,
          sheetWidth: 1220,
          sheetLength: 2440,
          parts: [makePart('P2', 200, 200)],
          yieldPercent: 3,
        },
      ],
      totalSheets: 2,
      overallYield: 3,
      totalWaste: 0,
      grainConflictCount: 0,
    };
    const out = applyCoNesting(fakeResult, new Set(['18x1220x2440']));
    const allParts = out.sheets.flatMap((s) => s.parts);
    expect(allParts.find((p) => p.partId === 'P1')?.partMaterial).toBe('plywood-18');
    expect(allParts.find((p) => p.partId === 'P2')?.partMaterial).toBe('melamine-18');
  });

  it('leaves untouched sheets unchanged', () => {
    const fakeResult = {
      sheets: [
        {
          sheetIndex: 0,
          material: 'hdf-3',
          thickness: 3,
          sheetWidth: 1220,
          sheetLength: 2440,
          parts: [makePart('BP1', 100, 100)],
          yieldPercent: 1,
        },
        {
          sheetIndex: 1,
          material: 'plywood-18',
          thickness: 18,
          sheetWidth: 1220,
          sheetLength: 2440,
          parts: [makePart('P1', 200, 200)],
          yieldPercent: 3,
        },
        {
          sheetIndex: 2,
          material: 'melamine-18',
          thickness: 18,
          sheetWidth: 1220,
          sheetLength: 2440,
          parts: [makePart('P2', 200, 200)],
          yieldPercent: 3,
        },
      ],
      totalSheets: 3,
      overallYield: 2,
      totalWaste: 0,
      grainConflictCount: 0,
    };
    const out = applyCoNesting(fakeResult, new Set(['18x1220x2440']));
    const hdfSheet = out.sheets.find((s) => s.material === 'hdf-3');
    expect(hdfSheet).toBeDefined();
    expect(hdfSheet?.parts[0].partId).toBe('BP1');
  });
});
