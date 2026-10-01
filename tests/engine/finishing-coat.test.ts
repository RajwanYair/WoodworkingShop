import { describe, it, expect } from 'vitest';
import RUSTOLEUM_WATERBASED_POLYURETHANE_ORACLE from '../fixtures/oracles/rustoleum-ultimate-waterbased-polyurethane.json';
import { calculateFinishingCoat } from '../../src/engine/finishing-coat';
import type { FinishType } from '../../src/engine/finishing-coat';

describe('calculateFinishingCoat', () => {
  it('matches the Rust-Oleum Ultimate Polyurethane coverage range and recoat interval', () => {
    const oracle = RUSTOLEUM_WATERBASED_POLYURETHANE_ORACLE;
    expect(oracle.engineInput.finishType).toBe('waterbased');
    const result = calculateFinishingCoat({ ...oracle.engineInput, finishType: 'waterbased' });

    expect(result.coveragePerLitreM2).toBe(oracle.expected.coveragePerLitreM2);
    expect(result.coveragePerLitreM2).toBeGreaterThanOrEqual(oracle.expected.coverageRangeM2PerLitre.minimum);
    expect(result.coveragePerLitreM2).toBeLessThanOrEqual(oracle.expected.coverageRangeM2PerLitre.maximum);
    expect(result.dryTimeBetweenCoatsMin).toBe(oracle.expected.dryTimeBetweenCoatsMin);
  });

  it.each([
    { finish: 'polyurethane' as const, coverage: 10, recoat: 240, cure: 72 },
    { finish: 'lacquer' as const, coverage: 12, recoat: 30, cure: 24 },
    { finish: 'shellac' as const, coverage: 14, recoat: 45, cure: 12 },
    { finish: 'waterbased' as const, coverage: 11, recoat: 120, cure: 48 },
    { finish: 'oil' as const, coverage: 8, recoat: 480, cure: 168 },
  ])('returns configured coverage and schedule for $finish', ({ finish, coverage, recoat, cure }) => {
    const result = calculateFinishingCoat({ surfaceAreaM2: coverage, coatCount: 1, finishType: finish });

    expect(result.volumeLitres).toBe(1.1);
    expect(result.coveragePerLitreM2).toBe(coverage);
    expect(result.dryTimeBetweenCoatsMin).toBe(recoat);
    expect(result.totalDryTimeHours).toBe(cure);
  });

  describe('volume calculation includes 10% waste', () => {
    it.each([
      // area, coats, finish, expectedCoverage m²/L
      [2, 2, 'polyurethane' as FinishType, 10, 0.44],
      [1, 3, 'lacquer' as FinishType, 12, 0.28],
      [3, 1, 'oil' as FinishType, 8, 0.42],
    ])('%.0fm² × %d coats of %s', (area, coats, finish, coverage, expectedVolume) => {
      const result = calculateFinishingCoat({ surfaceAreaM2: area, coatCount: coats, finishType: finish });
      expect(result.volumeLitres).toBe(expectedVolume);
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

  it.each([
    { surfaceAreaM2: 1, expectedVolumeLitres: 0.11 },
    { surfaceAreaM2: 1.0001, expectedVolumeLitres: 0.12 },
  ])('rounds volume upward to a hundredth for $surfaceAreaM2 m²', ({ surfaceAreaM2, expectedVolumeLitres }) => {
    const result = calculateFinishingCoat({ surfaceAreaM2, coatCount: 1, finishType: 'polyurethane' });

    expect(result.volumeLitres).toBe(expectedVolumeLitres);
  });

  describe('error guards', () => {
    it.each([
      ['zero area', { surfaceAreaM2: 0, coatCount: 2, finishType: 'lacquer' as FinishType }],
      ['zero coats', { surfaceAreaM2: 1, coatCount: 0, finishType: 'lacquer' as FinishType }],
      ['negative area', { surfaceAreaM2: -1, coatCount: 2, finishType: 'lacquer' as FinishType }],
      ['NaN area', { surfaceAreaM2: Number.NaN, coatCount: 2, finishType: 'lacquer' as FinishType }],
      ['infinite area', { surfaceAreaM2: Number.POSITIVE_INFINITY, coatCount: 2, finishType: 'lacquer' as FinishType }],
      ['fractional coats', { surfaceAreaM2: 1, coatCount: 1.5, finishType: 'lacquer' as FinishType }],
      ['NaN coats', { surfaceAreaM2: 1, coatCount: Number.NaN, finishType: 'lacquer' as FinishType }],
      [
        'infinite coats',
        { surfaceAreaM2: 1, coatCount: Number.POSITIVE_INFINITY, finishType: 'lacquer' as FinishType },
      ],
      ['overflow volume', { surfaceAreaM2: Number.MAX_VALUE, coatCount: 2, finishType: 'lacquer' as FinishType }],
    ])('throws for %s', (_label, input) => {
      expect(() => calculateFinishingCoat(input)).toThrow(RangeError);
    });
  });
});
