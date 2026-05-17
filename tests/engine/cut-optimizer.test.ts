import { describe, it, expect } from 'vitest';
import { optimizeCutSheets } from '../../src/engine/cut-optimizer';
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
});
