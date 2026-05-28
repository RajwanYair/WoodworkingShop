import { describe, it, expect } from 'vitest';
import { calculateScrewPullout } from '../../src/engine/screw-pullout';

describe('calculateScrewPullout', () => {
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
    ])('throws RangeError for $desc', ({ input }) => {
      expect(() => calculateScrewPullout(input)).toThrow(RangeError);
    });
  });
});
