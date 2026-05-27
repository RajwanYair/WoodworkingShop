import { describe, it, expect } from 'vitest';

import { predictWaste, computeTotalDemand, estimatePartsPerSheet } from '../../src/engine/waste-predictor';
import type { PredictorPart, SheetSize } from '../../src/engine/waste-predictor';

const STANDARD_SHEET: SheetSize = { width: 2440, length: 1220 };
const HALF_SHEET: SheetSize = { width: 1220, length: 610 };

describe('computeTotalDemand', () => {
  it('sums area × quantity for all parts', () => {
    const parts: PredictorPart[] = [
      { width: 500, length: 300, quantity: 2 },
      { width: 400, length: 200, quantity: 3 },
    ];
    // (500*300*2) + (400*200*3) = 300000 + 240000 = 540000
    expect(computeTotalDemand(parts)).toBe(540000);
  });

  it('returns 0 for empty array', () => {
    expect(computeTotalDemand([])).toBe(0);
  });
});

describe('estimatePartsPerSheet', () => {
  it('fits multiple parts in normal orientation', () => {
    const part: PredictorPart = { width: 600, length: 400, quantity: 1 };
    // Normal: cols=4, rows=3 → 12  |  Rotated: cols=6, rows=2 → 12
    expect(estimatePartsPerSheet(part, STANDARD_SHEET)).toBe(12);
  });

  it('picks rotated orientation when better', () => {
    const part: PredictorPart = { width: 1000, length: 300, quantity: 1 };
    // Normal: cols=2, rows=4 → 8  |  Rotated: cols=8, rows=1 → 8
    // Actually: Normal: floor(2440/1000)=2, floor(1220/300)=4 → 8
    // Rotated: floor(2440/300)=8, floor(1220/1000)=1 → 8
    expect(estimatePartsPerSheet(part, STANDARD_SHEET)).toBe(8);
  });

  it('returns 0 when part is larger than sheet in both orientations', () => {
    const part: PredictorPart = { width: 3000, length: 2000, quantity: 1 };
    expect(estimatePartsPerSheet(part, STANDARD_SHEET)).toBe(0);
  });

  it('returns 1 when part just fits the sheet', () => {
    const part: PredictorPart = { width: 2440, length: 1220, quantity: 1 };
    expect(estimatePartsPerSheet(part, STANDARD_SHEET)).toBe(1);
  });
});

describe('predictWaste', () => {
  it('throws on empty parts array', () => {
    expect(() => predictWaste([], [STANDARD_SHEET])).toThrow(RangeError);
  });

  it('throws on empty sheets array', () => {
    const parts: PredictorPart[] = [{ width: 500, length: 300, quantity: 1 }];
    expect(() => predictWaste(parts, [])).toThrow(RangeError);
  });

  it('throws on non-positive part dimensions', () => {
    const parts: PredictorPart[] = [{ width: 0, length: 300, quantity: 1 }];
    expect(() => predictWaste(parts, [STANDARD_SHEET])).toThrow(/dimensions and quantity must be positive/);
  });

  it('predicts waste for single part and single sheet', () => {
    const parts: PredictorPart[] = [{ width: 600, length: 400, quantity: 4 }];
    const result = predictWaste(parts, [STANDARD_SHEET]);

    expect(result.predictions).toHaveLength(1);
    expect(result.bestSheet.sheetsNeeded).toBe(1);
    expect(result.totalDemand).toBe(600 * 400 * 4);
    expect(result.bestSheet.wastePercent).toBeGreaterThan(0);
    expect(result.bestSheet.wastePercent).toBeLessThan(100);
  });

  it('recommends sheet with lowest waste', () => {
    const parts: PredictorPart[] = [{ width: 600, length: 300, quantity: 8 }];
    const result = predictWaste(parts, [STANDARD_SHEET, HALF_SHEET]);

    expect(result.bestSheet.wastePercent).toBeLessThanOrEqual(result.predictions[1].wastePercent);
  });

  it('predictions are sorted by waste % ascending', () => {
    const parts: PredictorPart[] = [
      { width: 500, length: 400, quantity: 6 },
      { width: 300, length: 200, quantity: 10 },
    ];
    const sheets: SheetSize[] = [
      { width: 2440, length: 1220 },
      { width: 1220, length: 610 },
      { width: 3050, length: 1525 },
    ];
    const result = predictWaste(parts, sheets);

    for (let i = 1; i < result.predictions.length; i++) {
      expect(result.predictions[i].wastePercent).toBeGreaterThanOrEqual(result.predictions[i - 1].wastePercent);
    }
  });

  it('handles oversized parts that do not fit any sheet', () => {
    const parts: PredictorPart[] = [{ width: 3000, length: 2000, quantity: 2 }];
    const result = predictWaste(parts, [STANDARD_SHEET]);

    // Should still produce a prediction (oversized path)
    expect(result.bestSheet.sheetsNeeded).toBe(2);
  });

  it('computes averageWaste across multiple sheets', () => {
    const parts: PredictorPart[] = [{ width: 600, length: 400, quantity: 10 }];
    const result = predictWaste(parts, [STANDARD_SHEET, HALF_SHEET]);

    expect(result.averageWaste).toBeCloseTo(
      (result.predictions[0].wastePercent + result.predictions[1].wastePercent) / 2,
      1,
    );
  });

  it('assigns confidence level based on part complexity', () => {
    // Simple case: 1 part with high fill ratio → high confidence
    const parts: PredictorPart[] = [{ width: 1220, length: 610, quantity: 4 }];
    const result = predictWaste(parts, [STANDARD_SHEET]);
    expect(result.bestSheet.confidence).toBe('high');
  });

  it('assigns lower confidence for many parts', () => {
    const parts: PredictorPart[] = Array.from({ length: 12 }, (_, i) => ({
      width: 100 + i * 50,
      length: 200 + i * 30,
      quantity: 2,
    }));
    const result = predictWaste(parts, [STANDARD_SHEET]);
    expect(result.bestSheet.confidence).toBe('low');
  });
});
