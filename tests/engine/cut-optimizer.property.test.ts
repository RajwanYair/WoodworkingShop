/**
 * Phase 11 — Sprint 4: Property-based tests for the MaxRects cut optimizer.
 *
 * Uses fast-check to generate arbitrary Part lists and assert packing invariants
 * that must hold for every valid input:
 *
 *   1. No two placed parts on the same sheet overlap.
 *   2. yieldPercent for every sheet is in the range [0, 100].
 *   3. Parts flagged rotationLocked never appear rotated in the output.
 *   4. Every individual part instance (qty-expanded) is placed on a sheet.
 *
 * The general packing properties use `melamine-16` (no-grain, 1220 × 2440 mm)
 * with part dimensions capped at 1200 mm. Grain-specific properties use
 * `plywood-18` to exercise orientation constraints and conflict reporting.
 */
import { describe, expect, it, vi } from 'vitest';
import * as fc from 'fast-check';
import { optimizeCutSheets } from '../../src/engine/cut-optimizer';
import type { Part } from '../../src/engine/types';
import { propertyRunOptions } from '../property-seeds';

// ─── constants ───────────────────────────────────────────────────────────────
const MATERIAL = 'melamine-16'; // no grain, 1220 × 2440 mm
const MAX_DIM = 1200; // guaranteed to fit on a 1220 mm sheet side
const NUM_RUNS = 200; // fast-check iterations per property

// ─── arbitrary ───────────────────────────────────────────────────────────────
/** One Part that is guaranteed to fit on a melamine-16 sheet in either orientation. */
const arbPart: fc.Arbitrary<Part> = fc.record({
  id: fc.stringMatching(/^[a-z][a-z0-9]{0,7}$/),
  name: fc.constant({ en: 'Part', he: 'פאנל' }),
  qty: fc.integer({ min: 1, max: 3 }),
  material: fc.constant(MATERIAL),
  thickness: fc.constant(16),
  length: fc.integer({ min: 50, max: MAX_DIM }),
  width: fc.integer({ min: 50, max: MAX_DIM }),
  edgeBanding: fc.constant({ en: 'none', he: 'אין' }),
  rotationLocked: fc.oneof(fc.constant(undefined), fc.constant(true), fc.constant(false)),
});

/** A non-empty array of up to 8 parts with unique IDs — large enough to span multiple sheets. */
const arbParts: fc.Arbitrary<Part[]> = fc
  .array(arbPart, { minLength: 1, maxLength: 8 })
  .map((parts) => parts.map((p, i) => ({ ...p, id: `p${i}` })));

// ─── helpers ─────────────────────────────────────────────────────────────────
/** Returns true when two axis-aligned rectangles do NOT share any interior area. */
function noOverlap(
  ax: number,
  ay: number,
  aw: number,
  al: number,
  bx: number,
  by: number,
  bw: number,
  bl: number,
): boolean {
  return ax + aw <= bx || bx + bw <= ax || ay + al <= by || by + bl <= ay;
}

function hasKerfClearance(
  placements: Array<{ x: number; y: number; width: number; length: number }>,
  kerf: number,
): boolean {
  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      const first = placements[i];
      const second = placements[j];
      const horizontalGap = Math.max(second.x - (first.x + first.width), first.x - (second.x + second.width));
      const verticalGap = Math.max(second.y - (first.y + first.length), first.y - (second.y + second.length));

      if (horizontalGap < kerf && verticalGap < kerf) return false;
    }
  }
  return true;
}

