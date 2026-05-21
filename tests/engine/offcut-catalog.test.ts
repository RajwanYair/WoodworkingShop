/**
 * Phase 12 / Sprint 12 — Offcut catalog two-phase packing tests.
 *
 * Verifies that optimizeCutSheets uses catalog offcuts as starting sheets
 * before opening full-size sheets.
 */
import { describe, it, expect } from 'vitest';
import { optimizeCutSheets } from '../../src/engine/cut-optimizer';
import type { Part, OffcutEntry } from '../../src/engine/types';

/** Build a minimal Part fixture for testing. */
function makePart(id: string, width: number, length: number, material = 'melamine-18'): Part {
  return {
    id,
    name: { en: id, he: id },
    width,
    length,
    thickness: 18,
    qty: 1,
    material,
    edgeBanding: { en: 'None', he: 'ללא' },
  };
}

/** Build a minimal OffcutEntry fixture for testing. */
function makeOffcut(material: string, width: number, length: number, thickness = 18): OffcutEntry {
  return {
    id: `offcut-${material}-${width}x${length}`,
    material,
    thickness,
    width,
    length,
    addedAt: Date.now(),
  };
}

describe('optimizeCutSheets offcut catalog — Phase 12 / Sprint 12', () => {
  it('without offcuts, packs a small part onto a full sheet', () => {
    const parts = [makePart('P1', 300, 400)];
    const result = optimizeCutSheets(parts, 3, {}, 'freeform', []);
    expect(result.sheets).toHaveLength(1);
    expect(result.sheets[0].sheetWidth).toBe(1220); // full sheet width for melamine-18
  });

  it('with a matching offcut, packs the part onto the offcut instead of a full sheet', () => {
    const parts = [makePart('P1', 300, 400)];
    const offcut = makeOffcut('melamine-18', 600, 800);
    const result = optimizeCutSheets(parts, 3, {}, 'freeform', [offcut]);
    expect(result.sheets).toHaveLength(1);
    // Sheet should have offcut dimensions, not full-sheet dimensions
    expect(result.sheets[0].sheetWidth).toBe(600);
    expect(result.sheets[0].sheetLength).toBe(800);
  });

  it('uses offcut for parts that fit, opens full sheet for the rest', () => {
    // Small offcut (600×400) can fit a 300×300 part but not a 900×300 part
    const smallPart = makePart('P-small', 300, 300);
    const bigPart = makePart('P-big', 900, 300);
    const offcut = makeOffcut('melamine-18', 600, 400);
    const result = optimizeCutSheets([smallPart, bigPart], 3, {}, 'freeform', [offcut]);
    // Should have 2 sheets: 1 offcut sheet + 1 full sheet
    expect(result.sheets).toHaveLength(2);
    const offcutSheet = result.sheets.find((s) => s.sheetWidth === 600);
    const fullSheet = result.sheets.find((s) => s.sheetWidth === 1220);
    expect(offcutSheet).toBeDefined();
    expect(fullSheet).toBeDefined();
  });

  it('ignores offcuts from non-matching materials', () => {
    const parts = [makePart('P1', 300, 400, 'melamine-18')];
    const offcut = makeOffcut('plywood-17', 600, 800); // different material
    const result = optimizeCutSheets(parts, 3, {}, 'freeform', [offcut]);
    // Should use full sheet (melamine-18), not the plywood offcut
    expect(result.sheets[0].sheetWidth).toBe(1220);
  });

  it('sorts offcuts by area descending (largest first)', () => {
    // Two offcuts: a small one (300×200=60000mm²) and a large one (800×600=480000mm²)
    const parts = [makePart('P1', 250, 250)]; // tiny part — fits on either
    const smallOffcut = makeOffcut('melamine-18', 300, 200);
    const largeOffcut = makeOffcut('melamine-18', 800, 600);
    const result = optimizeCutSheets(parts, 3, {}, 'freeform', [smallOffcut, largeOffcut]);
    // Should prefer the large offcut (placed first due to sort)
    expect(result.sheets[0].sheetWidth).toBe(800);
  });

  it('skips offcut if no part fits on it', () => {
    // Offcut is too small for the part
    const parts = [makePart('P1', 1000, 1000)];
    const tinyOffcut = makeOffcut('melamine-18', 200, 200);
    const result = optimizeCutSheets(parts, 3, {}, 'freeform', [tinyOffcut]);
    // Part cannot fit on 200×200 offcut, opens full sheet
    expect(result.sheets).toHaveLength(1);
    expect(result.sheets[0].sheetWidth).toBe(1220);
  });

  it('works with guillotine mode too', () => {
    const parts = [makePart('P1', 300, 400)];
    const offcut = makeOffcut('melamine-18', 600, 800);
    const result = optimizeCutSheets(parts, 3, {}, 'guillotine', [offcut]);
    expect(result.sheets).toHaveLength(1);
    expect(result.sheets[0].sheetWidth).toBe(600);
  });

  it('empty offcut catalog behaves identically to no-offcuts path', () => {
    const parts = [makePart('P1', 300, 400), makePart('P2', 500, 600)];
    const withEmpty = optimizeCutSheets(parts, 3, {}, 'freeform', []);
    const withoutParam = optimizeCutSheets(parts, 3, {}, 'freeform');
    expect(withEmpty.totalSheets).toBe(withoutParam.totalSheets);
    expect(withEmpty.overallYield).toBe(withoutParam.overallYield);
  });

  it('totalSheets and grainConflictCount remain accurate when offcuts are used', () => {
    const parts = [makePart('P1', 300, 400), makePart('P2', 400, 300)];
    const offcut = makeOffcut('melamine-18', 900, 500);
    const result = optimizeCutSheets(parts, 3, {}, 'freeform', [offcut]);
    expect(result.totalSheets).toBe(result.sheets.length);
    expect(result.grainConflictCount).toBeGreaterThanOrEqual(0);
  });
});
