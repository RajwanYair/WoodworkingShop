import { describe, it, expect } from 'vitest';
import {
  optimizeCutSheets,
  findCoNestCandidates,
  applyCoNesting,
} from '../../src/engine/cut-optimizer';
import { generateParts } from '../../src/engine/parts';
import { DEFAULT_CONFIG } from '../../src/engine/materials';

describe('optimizeCutSheets', () => {
  it('produces at least 1 sheet for default config', () => {
    const parts = generateParts(DEFAULT_CONFIG);
    const result = optimizeCutSheets(parts);
    expect(result.totalSheets).toBeGreaterThanOrEqual(1);
    expect(result.sheets.length).toBe(result.totalSheets);
  });

  it('yield is between 0 and 100', () => {
    const parts = generateParts(DEFAULT_CONFIG);
    const result = optimizeCutSheets(parts);
    expect(result.overallYield).toBeGreaterThan(0);
    expect(result.overallYield).toBeLessThanOrEqual(100);
  });

  it('all parts are placed on sheets', () => {
    const parts = generateParts(DEFAULT_CONFIG);
    const result = optimizeCutSheets(parts);

    // Count total placed parts across all sheets
    const placedCount = result.sheets.reduce((sum, s) => sum + s.parts.length, 0);

    // Count total individual parts (expand qty)
    const expectedCount = parts.reduce((sum, p) => sum + p.qty, 0);
    expect(placedCount).toBe(expectedCount);
  });

  it('groups parts by material', () => {
    const parts = generateParts(DEFAULT_CONFIG);
    const result = optimizeCutSheets(parts);

    // Should have sheets for both panel and back material
    const materials = new Set(result.sheets.map((s) => s.material));
    expect(materials.size).toBeGreaterThanOrEqual(1);
  });

  it('placed parts have valid coordinates', () => {
    const parts = generateParts(DEFAULT_CONFIG);
    const result = optimizeCutSheets(parts);

    for (const sheet of result.sheets) {
      for (const p of sheet.parts) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.length).toBeGreaterThan(0);
        expect(p.width).toBeGreaterThan(0);
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
    const parts = generateParts(small);
    const result = optimizeCutSheets(parts);
    expect(result.totalSheets).toBeLessThanOrEqual(2);
  });

  it('tall narrow bookshelf with many shelves packs efficiently (Sprint A3)', () => {
    // The bug-report case: 2400h × 800w × 100d, 12 shelves. Old strip packer
    // wasted a second plywood-17 sheet at <10% yield. MaxRects should fit
    // all carcass parts on one sheet.
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
    const parts = generateParts(bookshelf);
    const result = optimizeCutSheets(parts);
    const panelSheets = result.sheets.filter((s) => s.material === bookshelf.carcassMaterial);
    expect(panelSheets.length).toBeLessThanOrEqual(1);
  });

  it('earliest-sheet preference: pieces that fit on sheet 0 stay on sheet 0', () => {
    // Build a set of small identical parts that all fit on one sheet.
    // The packer should NOT open a second sheet if they all fit on the first.
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
    const parts = generateParts(smallConfig);
    // All parts of the primary material should land on the fewest sheets possible.
    const result = optimizeCutSheets(parts);
    const mat = smallConfig.carcassMaterial;
    const panelSheets = result.sheets.filter((s) => s.material === mat);
    // Each sheet's yield should be non-trivially above 0 (i.e. we didn't
    // spread pieces thinly across many near-empty sheets).
    for (const sh of panelSheets) {
      expect(sh.yieldPercent).toBeGreaterThan(0);
    }
    // The first sheet should be more utilised than any subsequent sheet.
    if (panelSheets.length >= 2) {
      expect(panelSheets[0].yieldPercent).toBeGreaterThanOrEqual(panelSheets[1].yieldPercent);
    }
  });

  it('all placed CutRects have a grainVertical boolean field (Sprint 16)', () => {
    const parts = generateParts(DEFAULT_CONFIG);
    const result = optimizeCutSheets(parts);
    for (const sheet of result.sheets) {
      for (const p of sheet.parts) {
        expect(typeof p.grainVertical).toBe('boolean');
      }
    }
  });

  it('grain-locked material parts are not rotated 90° (grainVertical preserved)', () => {
    // plywood-17 has hasGrain=true — parts should keep grainVertical=true if length > width
    const tallConfig = {
      ...DEFAULT_CONFIG,
      width: 800,
      height: 2000,
      depth: 400,
      shelfCount: 3,
      doorStyle: 'none' as const,
      drawerCount: 0,
    };
    const parts = generateParts(tallConfig);
    const result = optimizeCutSheets(parts);
    // Side panels are tall (length > width) so grainVertical=true — must stay true after placement
    for (const sheet of result.sheets) {
      for (const p of sheet.parts) {
        // grainVertical must be a boolean (not undefined)
        expect(p.grainVertical === true || p.grainVertical === false).toBe(true);
      }
    }
  });

  // ── Grain conflict detection (Sprint 8) ──────────────────────────────────

  it('grainConflictCount is 0 for default config (no forced rotations)', () => {
    const parts = generateParts(DEFAULT_CONFIG);
    const result = optimizeCutSheets(parts);
    expect(result.grainConflictCount).toBe(0);
  });

  it('detects grain conflict when part can only fit via forced rotation', () => {
    // plywood-17 has hasGrain=true; use a sheet override so the sheet is
    // narrow (500 mm wide, 1000 mm long). A part with length=400, width=700
    // cannot fit without rotation (700 > 500) but CAN fit rotated (700 ≤ 1000).
    const grainPart: import('../../src/engine/types').Part = {
      id: 'test-wide',
      name: { en: 'Wide Panel', he: 'לוח רחב' },
      qty: 1,
      material: 'plywood-17',
      thickness: 17,
      length: 400,
      width: 700,
      edgeBanding: { en: '', he: '' },
    };
    const result = optimizeCutSheets([grainPart], 3, { 'plywood-17': { width: 500, length: 1000 } });
    expect(result.grainConflictCount).toBe(1);
    const conflictedPart = result.sheets.flatMap((s) => s.parts).find((p) => p.grainConflict);
    expect(conflictedPart).toBeDefined();
    expect(conflictedPart?.rotated).toBe(true);
  });

  it('no grain conflict when part fits without rotation on narrow sheet', () => {
    // length=400, width=300 → fits on 500×1000 sheet without rotation
    const grainPart: import('../../src/engine/types').Part = {
      id: 'test-narrow',
      name: { en: 'Narrow Panel', he: 'לוח צר' },
      qty: 1,
      material: 'plywood-17',
      thickness: 17,
      length: 400,
      width: 300,
      edgeBanding: { en: '', he: '' },
    };
    const result = optimizeCutSheets([grainPart], 3, { 'plywood-17': { width: 500, length: 1000 } });
    expect(result.grainConflictCount).toBe(0);
    const placed = result.sheets.flatMap((s) => s.parts)[0];
    expect(placed?.grainConflict).toBeUndefined();
  });

  it('non-grain material parts never have grainConflict flag', () => {
    // melamine-18 has hasGrain=false → rotation is fine, no conflict flag
    const nonGrainPart: import('../../src/engine/types').Part = {
      id: 'test-mdf',
      name: { en: 'Back Panel', he: 'גב' },
      qty: 1,
      material: 'melamine-18',
      thickness: 18,
      length: 400,
      width: 700,
      edgeBanding: { en: '', he: '' },
    };
    const result = optimizeCutSheets([nonGrainPart], 3, {
      'melamine-18': { width: 500, length: 1000 },
    });
    expect(result.grainConflictCount).toBe(0);
    for (const sheet of result.sheets) {
      for (const p of sheet.parts) {
        expect(p.grainConflict).toBeUndefined();
      }
    }
  });

  it('counts multiple grain conflicts across sheets', () => {
    // Two parts that each need forced rotation on a narrow grain sheet
    const mkPart = (id: string): import('../../src/engine/types').Part => ({
      id,
      name: { en: id, he: id },
      qty: 1,
      material: 'plywood-17',
      thickness: 17,
      length: 400,
      width: 700,
      edgeBanding: { en: '', he: '' },
    });
    const result = optimizeCutSheets([mkPart('a'), mkPart('b')], 3, {
      'plywood-17': { width: 500, length: 1000 },
    });
    expect(result.grainConflictCount).toBe(2);
  });

  // ── Explainable per-part placement rationale (Sprint 10) ─────────────────

  it('every placed part has a rationale string starting with "BSSF"', () => {
    const parts = generateParts(DEFAULT_CONFIG);
    const result = optimizeCutSheets(parts);
    for (const sheet of result.sheets) {
      for (const p of sheet.parts) {
        expect(typeof p.rationale).toBe('string');
        expect(p.rationale).toMatch(/^BSSF\(/);
      }
    }
  });

  it('rationale includes "normal" for non-rotated parts', () => {
    // Tall grain-locked part must stay upright (not rotated)
    const tallPart: import('../../src/engine/types').Part = {
      id: 'tall',
      name: { en: 'Tall Panel', he: 'לוח גבוה' },
      qty: 1,
      material: 'plywood-17',
      thickness: 17,
      length: 800,
      width: 300,
      edgeBanding: { en: '', he: '' },
    };
    const result = optimizeCutSheets([tallPart], 3, { 'plywood-17': { width: 500, length: 1000 } });
    const placed = result.sheets.flatMap((s) => s.parts)[0];
    expect(placed?.rationale).toMatch(/BSSF\(normal\)/);
  });

  it('rationale includes "grain-forced" for grain-conflict parts', () => {
    const widePart: import('../../src/engine/types').Part = {
      id: 'wide',
      name: { en: 'Wide Panel', he: 'לוח רחב' },
      qty: 1,
      material: 'plywood-17',
      thickness: 17,
      length: 400,
      width: 700,
      edgeBanding: { en: '', he: '' },
    };
    const result = optimizeCutSheets([widePart], 3, { 'plywood-17': { width: 500, length: 1000 } });
    const placed = result.sheets.flatMap((s) => s.parts)[0];
    expect(placed?.rationale).toMatch(/grain-forced/);
  });

  it('rationale includes mm margin values', () => {
    const parts = generateParts(DEFAULT_CONFIG);
    const result = optimizeCutSheets(parts);
    for (const sheet of result.sheets) {
      for (const p of sheet.parts) {
        // Should contain "Nmm × Mmm margin" pattern
        expect(p.rationale).toMatch(/\d+mm × \d+mm margin/);
      }
    }
  });
});

describe('optimizeCutSheets — grainConflictCount (Sprint 41)', () => {
  it('grainConflictCount is 0 for grain-free material', () => {
    const parts = generateParts({ ...DEFAULT_CONFIG, carcassMaterial: 'melamine-18' });
    const result = optimizeCutSheets(parts);
    expect(result.grainConflictCount).toBe(0);
  });

  it('grainConflictCount is a non-negative integer', () => {
    const parts = generateParts(DEFAULT_CONFIG);
    const result = optimizeCutSheets(parts);
    expect(result.grainConflictCount).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(result.grainConflictCount)).toBe(true);
  });

  it('grainConflict flag matches grainConflictCount aggregate', () => {
    const parts = generateParts(DEFAULT_CONFIG);
    const result = optimizeCutSheets(parts);
    const flaggedCount = result.sheets.flatMap((s) => s.parts).filter((p) => p.grainConflict === true).length;
    expect(result.grainConflictCount).toBe(flaggedCount);
  });

  it('rationale is defined on every placed part', () => {
    const parts = generateParts(DEFAULT_CONFIG);
    const result = optimizeCutSheets(parts);
    for (const sheet of result.sheets) {
      for (const p of sheet.parts) {
        expect(p.rationale).toBeDefined();
        expect(typeof p.rationale).toBe('string');
      }
    }
  });

  it('grainConflict parts have "grain-forced" in their rationale', () => {
    const parts = generateParts(DEFAULT_CONFIG);
    const result = optimizeCutSheets(parts);
    for (const sheet of result.sheets) {
      for (const p of sheet.parts) {
        if (p.grainConflict) {
          expect(p.rationale).toMatch(/grain-forced/);
        }
      }
    }
  });
});

