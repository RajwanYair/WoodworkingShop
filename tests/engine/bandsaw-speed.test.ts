import { describe, it, expect } from 'vitest';
import { calculateBandsawSpeed } from '../../src/engine/bandsaw-speed';
import type { BandsawSpeedResult } from '../../src/engine/bandsaw-speed';

describe('calculateBandsawSpeed', () => {
  describe('valid inputs', () => {
    it.each([
      {
        desc: '14" wheel at 1000 RPM in softwood',
        input: {
          wheelDiameterMm: 355.6,
          wheelRpm: 1000,
          material: 'softwood' as const,
          cutThicknessMm: 50,
        },
        expectFn: (r: BandsawSpeedResult) => {
          // π × 355.6 × 1000 / 1000 ≈ 1117.4 m/min ≈ 3665 SFPM
          expect(r.bladeMetersPerMin).toBeCloseTo(1117.4, 0);
          expect(r.bladeSfpm).toBeCloseTo(3665, -1);
          expect(r.isOptimal).toBe(true);
          expect(r.recommendedTpi).toBe(6);
        },
      },
      {
        desc: 'small wheel in hardwood',
        input: {
          wheelDiameterMm: 200,
          wheelRpm: 1400,
          material: 'hardwood' as const,
          cutThicknessMm: 25,
        },
        expectFn: (r: BandsawSpeedResult) => {
          expect(r.bladeMetersPerMin).toBeCloseTo(879.6, 0);
          expect(r.recommendedSfpmRange).toEqual([2500, 4000]);
          expect(r.recommendedTpi).toBe(10);
        },
      },
      {
        desc: 'aluminum requires slow speed',
        input: {
          wheelDiameterMm: 355.6,
          wheelRpm: 1000,
          material: 'aluminum' as const,
          cutThicknessMm: 10,
        },
        expectFn: (r: BandsawSpeedResult) => {
          expect(r.isOptimal).toBe(false);
          expect(r.recommendedSfpmRange).toEqual([800, 1500]);
        },
      },
      {
        desc: 'thin cut gets high TPI',
        input: {
          wheelDiameterMm: 300,
          wheelRpm: 1000,
          material: 'plywood' as const,
          cutThicknessMm: 6,
        },
        expectFn: (r: BandsawSpeedResult) => {
          expect(r.recommendedTpi).toBe(14);
        },
      },
      {
        desc: 'thick cut gets low TPI',
        input: {
          wheelDiameterMm: 400,
          wheelRpm: 800,
          material: 'softwood' as const,
          cutThicknessMm: 150,
        },
        expectFn: (r: BandsawSpeedResult) => {
          expect(r.recommendedTpi).toBe(3);
        },
      },
    ])('$desc', ({ input, expectFn }) => {
      const result = calculateBandsawSpeed(input);
      expectFn(result);
    });
  });

  describe('feed rate is material-dependent', () => {
    it('softwood has higher feed rate than aluminum at same speed', () => {
      const base = { wheelDiameterMm: 355.6, wheelRpm: 500, cutThicknessMm: 25 };
      const sw = calculateBandsawSpeed({ ...base, material: 'softwood' });
      const al = calculateBandsawSpeed({ ...base, material: 'aluminum' });
      expect(sw.feedRateMmPerSec).toBeGreaterThan(al.feedRateMmPerSec);
    });
  });

  describe('invalid inputs', () => {
    it.each([
      {
        desc: 'zero wheel diameter',
        input: { wheelDiameterMm: 0, wheelRpm: 1000, material: 'softwood' as const, cutThicknessMm: 50 },
        msg: 'wheelDiameterMm must be > 0',
      },
      {
        desc: 'negative RPM',
        input: { wheelDiameterMm: 300, wheelRpm: -100, material: 'softwood' as const, cutThicknessMm: 50 },
        msg: 'wheelRpm must be > 0',
      },
      {
        desc: 'zero cut thickness',
        input: { wheelDiameterMm: 300, wheelRpm: 1000, material: 'softwood' as const, cutThicknessMm: 0 },
        msg: 'cutThicknessMm must be > 0',
      },
    ])('throws on $desc', ({ input, msg }) => {
      expect(() => calculateBandsawSpeed(input)).toThrow(msg);
    });
  });
});
