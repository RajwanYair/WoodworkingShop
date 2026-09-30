import { describe, it, expect } from 'vitest';
import { calculateScrewPullout } from '../../src/engine/screw-pullout';

describe('calculateScrewPullout', () => {
  it.each([
    { densityClass: 'low' as const, forceN: 450.5, forceLbf: 101.3, resistanceMPa: 1.195 },
    { densityClass: 'medium' as const, forceN: 1238.1, forceLbf: 278.3, resistanceMPa: 3.284 },
    { densityClass: 'high' as const, forceN: 1801.8, forceLbf: 405.1, resistanceMPa: 4.779 },
    { densityClass: 'sheet' as const, forceN: 943.6, forceLbf: 212.1, resistanceMPa: 2.503 },
  ])(
    'matches the documented withdrawal formula and units for $densityClass',
    ({ densityClass, forceN, forceLbf, resistanceMPa }) => {
      const result = calculateScrewPullout({ screwDiameterMm: 4, threadLengthMm: 30, densityClass });

      expect(result.pulloutForceN).toBe(forceN);
      expect(result.pulloutForceLbf).toBe(forceLbf);
      expect(result.withdrawalResistanceMPa).toBe(resistanceMPa);
      expect(result.densityLabelKey).toBe(densityClass);
    },
  );

  it.each([
    { threadLengthMm: 15, multiplier: 0.5 },
    { threadLengthMm: 60, multiplier: 2 },
  ])('scales force linearly with thread length $threadLengthMm mm', ({ threadLengthMm, multiplier }) => {
    const baseline = calculateScrewPullout({ screwDiameterMm: 4, threadLengthMm: 30, densityClass: 'medium' });
    const scaled = calculateScrewPullout({ screwDiameterMm: 4, threadLengthMm, densityClass: 'medium' });

    expect(scaled.pulloutForceN).toBeCloseTo(baseline.pulloutForceN * multiplier, 0);
    expect(scaled.withdrawalResistanceMPa).toBe(baseline.withdrawalResistanceMPa);
  });

  describe('force calculation', () => {
    it.each([
      { densityClass: 'low' as const, minN: 200, maxN: 700 },
      { densityClass: 'medium' as const, minN: 800, maxN: 2000 },
      { densityClass: 'high' as const, minN: 1200, maxN: 3000 },
      { densityClass: 'sheet' as const, minN: 600, maxN: 1500 },
    ])('$densityClass density produces force in expected range', ({ densityClass, minN, maxN }) => {
      const r = calculateScrewPullout({ screwDiameterMm: 4, threadLengthMm: 30, densityClass });
      expect(r.pulloutForceN).toBeGreaterThan(minN);
      expect(r.pulloutForceN).toBeLessThan(maxN);
      expect(r.pulloutForceLbf).toBeCloseTo(r.pulloutForceN / 4.4482, 0);
    });
  });

  describe('safety rating thresholds', () => {
    it('rates adequate for strong joint', () => {
      const r = calculateScrewPullout({ screwDiameterMm: 6, threadLengthMm: 60, densityClass: 'high' });
      expect(r.safetyRating).toBe('adequate');
    });

    it('rates insufficient for very weak joint', () => {
      const r = calculateScrewPullout({ screwDiameterMm: 1.5, threadLengthMm: 5, densityClass: 'low' });
      expect(r.safetyRating).toBe('insufficient');
    });

    it.each([
      { threadLengthMm: 2.4215713972, expectedForceN: 99.9, rating: 'insufficient' as const },
      { threadLengthMm: 2.4244790275, expectedForceN: 100.1, rating: 'marginal' as const },
      { threadLengthMm: 7.267621822, expectedForceN: 299.9, rating: 'marginal' as const },
      { threadLengthMm: 7.2705294522, expectedForceN: 300.1, rating: 'adequate' as const },
    ])('classifies rounded force $expectedForceN N as $rating', ({ threadLengthMm, expectedForceN, rating }) => {
      const result = calculateScrewPullout({ screwDiameterMm: 4, threadLengthMm, densityClass: 'medium' });

      expect(result.pulloutForceN).toBe(expectedForceN);
      expect(result.safetyRating).toBe(rating);
    });
  });

  describe('withdrawal resistance', () => {
    it('returns a positive MPa value', () => {
      const r = calculateScrewPullout({ screwDiameterMm: 4, threadLengthMm: 30, densityClass: 'medium' });
      expect(r.withdrawalResistanceMPa).toBeGreaterThan(0);
    });
  });

  describe('throws on invalid input', () => {
    it.each([
      { desc: 'zero diameter', input: { screwDiameterMm: 0, threadLengthMm: 30, densityClass: 'medium' as const } },
      {
        desc: 'negative thread length',
        input: { screwDiameterMm: 4, threadLengthMm: -5, densityClass: 'medium' as const },
      },
      {
        desc: 'NaN screw diameter',
        input: { screwDiameterMm: Number.NaN, threadLengthMm: 30, densityClass: 'medium' as const },
      },
      {
        desc: 'infinite thread length',
        input: { screwDiameterMm: 4, threadLengthMm: Number.POSITIVE_INFINITY, densityClass: 'medium' as const },
      },
    ])('throws RangeError for $desc', ({ input }) => {
      expect(() => calculateScrewPullout(input)).toThrow(RangeError);
    });
  });
});