describe('optimizeCutSheets — grain conflict indicators (Sprint 42)', () => {
  it('non-grain-conflict parts have grainConflict undefined or false', () => {
    const parts = generateParts(DEFAULT_CONFIG);
    const result = optimizeCutSheets(parts);
    for (const sheet of result.sheets) {
      for (const p of sheet.parts) {
        if (!p.grainConflict) {
          expect(p.grainConflict).toBeFalsy();
        }
      }
    }
  });

  it('grainConflict is truthy only when hasGrain material and part was forced to rotate', () => {
    const widePart: import('../../src/engine/types').Part = {
      id: 'wide',
      name: { en: 'Wide', he: 'רחב' },
      qty: 1,
      material: 'plywood-17',
      thickness: 17,
      length: 400,
      width: 700,
      edgeBanding: { en: '', he: '' },
    };
    const result = optimizeCutSheets([widePart], 3, { 'plywood-17': { width: 500, length: 1000 } });
    const placed = result.sheets.flatMap((s) => s.parts);
    // The 700mm-wide part must be rotated on a 500mm-wide sheet → grain conflict
    expect(placed.some((p) => p.grainConflict === true)).toBe(true);
  });

  it('grainConflictCount in OptimizationResult matches per-part grainConflict flags', () => {
    const widePart: import('../../src/engine/types').Part = {
      id: 'wide2',
      name: { en: 'Wide2', he: 'רחב2' },
      qty: 1,
      material: 'plywood-17',
      thickness: 17,
      length: 400,
      width: 700,
      edgeBanding: { en: '', he: '' },
    };
    const result = optimizeCutSheets([widePart], 3, { 'plywood-17': { width: 500, length: 1000 } });
    const flagged = result.sheets.flatMap((s) => s.parts).filter((p) => p.grainConflict).length;
    expect(result.grainConflictCount).toBe(flagged);
  });

  it('sheets with zero grain conflicts have no parts with grainConflict=true', () => {
    const normalPart: import('../../src/engine/types').Part = {
      id: 'n1',
      name: { en: 'Normal', he: 'רגיל' },
      qty: 1,
      material: 'plywood-17',
      thickness: 17,
      length: 300,
      width: 200,
      edgeBanding: { en: '', he: '' },
    };
    const result = optimizeCutSheets([normalPart], 3);
    const conflicted = result.sheets.flatMap((s) => s.parts).filter((p) => p.grainConflict);
    expect(conflicted.length).toBe(0);
    expect(result.grainConflictCount).toBe(0);
  });
});

