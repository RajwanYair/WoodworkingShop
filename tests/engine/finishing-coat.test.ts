import { describe, it, expect } from 'vitest';
import { calculateFinishingCoat } from '../../src/engine/finishing-coat';
import type { FinishType } from '../../src/engine/finishing-coat';

describe('calculateFinishingCoat', () => {
  describe('volume calculation includes 10% waste', () => {
    it.each([
      // area, coats, finish, expectedCoverage m²/L
      [2, 2, 'polyurethane' as FinishType, 10],
      [1, 3, 'lacquer' as FinishType, 12],
      [3, 1, 'oil' as FinishType, 8],
    ])('%.0fm² × %d coats of %s', (area, coats, finish, coverage) => {
      const result = calculateFinishingCoat({ surfaceAreaM2: area, coatCount: coats, finishType: finish });
      const expected = Math.ceil(((area * coats * 1.1) / coverage) * 100) / 100;
      expect(result.volumeLitres).toBe(expected);
      expect(result.coveragePerLitreM2).toBe(coverage);
    });
  });

  describe('dry time between coats', () => {
    it.each([
      ['polyurethane', 240],
      ['lacquer', 30],
      ['shellac', 45],
      ['waterbased', 120],
      ['oil', 480],
    ] as [FinishType, number][])('%s: %d min recoat', (finish, expectedMin) => {
      const result = calculateFinishingCoat({ surfaceAreaM2: 1, coatCount: 2, finishType: finish });
      expect(result.dryTimeBetweenCoatsMin).toBe(expectedMin);
    });
  });

  it('single coat total dry time equals cure time only', () => {
    const result = calculateFinishingCoat({ surfaceAreaM2: 1, coatCount: 1, finishType: 'lacquer' });
    // 0 recoat gaps + 24h cure
    expect(result.totalDryTimeHours).toBe(24);
  });

  it('three coats polyurethane total time = 2 × 4h + 72h cure', () => {
    const result = calculateFinishingCoat({ surfaceAreaM2: 1, coatCount: 3, finishType: 'polyurethane' });
    expect(result.totalDryTimeHours).toBe(80);
  });

  describe('error guards', () => {
    it.each([
      ['zero area', { surfaceAreaM2: 0, coatCount: 2, finishType: 'lacquer' as FinishType }],
      ['zero coats', { surfaceAreaM2: 1, coatCount: 0, finishType: 'lacquer' as FinishType }],
      ['negative area', { surfaceAreaM2: -1, coatCount: 2, finishType: 'lacquer' as FinishType }],
    ])('throws for %s', (_label, input) => {
      expect(() => calculateFinishingCoat(input)).toThrow(RangeError);
    });
  });
});
