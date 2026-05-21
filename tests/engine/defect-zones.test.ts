/**
 * Phase 12 / Sprint 13 — Sheet defect zone avoidance tests.
 *
 * Verifies that `optimizeCutSheets` (MaxRects mode) pre-blocks defect zones
 * on every new sheet so placed parts never overlap the marked regions.
 */
import { describe, it, expect } from 'vitest';
import { optimizeCutSheets } from '../../src/engine/cut-optimizer';
import type { Part, DefectZone } from '../../src/engine/types';

/** Build a minimal Part fixture for testing. */
function makePart(id: string, width: number, length: number, material = 'melamine-18', qty = 1): Part {
  return {
    id,
    name: { en: id, he: id },
    width,
    length,
    thickness: 18,
    qty,
    material,
    edgeBanding: { en: 'None', he: 'ללא' },
  };
}

/** Check whether a placed part overlaps a defect zone (both in mm). */
function partOverlapsZone(
  p: { x: number; y: number; width: number; length: number },
  dz: DefectZone,
): boolean {
  return p.x < dz.x + dz.width && p.x + p.width > dz.x && p.y < dz.y + dz.length && p.y + p.length > dz.y;
}

describe('optimizeCutSheets defect zone avoidance — Phase 12 / Sprint 13', () => {
  it('without defect zones, places a part at origin', () => {
    const parts = [makePart('P1', 300, 400)];
    const result = optimizeCutSheets(parts, 3, {}, 'freeform', [], {});
    expect(result.sheets).toHaveLength(1);
    const placed = result.sheets[0].parts[0];
    expect(placed.x).toBe(0);
    expect(placed.y).toBe(0);
  });

  it('avoids a defect zone at the top-left corner', () => {
    // Sheet: 2440×1220. Defect zone: 400×300 at (0,0).
    // Part (300×200) should NOT land at origin — must be displaced.
    const parts = [makePart('P1', 300, 200)];
    const dz: DefectZone = { x: 0, y: 0, width: 400, length: 300 };
    const result = optimizeCutSheets(parts, 3, {}, 'freeform', [], { 'melamine-18': [dz] });
    expect(result.sheets).toHaveLength(1);
    const placed = result.sheets[0].parts[0];
    expect(partOverlapsZone(placed, dz)).toBe(false);
  });

  it('can still pack a part that fits beside the defect zone on the same sheet', () => {
    // Defect zone blocks (0,0) to (500,300). A 200×200 part can fit at x=500 or y=300.
    const parts = [makePart('P1', 200, 200)];
    const dz: DefectZone = { x: 0, y: 0, width: 500, length: 300 };
    const result = optimizeCutSheets(parts, 3, {}, 'freeform', [], { 'melamine-18': [dz] });
    expect(result.sheets).toHaveLength(1);
    const placed = result.sheets[0].parts[0];
    expect(partOverlapsZone(placed, dz)).toBe(false);
  });

  it('opens a second sheet when defect zone leaves no room for all parts', () => {
    // Sheet 1220×2440 (melamine-18). Block from y=0 to y=2320 — only 120 mm height remaining at bottom.
    // Pack 3 parts of 400×400 — they can't fit in a 1220×120 strip, so extra sheets open.
    const dz: DefectZone = { x: 0, y: 0, width: 1220, length: 2320 };
    const parts = [
      makePart('P1', 400, 400),
      makePart('P2', 400, 400),
      makePart('P3', 400, 400),
    ];
    const result = optimizeCutSheets(parts, 3, {}, 'freeform', [], { 'melamine-18': [dz] });
    // All sheets must have no part overlapping the defect zone
    for (const sheet of result.sheets) {
      for (const p of sheet.parts) {
        expect(partOverlapsZone(p, dz)).toBe(false);
      }
    }
    // With the first 2320 mm blocked, only 120 mm height is usable per sheet.
    // 400×400 parts don't fit there → expect more than one sheet
    expect(result.sheets.length).toBeGreaterThan(1);
  });

  it('applies defect zones only to the matching material', () => {
    // Two materials: melamine-18 and plywood-18. Defect zone only on plywood-18.
    const parts = [
      makePart('M1', 300, 300, 'melamine-18'),
      makePart('W1', 300, 300, 'plywood-18'),
    ];
    const dz: DefectZone = { x: 0, y: 0, width: 400, length: 400 };
    const result = optimizeCutSheets(parts, 3, {}, 'freeform', [], { 'plywood-18': [dz] });

    const melSheet = result.sheets.find((s) => s.material === 'melamine-18');
    const plySheet = result.sheets.find((s) => s.material === 'plywood-18');
    expect(melSheet).toBeDefined();
    expect(plySheet).toBeDefined();

    // melamine part should be at origin (no defect zone on it)
    expect(melSheet!.parts[0].x).toBe(0);
    expect(melSheet!.parts[0].y).toBe(0);

    // plywood part must NOT overlap the defect zone
    expect(partOverlapsZone(plySheet!.parts[0], dz)).toBe(false);
  });

  it('handles multiple defect zones on the same sheet', () => {
    // Block two corners with defect zones.
    const dz1: DefectZone = { x: 0, y: 0, width: 300, length: 300 };       // top-left
    const dz2: DefectZone = { x: 2140, y: 0, width: 300, length: 300 };    // top-right
    const parts = [makePart('P1', 200, 200)];
    const result = optimizeCutSheets(parts, 3, {}, 'freeform', [], {
      'melamine-18': [dz1, dz2],
    });
    expect(result.sheets).toHaveLength(1);
    const placed = result.sheets[0].parts[0];
    expect(partOverlapsZone(placed, dz1)).toBe(false);
    expect(partOverlapsZone(placed, dz2)).toBe(false);
  });

  it('empty defect zones map behaves the same as no defect zones', () => {
    const parts = [makePart('P1', 300, 400)];
    const r1 = optimizeCutSheets(parts, 3, {}, 'freeform', [], {});
    const r2 = optimizeCutSheets(parts, 3, {}, 'freeform', []);
    expect(r1.sheets[0].parts[0].x).toBe(r2.sheets[0].parts[0].x);
    expect(r1.sheets[0].parts[0].y).toBe(r2.sheets[0].parts[0].y);
  });

  it('defect zones do not affect guillotine mode (silently ignored)', () => {
    // Guillotine does not implement defect zone pre-blocking; should still pack
    // without crashing and place at least one part.
    const parts = [makePart('P1', 300, 400)];
    const dz: DefectZone = { x: 0, y: 0, width: 400, length: 300 };
    const result = optimizeCutSheets(parts, 3, {}, 'guillotine', [], { 'melamine-18': [dz] });
    expect(result.sheets).toHaveLength(1);
    expect(result.sheets[0].parts).toHaveLength(1);
  });

  it('totalSheets and grainConflictCount remain accurate with defect zones', () => {
    const parts = [makePart('P1', 300, 400)];
    const dz: DefectZone = { x: 0, y: 0, width: 100, length: 100 };
    const result = optimizeCutSheets(parts, 3, {}, 'freeform', [], { 'melamine-18': [dz] });
    expect(result.totalSheets).toBe(result.sheets.length);
    expect(result.grainConflictCount).toBeGreaterThanOrEqual(0);
  });
});
