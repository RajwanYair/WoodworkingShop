import { describe, it, expect } from 'vitest';
import {
  calculateVeneer,
  bestSheetForPanel,
  VENEER_THICKNESSES,
  STANDARD_VENEER_SHEETS,
} from '../../src/engine/veneer-calc';
import type { VeneerInput } from '../../src/engine/veneer-calc';

const baseInput: VeneerInput = {
  panelWidthMm: 600,
  panelLengthMm: 2400,
  panelCount: 4,
  bothFaces: true,
  matchPattern: 'book',
  sheetWidthMm: 300,
  sheetLengthMm: 2500,
};

describe('calculateVeneer', () => {
  it('computes valid result for standard book-match job', () => {
    const result = calculateVeneer(baseInput);
    expect(result.sheetsRequired).toBeGreaterThanOrEqual(1);
    expect(result.stripsPerPanel).toBeGreaterThanOrEqual(1);
    expect(result.stripWidthMm).toBeGreaterThan(0);
    expect(result.totalAreaM2).toBeGreaterThan(0);
    expect(result.wastePercent).toBeGreaterThanOrEqual(0);
    expect(result.adhesiveAreaM2).toBeGreaterThan(0);
    expect(result.adhesiveMl).toBeGreaterThan(0);
    expect(result.pressTimeMin).toBe(45);
  });

  it('doubles adhesive area for both-faces vs single-face', () => {
    const both = calculateVeneer(baseInput);
    const single = calculateVeneer({ ...baseInput, bothFaces: false });
    expect(both.adhesiveAreaM2).toBeCloseTo(single.adhesiveAreaM2 * 2, 2);
  });

  it('calculates strips per panel based on sheet width', () => {
    const result = calculateVeneer(baseInput);
    // 600mm panel + 20mm trim = 620mm, with 300mm sheets → ceil(620/300) = 3
    expect(result.stripsPerPanel).toBe(3);
  });

  it('uses full sheet width for random pattern', () => {
    const result = calculateVeneer({ ...baseInput, matchPattern: 'random' });
    expect(result.stripWidthMm).toBe(300);
  });

  it('respects custom trim allowance', () => {
    const noTrim = calculateVeneer({ ...baseInput, trimAllowanceMm: 0 });
    const bigTrim = calculateVeneer({ ...baseInput, trimAllowanceMm: 25 });
    expect(bigTrim.totalAreaM2).toBeGreaterThan(noTrim.totalAreaM2);
  });

  it.each([
    { desc: 'panelWidthMm = 0', override: { panelWidthMm: 0 } },
    { desc: 'panelLengthMm = -1', override: { panelLengthMm: -1 } },
    { desc: 'panelCount = 0', override: { panelCount: 0 } },
    { desc: 'sheetWidthMm = 0', override: { sheetWidthMm: 0 } },
    { desc: 'sheetLengthMm = -5', override: { sheetLengthMm: -5 } },
  ])('throws RangeError for $desc', ({ override }) => {
    expect(() => calculateVeneer({ ...baseInput, ...override })).toThrow(RangeError);
  });
});

describe('bestSheetForPanel', () => {
  it('finds smallest sheet that fits 2400mm panel', () => {
    const sheet = bestSheetForPanel(2400);
    expect(sheet).toBeDefined();
    expect(sheet!.lengthMm).toBeGreaterThanOrEqual(2400);
    expect(sheet!.lengthMm).toBe(2500);
  });

  it('returns undefined if no sheet is long enough', () => {
    const sheet = bestSheetForPanel(5000);
    expect(sheet).toBeUndefined();
  });

  it('throws RangeError for panelLength ≤ 0', () => {
    expect(() => bestSheetForPanel(0)).toThrow(RangeError);
  });
});

describe('VENEER_THICKNESSES', () => {
  it('has 6 standard thicknesses', () => {
    expect(VENEER_THICKNESSES).toHaveLength(6);
  });

  it('thicknesses are in ascending order', () => {
    for (let i = 1; i < VENEER_THICKNESSES.length; i++) {
      expect(VENEER_THICKNESSES[i]).toBeGreaterThan(VENEER_THICKNESSES[i - 1]);
    }
  });
});

describe('STANDARD_VENEER_SHEETS', () => {
  it('has 5 standard sheet sizes', () => {
    expect(STANDARD_VENEER_SHEETS).toHaveLength(5);
  });

  it('all sheets have positive dimensions', () => {
    for (const sheet of STANDARD_VENEER_SHEETS) {
      expect(sheet.widthMm).toBeGreaterThan(0);
      expect(sheet.lengthMm).toBeGreaterThan(0);
    }
  });
});
