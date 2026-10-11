import { describe, it, expect } from 'vitest';
import RAFTER_LENGTH_ORACLE from '../fixtures/oracles/rafter-length-calculator-academy.json';
import { calculateRafterLength } from '../../src/engine/rafter-length';

describe('calculateRafterLength', () => {
  it('computes run as half span for symmetric gable', () => {
    const result = calculateRafterLength({ totalSpanMm: 6000, pitchRatio: 0.5, plateWidthMm: 89 });
    expect(result.runMm).toBe(3000);
  });

  it('uses full span as run for shed roof', () => {
    const result = calculateRafterLength({ totalSpanMm: 4000, pitchRatio: 0.5, plateWidthMm: 89, shedRoof: true });
    expect(result.runMm).toBe(4000);
  });

  it('computes rise = run × pitchRatio', () => {
    const result = calculateRafterLength({ totalSpanMm: 6000, pitchRatio: 0.5, plateWidthMm: 89 });
    expect(result.riseMm).toBeCloseTo(1500, 1);
  });

  it('computes rafter length via Pythagorean theorem', () => {
    const result = calculateRafterLength({ totalSpanMm: 6000, pitchRatio: 0.5, plateWidthMm: 89 });
    const expected = Math.sqrt(3000 ** 2 + 1500 ** 2);
    expect(result.rafterLengthMm).toBeCloseTo(expected, 1);
  });

  it('total length is greater than rafter length when overhang > 0', () => {
    const result = calculateRafterLength({ totalSpanMm: 6000, pitchRatio: 0.5, plateWidthMm: 89, overhangMm: 500 });
    expect(result.totalLengthMm).toBeGreaterThan(result.rafterLengthMm);
  });

  it('total length equals rafter length when overhang is 0', () => {
    const result = calculateRafterLength({ totalSpanMm: 6000, pitchRatio: 0.5, plateWidthMm: 89 });
    expect(result.totalLengthMm).toBe(result.rafterLengthMm);
  });

  it('plumb + seat angles sum to 90°', () => {
    const result = calculateRafterLength({ totalSpanMm: 6000, pitchRatio: 0.5, plateWidthMm: 89 });
    expect(result.plumbCutAngleDeg + result.seatCutAngleDeg).toBeCloseTo(90, 5);
  });

  it('birdsmouth depth equals plateWidth / 3', () => {
    const result = calculateRafterLength({ totalSpanMm: 6000, pitchRatio: 0.5, plateWidthMm: 90 });
    expect(result.birdsmouthDepthMm).toBe(30);
  });

  it('matches the 6-in-12 gable rafter oracle in millimetres and degrees', () => {
    expect(calculateRafterLength({ totalSpanMm: 6000, pitchRatio: 0.5, plateWidthMm: 89, overhangMm: 500 })).toEqual({
      runMm: 3000,
      riseMm: 1500,
      rafterLengthMm: 3354.1,
      totalLengthMm: 3913.12,
      plumbCutAngleDeg: 26.57,
      seatCutAngleDeg: 63.43,
      birdsmouthDepthMm: 29.67,
    });
  });

  it('matches the published 24-foot span, 8-in-12 pitch example', () => {
    const { input, expected } = RAFTER_LENGTH_ORACLE;
    const result = calculateRafterLength(input);

    expect(result.runMm / 304.8).toBe(expected.runFt);
    expect(Math.abs(result.rafterLengthMm / 304.8 - expected.rafterLengthFt)).toBeLessThanOrEqual(0.01);
  });

  it('45° pitch (1:1) gives plumb angle of 45°', () => {
    const result = calculateRafterLength({ totalSpanMm: 4000, pitchRatio: 1, plateWidthMm: 89 });
    expect(result.plumbCutAngleDeg).toBeCloseTo(45, 2);
    expect(result.seatCutAngleDeg).toBeCloseTo(45, 2);
  });

  it.each([
    ['totalSpanMm = 0', { totalSpanMm: 0, pitchRatio: 0.5, plateWidthMm: 89 }],
    ['pitchRatio = 0', { totalSpanMm: 4000, pitchRatio: 0, plateWidthMm: 89 }],
    ['plateWidthMm = 0', { totalSpanMm: 4000, pitchRatio: 0.5, plateWidthMm: 0 }],
    ['overhangMm < 0', { totalSpanMm: 4000, pitchRatio: 0.5, plateWidthMm: 89, overhangMm: -10 }],
    ['overflowing rafter length', { totalSpanMm: Number.MAX_VALUE, pitchRatio: 2, plateWidthMm: 89 }],
    [
      'overflowing overhang length',
      { totalSpanMm: 4000, pitchRatio: 0.5, plateWidthMm: 89, overhangMm: Number.MAX_VALUE },
    ],
  ])('throws RangeError for invalid input: %s', (_label, input) => {
    expect(() => calculateRafterLength(input as Parameters<typeof calculateRafterLength>[0])).toThrow(RangeError);
  });
});
