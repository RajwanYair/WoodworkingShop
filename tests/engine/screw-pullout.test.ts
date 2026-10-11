import { describe, it, expect } from 'vitest';
import { calculateScrewPullout, SCREW_PULLOUT_LIMITS } from '../../src/engine/screw-pullout';
import USDA_WOOD_SCREW_WITHDRAWAL_ORACLE from '../fixtures/oracles/usda-wood-screw-withdrawal.json';

describe('calculateScrewPullout', () => {
  it.each([
    { densityClass: 'low' as const, forceN: 1875.8, forceLbf: 421.7, resistanceMPa: 4.976 },
    { densityClass: 'medium' as const, forceN: 5155.7, forceLbf: 1159.1, resistanceMPa: 13.676 },
    { densityClass: 'high' as const, forceN: 7503, forceLbf: 1686.7, resistanceMPa: 19.902 },
    { densityClass: 'sheet' as const, forceN: 3929.5, forceLbf: 883.4, resistanceMPa: 10.423 },
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

  it('matches the published USDA side-grain screw-withdrawal case', () => {
    const result = calculateScrewPullout({
      ...USDA_WOOD_SCREW_WITHDRAWAL_ORACLE.input,
      densityClass: 'medium',
    });

    expect(result.pulloutForceN).toBe(USDA_WOOD_SCREW_WITHDRAWAL_ORACLE.expected.pulloutForceN);
    expect(result.pulloutForceLbf).toBe(USDA_WOOD_SCREW_WITHDRAWAL_ORACLE.expected.pulloutForceLbf);
  });

  it.each([
    {
      screwDiameterMm: SCREW_PULLOUT_LIMITS.screwDiameterMm.min,
      threadLengthMm: SCREW_PULLOUT_LIMITS.threadLengthMm.min,
    },
    {
      screwDiameterMm: SCREW_PULLOUT_LIMITS.screwDiameterMm.max,
      threadLengthMm: SCREW_PULLOUT_LIMITS.threadLengthMm.max,
    },
  ])('accepts declared inclusive limits: $screwDiameterMm mm diameter and $threadLengthMm mm engagement', (input) => {
    expect(() => calculateScrewPullout({ ...input, densityClass: 'medium' })).not.toThrow();
  });

  describe('force calculation', () => {
    it.each([
      { densityClass: 'low' as const, minN: 1000, maxN: 2500 },
      { densityClass: 'medium' as const, minN: 4000, maxN: 6000 },
      { densityClass: 'high' as const, minN: 6000, maxN: 8500 },
      { densityClass: 'sheet' as const, minN: 3000, maxN: 5000 },
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
      const r = calculateScrewPullout({ screwDiameterMm: 1, threadLengthMm: 5, densityClass: 'low' });
      expect(r.safetyRating).toBe('insufficient');
    });

    it.each([
      { threadLengthMm: 6.3910231396, expectedForceN: 99.9, rating: 'insufficient' as const },
      { threadLengthMm: 6.4038179806, expectedForceN: 100.1, rating: 'marginal' as const },
      { threadLengthMm: 19.1858642595, expectedForceN: 299.9, rating: 'marginal' as const },
      { threadLengthMm: 19.1986591007, expectedForceN: 300.1, rating: 'adequate' as const },
    ])('classifies rounded force $expectedForceN N as $rating', ({ threadLengthMm, expectedForceN, rating }) => {
      const result = calculateScrewPullout({ screwDiameterMm: 1, threadLengthMm, densityClass: 'low' });

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
      {
        desc: 'diameter below minimum',
        input: { screwDiameterMm: 0.5, threadLengthMm: 30, densityClass: 'medium' as const },
      },
      {
        desc: 'diameter above maximum',
        input: { screwDiameterMm: 12.5, threadLengthMm: 30, densityClass: 'medium' as const },
      },
      {
        desc: 'thread length below minimum',
        input: { screwDiameterMm: 4, threadLengthMm: 4, densityClass: 'medium' as const },
      },
      {
        desc: 'thread length above maximum',
        input: { screwDiameterMm: 4, threadLengthMm: 101, densityClass: 'medium' as const },
      },
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
