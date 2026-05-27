import { describe, it, expect } from 'vitest';
import { calculatePilotHole } from '../../src/engine/pilot-hole';
import type { PilotHoleResult } from '../../src/engine/pilot-hole';

describe('calculatePilotHole', () => {
  describe('valid inputs', () => {
    it.each([
      {
        desc: '#8 screw in softwood',
        input: { gauge: 8 as const, screwLengthMm: 50, woodHardness: 'softwood' as const },
        expectFn: (r: PilotHoleResult) => {
          expect(r.screwDiameterMm).toBe(4.17);
          expect(r.pilotHoleMm).toBeCloseTo(2.09, 1);
          expect(r.clearanceHoleMm).toBeCloseTo(4.59, 1);
          expect(r.pilotDepthMm).toBe(37.5);
          expect(r.countersinkDiameterMm).toBeCloseTo(8.34, 1);
        },
      },
      {
        desc: '#10 screw in hardwood',
        input: { gauge: 10 as const, screwLengthMm: 60, woodHardness: 'hardwood' as const },
        expectFn: (r: PilotHoleResult) => {
          expect(r.pilotHoleMm).toBeCloseTo(3.38, 1);
          expect(r.clearanceHoleMm).toBeCloseTo(5.31, 1);
        },
      },
      {
        desc: '#6 screw in plywood',
        input: { gauge: 6 as const, screwLengthMm: 30, woodHardness: 'plywood' as const },
        expectFn: (r: PilotHoleResult) => {
          expect(r.pilotHoleMm).toBeCloseTo(2.11, 1);
        },
      },
      {
        desc: '#4 in MDF',
        input: { gauge: 4 as const, screwLengthMm: 25, woodHardness: 'mdf' as const },
        expectFn: (r: PilotHoleResult) => {
          expect(r.pilotHoleMm).toBeCloseTo(2.27, 1);
        },
      },
      {
        desc: 'no countersink',
        input: {
          gauge: 8 as const,
          screwLengthMm: 40,
          woodHardness: 'softwood' as const,
          countersink: false,
        },
        expectFn: (r: PilotHoleResult) => {
          expect(r.countersinkDiameterMm).toBe(0);
          expect(r.countersinkDepthMm).toBe(0);
        },
      },
    ])('$desc', ({ input, expectFn }) => {
      const result = calculatePilotHole(input);
      expectFn(result);
    });
  });

  describe('all gauges produce valid results', () => {
    it.each([2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14] as const)('gauge %d', (gauge) => {
      const result = calculatePilotHole({
        gauge,
        screwLengthMm: 40,
        woodHardness: 'hardwood',
      });
      expect(result.pilotHoleMm).toBeGreaterThan(0);
      expect(result.pilotHoleMm).toBeLessThan(result.clearanceHoleMm);
      expect(result.clearanceHoleMm).toBeLessThan(result.countersinkDiameterMm);
    });
  });

  describe('invalid inputs', () => {
    it.each([
      {
        desc: 'zero screw length',
        input: { gauge: 8 as const, screwLengthMm: 0, woodHardness: 'softwood' as const },
        msg: 'screwLengthMm must be > 0',
      },
      {
        desc: 'negative screw length',
        input: { gauge: 8 as const, screwLengthMm: -10, woodHardness: 'softwood' as const },
        msg: 'screwLengthMm must be > 0',
      },
    ])('throws on $desc', ({ input, msg }) => {
      expect(() => calculatePilotHole(input)).toThrow(msg);
    });
  });
});
