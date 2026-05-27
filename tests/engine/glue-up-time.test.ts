import { describe, it, expect } from 'vitest';
import { calculateGlueUpTime } from '../../src/engine/glue-up-time';
import type { GlueUpResult } from '../../src/engine/glue-up-time';

describe('calculateGlueUpTime', () => {
  describe('valid inputs', () => {
    it.each([
      {
        desc: 'PVA at reference conditions',
        input: {
          glueType: 'pva' as const,
          temperatureC: 20,
          humidityPercent: 50,
          jointAreaMm2: 5000,
        },
        expectFn: (r: GlueUpResult) => {
          expect(r.openTimeMin).toBe(10);
          expect(r.clampTimeMin).toBe(60);
          expect(r.cureTimeHours).toBe(24);
          expect(r.recommendedPsi).toBe(150);
          expect(r.clampsNeeded).toBeGreaterThanOrEqual(1);
        },
      },
      {
        desc: 'PVA in cold conditions (10°C)',
        input: {
          glueType: 'pva' as const,
          temperatureC: 10,
          humidityPercent: 50,
          jointAreaMm2: 3000,
        },
        expectFn: (r: GlueUpResult) => {
          expect(r.clampTimeMin).toBeGreaterThan(60);
          expect(r.cureTimeHours).toBeGreaterThan(24);
        },
      },
      {
        desc: 'polyurethane in high humidity',
        input: {
          glueType: 'polyurethane' as const,
          temperatureC: 20,
          humidityPercent: 80,
          jointAreaMm2: 4000,
        },
        expectFn: (r: GlueUpResult) => {
          // Higher humidity → faster cure for PU
          expect(r.clampTimeMin).toBeLessThan(240);
        },
      },
      {
        desc: 'epoxy long cure',
        input: {
          glueType: 'epoxy' as const,
          temperatureC: 25,
          humidityPercent: 50,
          jointAreaMm2: 2000,
        },
        expectFn: (r: GlueUpResult) => {
          expect(r.cureTimeHours).toBeGreaterThan(24);
          expect(r.recommendedPsi).toBe(50);
        },
      },
      {
        desc: 'CA glue minimal clamp time',
        input: {
          glueType: 'ca' as const,
          temperatureC: 22,
          humidityPercent: 50,
          jointAreaMm2: 500,
        },
        expectFn: (r: GlueUpResult) => {
          expect(r.clampTimeMin).toBeLessThanOrEqual(5);
          expect(r.recommendedPsi).toBe(0);
          expect(r.clampsNeeded).toBe(1);
        },
      },
      {
        desc: 'multiple joints increases clamps',
        input: {
          glueType: 'pva' as const,
          temperatureC: 20,
          humidityPercent: 50,
          jointAreaMm2: 5000,
          jointCount: 4,
        },
        expectFn: (r: GlueUpResult) => {
          const singleResult = calculateGlueUpTime({
            glueType: 'pva',
            temperatureC: 20,
            humidityPercent: 50,
            jointAreaMm2: 5000,
            jointCount: 1,
          });
          expect(r.clampsNeeded).toBeGreaterThan(singleResult.clampsNeeded);
        },
      },
    ])('$desc', ({ input, expectFn }) => {
      const result = calculateGlueUpTime(input);
      expectFn(result);
    });
  });

  describe('temperature effects', () => {
    it('warm conditions speed up cure', () => {
      const cold = calculateGlueUpTime({
        glueType: 'pva',
        temperatureC: 10,
        humidityPercent: 50,
        jointAreaMm2: 3000,
      });
      const warm = calculateGlueUpTime({
        glueType: 'pva',
        temperatureC: 30,
        humidityPercent: 50,
        jointAreaMm2: 3000,
      });
      expect(warm.cureTimeHours).toBeLessThan(cold.cureTimeHours);
    });
  });

  describe('invalid inputs', () => {
    it.each([
      {
        desc: 'temperature below 0',
        input: { glueType: 'pva' as const, temperatureC: -5, humidityPercent: 50, jointAreaMm2: 1000 },
        msg: 'temperatureC must be 0–50',
      },
      {
        desc: 'temperature above 50',
        input: { glueType: 'pva' as const, temperatureC: 55, humidityPercent: 50, jointAreaMm2: 1000 },
        msg: 'temperatureC must be 0–50',
      },
      {
        desc: 'humidity above 100',
        input: { glueType: 'pva' as const, temperatureC: 20, humidityPercent: 110, jointAreaMm2: 1000 },
        msg: 'humidityPercent must be 0–100',
      },
      {
        desc: 'zero joint area',
        input: { glueType: 'pva' as const, temperatureC: 20, humidityPercent: 50, jointAreaMm2: 0 },
        msg: 'jointAreaMm2 must be > 0',
      },
      {
        desc: 'zero joint count',
        input: { glueType: 'pva' as const, temperatureC: 20, humidityPercent: 50, jointAreaMm2: 1000, jointCount: 0 },
        msg: 'jointCount must be >= 1',
      },
    ])('throws on $desc', ({ input, msg }) => {
      expect(() => calculateGlueUpTime(input)).toThrow(msg);
    });
  });
});
