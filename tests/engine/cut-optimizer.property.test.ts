/**
 * Phase 11 — Sprint 4: Property-based tests for the MaxRects cut optimizer.
 *
 * Uses fast-check to generate arbitrary Part lists and assert four invariants
 * that must hold for every valid input:
 *
 *   1. No two placed parts on the same sheet overlap.
 *   2. yieldPercent for every sheet is in the range [0, 100].
 *   3. Parts flagged rotationLocked never appear rotated in the output.
 *   4. Every individual part instance (qty-expanded) is placed on a sheet.
 *
 * All tests use the `melamine-16` material (no-grain, 1220 × 2440 mm sheet)
 * and cap part dimensions to 1200 mm so every generated part is guaranteed to
 * fit onto a single sheet, keeping invariant 4 falsifiable.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { optimizeCutSheets } from '../../src/engine/cut-optimizer';
import type { Part } from '../../src/engine/types';

// ─── constants ───────────────────────────────────────────────────────────────
const MATERIAL = 'melamine-16'; // no grain, 1220 × 2440 mm
const MAX_DIM = 1200; // guaranteed to fit on a 1220 mm sheet side
const NUM_RUNS = 200; // fast-check iterations per property

// ─── arbitrary ───────────────────────────────────────────────────────────────
/** One Part that is guaranteed to fit on a melamine-16 sheet in either orientation. */
const arbPart: fc.Arbitrary<Part> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 8 }),
  name: fc.constant({ en: 'Part', he: 'פאנל' }),
  qty: fc.integer({ min: 1, max: 3 }),
  material: fc.constant(MATERIAL),
  thickness: fc.constant(16),
  length: fc.integer({ min: 50, max: MAX_DIM }),
  width: fc.integer({ min: 50, max: MAX_DIM }),
  edgeBanding: fc.constant({ en: 'none', he: 'אין' }),
  rotationLocked: fc.oneof(fc.constant(undefined), fc.constant(true), fc.constant(false)),
});

/** A non-empty array of up to 8 parts — large enough to span multiple sheets. */
const arbParts: fc.Arbitrary<Part[]> = fc.array(arbPart, { minLength: 1, maxLength: 8 });

// ─── helpers ─────────────────────────────────────────────────────────────────
/** Returns true when two axis-aligned rectangles do NOT share any interior area. */
function noOverlap(
  ax: number, ay: number, aw: number, al: number,
  bx: number, by: number, bw: number, bl: number,
): boolean {
  return ax + aw <= bx || bx + bw <= ax || ay + al <= by || by + bl <= ay;
}

// ─── properties ──────────────────────────────────────────────────────────────
describe('cut-optimizer property tests', () => {
  it('P1 — no two placed parts on the same sheet overlap', () => {
    fc.assert(
      fc.property(
        arbParts,
        fc.oneof(fc.constant<'freeform' | 'guillotine'>('freeform'), fc.constant<'freeform' | 'guillotine'>('guillotine')),
        (parts, cutMode) => {
          const result = optimizeCutSheets(parts, 3, {}, cutMode);
        for (const sheet of result.sheets) {
          for (let i = 0; i < sheet.parts.length; i++) {
            for (let j = i + 1; j < sheet.parts.length; j++) {
              const a = sheet.parts[i];
              const b = sheet.parts[j];
              if (
                !noOverlap(a.x, a.y, a.width, a.length, b.x, b.y, b.width, b.length)
              ) {
                return false;
              }
            }
          }
        }
        return true;
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('P2 — yieldPercent is in range [0, 100] for every sheet', () => {
    fc.assert(
      fc.property(arbParts, (parts) => {
        const result = optimizeCutSheets(parts);
        return result.sheets.every(
          (sheet) => sheet.yieldPercent >= 0 && sheet.yieldPercent <= 100,
        );
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('P3 — rotation-locked parts are never rotated in the output', () => {
    fc.assert(
      fc.property(arbParts, (parts) => {
        const lockedIds = new Set(
          parts.filter((p) => p.rotationLocked === true).map((p) => p.id),
        );
        if (lockedIds.size === 0) return true; // vacuously true

        const result = optimizeCutSheets(parts);
        return result.sheets.every((sheet) =>
          sheet.parts.every((placed) => {
            if (lockedIds.has(placed.partId)) {
              return placed.rotated !== true;
            }
            return true;
          }),
        );
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('P4 — all part instances (qty-expanded) are placed on a sheet', () => {
    fc.assert(
      fc.property(arbParts, (parts) => {
        const totalInstances = parts.reduce((sum, p) => sum + p.qty, 0);
        const result = optimizeCutSheets(parts);
        const placedCount = result.sheets.reduce((sum, sheet) => sum + sheet.parts.length, 0);
        return placedCount === totalInstances;
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('P5 — overallYield matches the sum of per-sheet used area / total sheet area', () => {
    fc.assert(
      fc.property(arbParts, (parts) => {
        const result = optimizeCutSheets(parts);
        if (result.sheets.length === 0) return true;

        const totalSheetArea = result.sheets.reduce(
          (sum, s) => sum + s.sheetWidth * s.sheetLength,
          0,
        );
        const usedArea = result.sheets.reduce(
          (sum, s) => sum + s.parts.reduce((a, p) => a + p.width * p.length, 0),
          0,
        );
        const expected = Math.round((usedArea / totalSheetArea) * 100 * 100) / 100;
        return Math.abs(result.overallYield - expected) < 0.01;
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
