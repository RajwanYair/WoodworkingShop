import { describe, it, expect } from 'vitest';
import { optimizeCutSheets } from '../../src/engine/cut-optimizer';
import {
  ZERO_PARTS,
  SINGLE_GRAIN_PART,
  GRAIN_LOCKED_PARTS,
  GRAIN_FREE_PARTS,
  MULTI_SHEET_PARTS,
  NARROW_TALL_PARTS,
} from './fixtures';

// ─── Helper ─────────────────────────────────────────────────────────────────

/** Returns true if two axis-aligned rectangles [x,x+w) × [y,y+h) overlap. */
function rectsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// ─── Regression suite ───────────────────────────────────────────────────────

describe('cut-optimizer regression fixtures', () => {
  describe('ZERO_PARTS', () => {
    it('returns 0 sheets and 0% yield for empty input', () => {
      const r = optimizeCutSheets(ZERO_PARTS);
      expect(r.totalSheets).toBe(0);
      expect(r.sheets).toHaveLength(0);
      expect(r.overallYield).toBe(0);
    });
  });

  describe('SINGLE_GRAIN_PART', () => {
    it('places exactly 1 part on 1 sheet at origin', () => {
      const r = optimizeCutSheets(SINGLE_GRAIN_PART);
      expect(r.totalSheets).toBe(1);
      expect(r.sheets[0].parts).toHaveLength(1);
      const p = r.sheets[0].parts[0];
      expect(p.x).toBe(0);
      expect(p.y).toBe(0);
    });

    it('grain-material part is placed with grainVertical=true and rotated=false', () => {
      const r = optimizeCutSheets(SINGLE_GRAIN_PART);
      const p = r.sheets[0].parts[0];
      expect(p.grainVertical).toBe(true);
      expect(p.rotated).toBe(false);
    });

    it('yield is positive and ≤100', () => {
      const r = optimizeCutSheets(SINGLE_GRAIN_PART);
      expect(r.sheets[0].yieldPercent).toBeGreaterThan(0);
      expect(r.sheets[0].yieldPercent).toBeLessThanOrEqual(100);
    });
  });

  describe('GRAIN_LOCKED_PARTS', () => {
    it('all plywood-17 parts are placed with grainVertical=true', () => {
      const r = optimizeCutSheets(GRAIN_LOCKED_PARTS);
      for (const sheet of r.sheets) {
        for (const p of sheet.parts) {
          expect(p.grainVertical).toBe(true);
        }
      }
    });

    it('no part has rotated=true for a grain material', () => {
      const r = optimizeCutSheets(GRAIN_LOCKED_PARTS);
      for (const sheet of r.sheets) {
        for (const p of sheet.parts) {
          expect(p.rotated).toBe(false);
        }
      }
    });

    it('all 3 parts are placed', () => {
      const r = optimizeCutSheets(GRAIN_LOCKED_PARTS);
      const placed = r.sheets.reduce((n, s) => n + s.parts.length, 0);
      expect(placed).toBe(3);
    });

    it('fits on a single sheet', () => {
      const r = optimizeCutSheets(GRAIN_LOCKED_PARTS);
      expect(r.totalSheets).toBe(1);
    });
  });

  describe('GRAIN_FREE_PARTS', () => {
    it('all 4 parts are placed', () => {
      const r = optimizeCutSheets(GRAIN_FREE_PARTS);
      const placed = r.sheets.reduce((n, s) => n + s.parts.length, 0);
      expect(placed).toBe(4);
    });

    it('all parts stay within sheet bounds', () => {
      const r = optimizeCutSheets(GRAIN_FREE_PARTS);
      for (const sheet of r.sheets) {
        for (const p of sheet.parts) {
          expect(p.x).toBeGreaterThanOrEqual(0);
          expect(p.y).toBeGreaterThanOrEqual(0);
          expect(p.x + p.width).toBeLessThanOrEqual(sheet.sheetWidth + 0.01);
          expect(p.y + p.length).toBeLessThanOrEqual(sheet.sheetLength + 0.01);
        }
      }
    });

    it('no two parts on the same sheet overlap', () => {
      const r = optimizeCutSheets(GRAIN_FREE_PARTS);
      for (const sheet of r.sheets) {
        const ps = sheet.parts;
        for (let i = 0; i < ps.length; i++) {
          for (let j = i + 1; j < ps.length; j++) {
            const a = ps[i];
            const b = ps[j];
            expect(rectsOverlap(a.x, a.y, a.width, a.length, b.x, b.y, b.width, b.length)).toBe(false);
          }
        }
      }
    });
  });

  describe('MULTI_SHEET_PARTS', () => {
    it('all parts are placed across sheets', () => {
      const r = optimizeCutSheets(MULTI_SHEET_PARTS);
      const totalQty = MULTI_SHEET_PARTS.reduce((n, p) => n + p.qty, 0);
      const placed = r.sheets.reduce((n, s) => n + s.parts.length, 0);
      expect(placed).toBe(totalQty);
    });

    it('requires more than 1 sheet', () => {
      const r = optimizeCutSheets(MULTI_SHEET_PARTS);
      expect(r.totalSheets).toBeGreaterThan(1);
    });

    it('no overlapping parts on any sheet', () => {
      const r = optimizeCutSheets(MULTI_SHEET_PARTS);
      for (const sheet of r.sheets) {
        const ps = sheet.parts;
        for (let i = 0; i < ps.length; i++) {
          for (let j = i + 1; j < ps.length; j++) {
            const a = ps[i];
            const b = ps[j];
            expect(rectsOverlap(a.x, a.y, a.width, a.length, b.x, b.y, b.width, b.length)).toBe(false);
          }
        }
      }
    });

    it('overall yield is positive', () => {
      const r = optimizeCutSheets(MULTI_SHEET_PARTS);
      expect(r.overallYield).toBeGreaterThan(0);
    });
  });

  describe('NARROW_TALL_PARTS', () => {
    it('all parts are placed', () => {
      const r = optimizeCutSheets(NARROW_TALL_PARTS);
      const totalQty = NARROW_TALL_PARTS.reduce((n, p) => n + p.qty, 0);
      const placed = r.sheets.reduce((n, s) => n + s.parts.length, 0);
      expect(placed).toBe(totalQty);
    });

    it('all parts fit within sheet bounds', () => {
      const r = optimizeCutSheets(NARROW_TALL_PARTS);
      for (const sheet of r.sheets) {
        for (const p of sheet.parts) {
          expect(p.x + p.width).toBeLessThanOrEqual(sheet.sheetWidth + 0.01);
          expect(p.y + p.length).toBeLessThanOrEqual(sheet.sheetLength + 0.01);
        }
      }
    });
  });

  describe('determinism', () => {
    it('two runs on GRAIN_FREE_PARTS produce identical sheet count and placements', () => {
      const r1 = optimizeCutSheets(GRAIN_FREE_PARTS);
      const r2 = optimizeCutSheets(GRAIN_FREE_PARTS);
      expect(r1.totalSheets).toBe(r2.totalSheets);
      expect(r1.overallYield).toBe(r2.overallYield);
      for (let si = 0; si < r1.sheets.length; si++) {
        expect(r1.sheets[si].parts.length).toBe(r2.sheets[si].parts.length);
        for (let pi = 0; pi < r1.sheets[si].parts.length; pi++) {
          const a = r1.sheets[si].parts[pi];
          const b = r2.sheets[si].parts[pi];
          expect(a.x).toBe(b.x);
          expect(a.y).toBe(b.y);
          expect(a.rotated).toBe(b.rotated);
        }
      }
    });

    it('two runs on MULTI_SHEET_PARTS produce identical sheet count', () => {
      const r1 = optimizeCutSheets(MULTI_SHEET_PARTS);
      const r2 = optimizeCutSheets(MULTI_SHEET_PARTS);
      expect(r1.totalSheets).toBe(r2.totalSheets);
      expect(r1.overallYield).toBe(r2.overallYield);
    });
  });
});
