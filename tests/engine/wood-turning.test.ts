import { describe, it, expect } from 'vitest';
import { calculateWoodTurning } from '../../src/engine/wood-turning';
import type { TurningOperation } from '../../src/engine/wood-turning';

const MM_TO_IN = 1 / 25.4;

describe('calculateWoodTurning', () => {
  it.each([
    { operation: 'roughing' as const, recommendedRpm: 914, surfaceSpeedMPerMin: 287.1 },
    { operation: 'finishing' as const, recommendedRpm: 1270, surfaceSpeedMPerMin: 399 },
    { operation: 'sanding' as const, recommendedRpm: 1422, surfaceSpeedMPerMin: 446.7 },
  ])(
    'matches the 100 mm $operation RPM and surface-speed oracle',
    ({ operation, recommendedRpm, surfaceSpeedMPerMin }) => {
      const result = calculateWoodTurning({ blankDiameterMm: 100, operation });

      expect(result.minRpm).toBe(508);
      expect(result.maxRpm).toBe(1524);
      expect(result.recommendedRpm).toBe(recommendedRpm);
      expect(result.surfaceSpeedMPerMin).toBe(surfaceSpeedMPerMin);
    },
  );

  describe('RPM limits follow 6000/d and 2000/d formulas', () => {
    it.each([
      [50, Math.floor(6000 / (50 * MM_TO_IN)), Math.floor(2000 / (50 * MM_TO_IN))],
      [100, Math.floor(6000 / (100 * MM_TO_IN)), Math.floor(2000 / (100 * MM_TO_IN))],
      [200, Math.floor(6000 / (200 * MM_TO_IN)), Math.floor(2000 / (200 * MM_TO_IN))],
    ])('%dmm blank: max %d, min %d', (diameter, expectedMax, expectedMin) => {
      const result = calculateWoodTurning({ blankDiameterMm: diameter, operation: 'finishing' });
      expect(result.maxRpm).toBe(Math.min(expectedMax, 4000));
      expect(result.minRpm).toBe(Math.max(expectedMin, 250));
    });
  });

  describe('recommended RPM within min–max range', () => {
    it.each([['roughing' as TurningOperation], ['finishing' as TurningOperation], ['sanding' as TurningOperation]])(
      '%s operation',
      (op) => {
        const result = calculateWoodTurning({ blankDiameterMm: 100, operation: op });
        expect(result.recommendedRpm).toBeGreaterThanOrEqual(result.minRpm);
        expect(result.recommendedRpm).toBeLessThanOrEqual(result.maxRpm);
      },
    );
  });

  it('roughing RPM is lower than finishing for same diameter', () => {
    const roughing = calculateWoodTurning({ blankDiameterMm: 100, operation: 'roughing' });
    const finishing = calculateWoodTurning({ blankDiameterMm: 100, operation: 'finishing' });
    expect(roughing.recommendedRpm).toBeLessThan(finishing.recommendedRpm);
  });

  it('surface speed is positive', () => {
    const result = calculateWoodTurning({ blankDiameterMm: 75, operation: 'finishing' });
    expect(result.surfaceSpeedMPerMin).toBeGreaterThan(0);
  });

  it('larger blank gives lower maxRpm', () => {
    const small = calculateWoodTurning({ blankDiameterMm: 50, operation: 'finishing' });
    const large = calculateWoodTurning({ blankDiameterMm: 300, operation: 'finishing' });
    expect(large.maxRpm).toBeLessThan(small.maxRpm);
  });

  it('keeps the recommended speed inside an achievable safe range for a large blank', () => {
    const result = calculateWoodTurning({ blankDiameterMm: 1000, operation: 'finishing' });

    expect(result.minRpm).toBe(152);
    expect(result.maxRpm).toBe(152);
    expect(result.recommendedRpm).toBe(152);
    expect(result.surfaceSpeedMPerMin).toBe(477.5);
    expect(result.minRpm).toBeLessThanOrEqual(result.maxRpm);
    expect(result.recommendedRpm).toBeGreaterThanOrEqual(result.minRpm);
    expect(result.recommendedRpm).toBeLessThanOrEqual(result.maxRpm);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'throws for non-finite blank diameter %s',
    (blankDiameterMm) => {
      expect(() => calculateWoodTurning({ blankDiameterMm, operation: 'roughing' })).toThrow(RangeError);
    },
  );

  it('throws for zero diameter', () => {
    expect(() => calculateWoodTurning({ blankDiameterMm: 0, operation: 'roughing' })).toThrow(RangeError);
  });
});