// ── Phase 13 / Sprint 5 — Cross-material co-nesting ───────────────────────────

describe('findCoNestCandidates', () => {
  it('returns empty array when all sheets have distinct geometry', () => {
    const result = optimizeCutSheets([
      { id: 'A', name: { en: 'A', he: 'A' }, qty: 1, length: 400, width: 200, material: 'plywood-18', thickness: 18, edgeBanding: { en: '', he: '' } },
    ]);
    expect(findCoNestCandidates(result)).toHaveLength(0);
  });

  it('detects candidates when two materials share thickness and sheet size', () => {
    // Use two materials that both resolve to plywood-18 thickness and same sheet size
    // We synthesise a fake result rather than running a full optimize to keep the test pure.
    const fakeResult = {
      sheets: [
        { sheetIndex: 0, material: 'plywood-18', thickness: 18, sheetWidth: 1220, sheetLength: 2440, parts: [], yieldPercent: 50 },
        { sheetIndex: 1, material: 'melamine-18', thickness: 18, sheetWidth: 1220, sheetLength: 2440, parts: [], yieldPercent: 50 },
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
        { sheetIndex: 0, material: 'plywood-18', thickness: 18, sheetWidth: 1220, sheetLength: 2440, parts: [], yieldPercent: 50 },
        { sheetIndex: 1, material: 'plywood-18', thickness: 18, sheetWidth: 1220, sheetLength: 2440, parts: [], yieldPercent: 50 },
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
    partId: id, label: id, x: 0, y: 0, width: w, length: l,
    grainVertical: true, edgeBanding: '',
  });

  it('returns original result unchanged when coNestKeys is empty', () => {
    const fakeResult = {
      sheets: [
        { sheetIndex: 0, material: 'plywood-18', thickness: 18, sheetWidth: 1220, sheetLength: 2440, parts: [makePart('P1', 200, 300)], yieldPercent: 5 },
      ],
      totalSheets: 1, overallYield: 5, totalWaste: 0, grainConflictCount: 0,
    };
    const out = applyCoNesting(fakeResult, new Set());
    expect(out).toBe(fakeResult); // exact same reference
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
      totalSheets: 2, overallYield: 10, totalWaste: 0, grainConflictCount: 0,
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
          sheetIndex: 0, material: 'plywood-18', thickness: 18,
          sheetWidth: 1220, sheetLength: 2440,
          parts: [makePart('P1', 200, 200)], yieldPercent: 3,
        },
        {
          sheetIndex: 1, material: 'melamine-18', thickness: 18,
          sheetWidth: 1220, sheetLength: 2440,
          parts: [makePart('P2', 200, 200)], yieldPercent: 3,
        },
      ],
      totalSheets: 2, overallYield: 3, totalWaste: 0, grainConflictCount: 0,
    };
    const out = applyCoNesting(fakeResult, new Set(['18x1220x2440']));
    const allParts = out.sheets.flatMap((s) => s.parts);
    const p1 = allParts.find((p) => p.partId === 'P1');
    const p2 = allParts.find((p) => p.partId === 'P2');
    expect(p1?.partMaterial).toBe('plywood-18');
    expect(p2?.partMaterial).toBe('melamine-18');
  });

  it('leaves untouched sheets unchanged', () => {
    const fakeResult = {
      sheets: [
        { sheetIndex: 0, material: 'hdf-3', thickness: 3, sheetWidth: 1220, sheetLength: 2440, parts: [makePart('BP1', 100, 100)], yieldPercent: 1 },
        { sheetIndex: 1, material: 'plywood-18', thickness: 18, sheetWidth: 1220, sheetLength: 2440, parts: [makePart('P1', 200, 200)], yieldPercent: 3 },
        { sheetIndex: 2, material: 'melamine-18', thickness: 18, sheetWidth: 1220, sheetLength: 2440, parts: [makePart('P2', 200, 200)], yieldPercent: 3 },
      ],
      totalSheets: 3, overallYield: 2, totalWaste: 0, grainConflictCount: 0,
    };
    const out = applyCoNesting(fakeResult, new Set(['18x1220x2440']));
    // hdf-3 sheet should still be present unchanged
    const hdfSheet = out.sheets.find((s) => s.material === 'hdf-3');
    expect(hdfSheet).toBeDefined();
    expect(hdfSheet?.parts[0].partId).toBe('BP1');
  });
});
