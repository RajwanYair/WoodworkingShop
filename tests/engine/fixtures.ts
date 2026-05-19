/**
 * Deterministic cut-optimizer regression fixtures.
 *
 * Each fixture is a canonical Part[] array representing a well-defined
 * edge-case layout scenario. The optimizer must produce identical, valid
 * output for these inputs on every run.
 */
import type { Part } from '../../src/engine/types';

/** Helper: build a minimal Part record. */
function part(id: string, qty: number, material: string, thickness: number, length: number, width: number): Part {
  return {
    id,
    name: { en: `Part ${id}`, he: `חלק ${id}` },
    qty,
    material,
    thickness,
    length,
    width,
    edgeBanding: { en: '', he: '' },
  };
}

// ─── Fixtures ───────────────────────────────────────────────────────────────

/** No parts at all — optimizer must return zero sheets without throwing. */
export const ZERO_PARTS: Part[] = [];

/**
 * One large plywood-17 part (grain material, rotation forbidden).
 * Sheet: 1220 × 2440 mm, part: 1000 × 800 mm.
 * Expected: 1 sheet, placed at (0,0), grainVertical=true.
 */
export const SINGLE_GRAIN_PART: Part[] = [part('P01', 1, 'plywood-17', 17, 1000, 800)];

/**
 * Three plywood-17 parts (hasGrain=true → rotation never allowed).
 * All placed parts must have grainVertical=true and rotated=false.
 * Sizes chosen to comfortably fit on one 1220×2440 sheet.
 */
export const GRAIN_LOCKED_PARTS: Part[] = [
  part('G01', 1, 'plywood-17', 17, 700, 300),
  part('G02', 1, 'plywood-17', 17, 700, 300),
  part('G03', 1, 'plywood-17', 17, 500, 400),
];

/**
 * Four melamine-16 parts (hasGrain=false → rotation is allowed).
 * Two parts are wider than tall; after packing the optimizer may rotate
 * some to improve fit. All must still be placed within sheet bounds.
 * Sheet: 1220 × 2440. Sizes force at least one rotation opportunity.
 */
export const GRAIN_FREE_PARTS: Part[] = [
  part('M01', 1, 'melamine-16', 16, 400, 1100),
  part('M02', 1, 'melamine-16', 16, 400, 1100),
  part('M03', 1, 'melamine-16', 16, 200, 600),
  part('M04', 1, 'melamine-16', 16, 200, 600),
];

/**
 * Large multi-shelf bookshelf approximation using melamine-18.
 * Many medium-size parts forcing 2+ sheets.
 * Regression: all parts must be placed, no parts lost across sheet splits.
 */
export const MULTI_SHEET_PARTS: Part[] = [
  part('L01', 2, 'melamine-18', 18, 2200, 400), // tall side panels
  part('L02', 6, 'melamine-18', 18, 800, 400), // shelves
  part('L03', 2, 'melamine-18', 18, 800, 380), // top / bottom
];

/**
 * Narrow tall parts for a grain-free material where rotating a 1200×100
 * part to 100×1200 saves significant width.
 * Sheet: 1220 wide. A 1200-wide part would fit upright (y=1200) or rotated
 * (x=1200). The optimizer picks the BSSF-optimal orientation.
 */
export const NARROW_TALL_PARTS: Part[] = [
  part('N01', 4, 'melamine-16', 16, 1200, 100),
  part('N02', 2, 'melamine-16', 16, 600, 200),
];

/**
 * v3.51.0 — Large multi-cabinet project fixture (simulates 10 kitchen cabinets).
 * Tests optimizer stability and determinism under realistic project load.
 * Mix of grain-sensitive plywood and grain-free melamine parts.
 * Expected: 8-12 sheets, all parts placed, yield > 60%.
 */
export const LARGE_PROJECT_PARTS: Part[] = [
  // 10 side panels (plywood, grain-locked)
  part('LP01', 10, 'plywood-17', 17, 720, 560),
  // 10 top/bottom panels (plywood, grain-locked)
  part('LP02', 20, 'plywood-17', 17, 560, 560),
  // 10 back panels (melamine, rotation allowed)
  part('LP03', 10, 'melamine-16', 16, 700, 540),
  // 30 shelves (melamine, rotation allowed)
  part('LP04', 30, 'melamine-18', 18, 540, 360),
  // 10 kick plates (melamine)
  part('LP05', 10, 'melamine-18', 18, 540, 100),
  // 20 door panels (plywood, grain-locked)
  part('LP06', 20, 'plywood-17', 17, 700, 280),
];

/**
 * v3.51.0 — Oversized part that exceeds a single sheet dimension.
 * Optimizer must handle gracefully (skip or report unplaceable).
 */
export const OVERSIZED_PART: Part[] = [
  part('OS01', 1, 'melamine-18', 18, 3000, 1500),
];