// ─── properties ──────────────────────────────────────────────────────────────
describe('cut-optimizer property tests', () => {
  it('P8 — preserves kerf clearance for diagonal placements near a corner', () => {
    const parts: Part[] = [
      {
        id: 'p0',
        name: { en: 'Part', he: 'Panel' },
        qty: 1,
        material: MATERIAL,
        thickness: 16,
        length: 433,
        width: 50,
        edgeBanding: { en: 'none', he: 'none' },
      },
      {
        id: 'p1',
        name: { en: 'Part', he: 'Panel' },
        qty: 1,
        material: MATERIAL,
        thickness: 16,
        length: 50,
        width: 50,
        edgeBanding: { en: 'none', he: 'none' },
      },
      {
        id: 'p2',
        name: { en: 'Part', he: 'Panel' },
        qty: 2,
        material: MATERIAL,
        thickness: 16,
        length: 383,
        width: 51,
        edgeBanding: { en: 'none', he: 'none' },
      },
    ];
    const result = optimizeCutSheets(parts, 11, {}, 'freeform');
    expect(result.sheets.every((sheet) => hasKerfClearance(sheet.parts, 11))).toBe(true);
  });

  it('P1 — no two placed parts on the same sheet overlap', () => {
    fc.assert(
      fc.property(
        arbParts,
        fc.oneof(
          fc.constant<'freeform' | 'guillotine'>('freeform'),
          fc.constant<'freeform' | 'guillotine'>('guillotine'),
        ),
        (parts, cutMode) => {
          const result = optimizeCutSheets(parts, 3, {}, cutMode);
          for (const sheet of result.sheets) {
            for (let i = 0; i < sheet.parts.length; i++) {
              for (let j = i + 1; j < sheet.parts.length; j++) {
                const a = sheet.parts[i];
                const b = sheet.parts[j];
                if (!noOverlap(a.x, a.y, a.width, a.length, b.x, b.y, b.width, b.length)) {
                  return false;
                }
              }
            }
          }
          return true;
        },
      ),
      propertyRunOptions('tests/engine/cut-optimizer.property.test.ts', NUM_RUNS),
    );
  });

  it('P2 — yieldPercent is in range [0, 100] for every sheet', () => {
    fc.assert(
      fc.property(arbParts, (parts) => {
        const result = optimizeCutSheets(parts);
        return result.sheets.every((sheet) => sheet.yieldPercent >= 0 && sheet.yieldPercent <= 100);
      }),
      propertyRunOptions('tests/engine/cut-optimizer.property.test.ts', NUM_RUNS),
    );
  });

  it('P6 — every placed rectangle stays within its sheet bounds', () => {
    fc.assert(
      fc.property(arbParts, (parts) => {
        const result = optimizeCutSheets(parts);
        return result.sheets.every((sheet) =>
          sheet.parts.every(
            (placed) =>
              placed.x >= 0 &&
              placed.y >= 0 &&
              placed.x + placed.width <= sheet.sheetWidth &&
              placed.y + placed.length <= sheet.sheetLength,
          ),
        );
      }),
      propertyRunOptions('tests/engine/cut-optimizer.property.test.ts', NUM_RUNS),
    );
  });

  it('P7 — placements preserve the generated kerf clearance in both cut modes', () => {
    fc.assert(
      fc.property(
        arbParts,
        fc.integer({ min: 0, max: 12 }),
        fc.constantFrom<'freeform' | 'guillotine'>('freeform', 'guillotine'),
        (parts, sawKerfMm, cutMode) => {
          const result = optimizeCutSheets(parts, sawKerfMm, {}, cutMode);
          return result.sheets.every((sheet) => hasKerfClearance(sheet.parts, sawKerfMm));
        },
      ),
      {
        ...propertyRunOptions('tests/engine/cut-optimizer.property.test.ts', NUM_RUNS),
        path: '183:3:2:6:3:2:3:3:6:6:6:7:10:7:7:6:6:15:18:18:19:1:0:7:3:3:8:3:3:3:3:9:3:3:3:5:3:3:12:4:3:3:15:16:16:16:31:0:4:2:4:2:7:8:8:13:8:9:9:9:10',
      },
    );
  });

  it('P3 — rotation-locked parts are never rotated in the output', () => {
    fc.assert(
      fc.property(arbParts, (parts) => {
        const lockedIds = new Set(parts.filter((p) => p.rotationLocked === true).map((p) => p.id));
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
      propertyRunOptions('tests/engine/cut-optimizer.property.test.ts', NUM_RUNS),
    );
  });

  it('P9 — isolated grain-bearing parts that fit naturally are never rotated', () => {
    const grainPart = arbPart.map((part) => ({ ...part, material: 'plywood-18', thickness: 18 }));
    fc.assert(
      fc.property(grainPart, fc.constantFrom<'freeform' | 'guillotine'>('freeform', 'guillotine'), (part, cutMode) => {
        const result = optimizeCutSheets([part], 3, {}, cutMode);

        return result.sheets.every((sheet) =>
          sheet.parts.every((placed) => placed.rotated !== true && placed.grainVertical && !placed.grainConflict),
        );
      }),
      propertyRunOptions('tests/engine/cut-optimizer.property.test.ts', NUM_RUNS),
    );
  });

  it('P10 — reports every forced grain rotation as a conflict', () => {
    const grainParts = arbParts.map((parts) =>
      parts.map((part) => ({ ...part, material: 'plywood-18', thickness: 18 })),
    );

    fc.assert(
      fc.property(
        grainParts,
        fc.constantFrom<'freeform' | 'guillotine'>('freeform', 'guillotine'),
        (parts, cutMode) => {
          const result = optimizeCutSheets(parts, 3, {}, cutMode);
          const placements = result.sheets.flatMap((sheet) => sheet.parts);
          const conflictCount = placements.filter((placed) => placed.grainConflict === true).length;

          return (
            placements.every((placed) => placed.rotated !== true || placed.grainConflict === true) &&
            result.grainConflictCount === conflictCount
          );
        },
      ),
      propertyRunOptions('tests/engine/cut-optimizer.property.test.ts', NUM_RUNS),
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
      propertyRunOptions('tests/engine/cut-optimizer.property.test.ts', NUM_RUNS),
    );
  });

  it('P5 — overallYield matches the sum of per-sheet used area / total sheet area', () => {
    fc.assert(
      fc.property(arbParts, (parts) => {
        const result = optimizeCutSheets(parts);
        if (result.sheets.length === 0) return true;

        const totalSheetArea = result.sheets.reduce((sum, s) => sum + s.sheetWidth * s.sheetLength, 0);
        const usedArea = result.sheets.reduce((sum, s) => sum + s.parts.reduce((a, p) => a + p.width * p.length, 0), 0);
        const expected = Math.round((usedArea / totalSheetArea) * 100 * 100) / 100;
        return Math.abs(result.overallYield - expected) < 0.01;
      }),
      propertyRunOptions('tests/engine/cut-optimizer.property.test.ts', NUM_RUNS),
    );
  });

  it('P11 — mixed-material placements retain their source material and thickness', () => {
    const mixedMaterialParts = arbParts.map((parts) =>
      parts.map((part, index) => ({
        ...part,
        material: index % 2 === 0 ? 'melamine-16' : 'plywood-18',
        thickness: index % 2 === 0 ? 16 : 18,
      })),
    );

    fc.assert(
      fc.property(
        mixedMaterialParts,
        fc.constantFrom<'freeform' | 'guillotine'>('freeform', 'guillotine'),
        (parts, cutMode) => {
          const result = optimizeCutSheets(parts, 3, {}, cutMode);
          const expectedCount = parts.reduce((count, part) => count + part.qty, 0);
          const placedCount = result.sheets.reduce((count, sheet) => count + sheet.parts.length, 0);

          return (
            placedCount === expectedCount &&
            result.sheets.every((sheet) =>
              sheet.parts.every((placed) => {
                const source = parts.find((part) => part.id === placed.partId);
                return source?.material === sheet.material && source.thickness === sheet.thickness;
              }),
            )
          );
        },
      ),
      propertyRunOptions('tests/engine/cut-optimizer.property.test.ts', NUM_RUNS),
    );
  });

  it('P12 — freeform placements stay clear of generated defect zones', () => {
    const defectZone = { x: 0, y: 0, width: 350, length: 350 };

    fc.assert(
      fc.property(arbParts, (parts) => {
        const result = optimizeCutSheets(parts, 3, {}, 'freeform', [], { [MATERIAL]: [defectZone] });
        const expectedCount = parts.reduce((count, part) => count + part.qty, 0);
        const placedParts = result.sheets.flatMap((sheet) => sheet.parts);

        return (
          placedParts.length === expectedCount &&
          placedParts.every(
            (part) =>
              part.x >= defectZone.x + defectZone.width ||
              part.x + part.width <= defectZone.x ||
              part.y >= defectZone.y + defectZone.length ||
              part.y + part.length <= defectZone.y,
          )
        );
      }),
      propertyRunOptions('tests/engine/cut-optimizer.property.test.ts', NUM_RUNS),
    );
  });

  it('P13 — guillotine mode rejects generated active defect constraints', () => {
    const defectZone = { x: 0, y: 0, width: 350, length: 350 };

    fc.assert(
      fc.property(arbParts, (parts) => {
        expect(() => optimizeCutSheets(parts, 3, {}, 'guillotine', [], { [MATERIAL]: [defectZone] })).toThrow(
          RangeError,
        );
        return true;
      }),
      propertyRunOptions('tests/engine/cut-optimizer.property.test.ts', NUM_RUNS),
    );
  });

  it('P14 — duplicate part IDs preserve the aggregate requested quantity', () => {
    const duplicateIds = fc
      .array(arbPart, { minLength: 1, maxLength: 8 })
      .map((parts) => parts.map((part) => ({ ...part, id: 'shared-part-id' })));

    fc.assert(
      fc.property(duplicateIds, (parts) => {
        const result = optimizeCutSheets(parts);
        const expectedParts = parts
          .flatMap((part) =>
            Array.from({ length: part.qty }, () => {
              const sides = [part.length, part.width].sort((first, second) => first - second);
              return `${part.id}|${part.material}|${sides[0]}|${sides[1]}`;
            }),
          )
          .sort();
        const actualParts = result.sheets
          .flatMap((sheet) =>
            sheet.parts.map((part) => {
              const sides = [part.length, part.width].sort((first, second) => first - second);
              return `${part.partId}|${sheet.material}|${sides[0]}|${sides[1]}`;
            }),
          )
          .sort();

        return JSON.stringify(actualParts) === JSON.stringify(expectedParts);
      }),
      propertyRunOptions('tests/engine/cut-optimizer.property.test.ts', NUM_RUNS),
    );
  });

  it.each(['freeform', 'guillotine'] as const)('P15 — %s accepts an exact-boundary fit', (cutMode) => {
    const boundaryPart: Part = {
      id: 'boundary-fit',
      name: { en: 'Boundary fit', he: 'Boundary fit' },
      qty: 1,
      material: MATERIAL,
      thickness: 16,
      length: 1000,
      width: 1000,
      edgeBanding: { en: 'none', he: 'none' },
    };
    const result = optimizeCutSheets([boundaryPart], 3, { [MATERIAL]: { width: 1000, length: 1000 } }, cutMode);

    expect(result.sheets.flatMap((sheet) => sheet.parts)).toHaveLength(1);
  });

  it('P16 — preserves bounds when placements use large coordinates', () => {
    const parts: Part[] = [
      {
        id: 'wide-strip',
        name: { en: 'Wide strip', he: 'Wide strip' },
        qty: 1,
        material: MATERIAL,
        thickness: 16,
        length: 1000,
        width: 99900,
        edgeBanding: { en: 'none', he: 'none' },
      },
      {
        id: 'end-panel',
        name: { en: 'End panel', he: 'End panel' },
        qty: 1,
        material: MATERIAL,
        thickness: 16,
        length: 1000,
        width: 90,
        edgeBanding: { en: 'none', he: 'none' },
      },
    ];
    const result = optimizeCutSheets(parts, 3, { [MATERIAL]: { width: 100000, length: 2000 } });
    const placements = result.sheets.flatMap((sheet) => sheet.parts);

    expect(placements).toHaveLength(parts.length);
    expect(placements.every((part) => part.x >= 0 && part.x + part.width <= 100000)).toBe(true);
    expect(placements.find((part) => part.partId === 'end-panel')?.x).toBeGreaterThan(99000);
  });

  it('P17 — never returns placements for generated parts that cannot fit stock', () => {
    const impossiblePart = fc
      .record({
        length: fc.integer({ min: 2441, max: 5000 }),
        width: fc.integer({ min: 1221, max: 3000 }),
      })
      .map(({ length, width }): Part => ({
        id: 'impossible-part',
        name: { en: 'Impossible part', he: 'Impossible part' },
        qty: 1,
        material: MATERIAL,
        thickness: 16,
        length,
        width,
        edgeBanding: { en: 'none', he: 'none' },
      }));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    try {
      fc.assert(
        fc.property(
          impossiblePart,
          fc.constantFrom<'freeform' | 'guillotine'>('freeform', 'guillotine'),
          (part, cutMode) => {
            const result = optimizeCutSheets([part], 3, { [MATERIAL]: { width: 1220, length: 2440 } }, cutMode);
            return result.sheets.every((sheet) => sheet.parts.length === 0);
          },
        ),
        propertyRunOptions('tests/engine/cut-optimizer.property.test.ts', NUM_RUNS),
      );
    } finally {
      warn.mockRestore();
    }
  });
});
