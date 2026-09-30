import { describe, it, expect } from 'vitest';
import { calculateStairStringer } from '../../src/engine/stair-stringer';

describe('calculateStairStringer', () => {
  const BASE = {
    totalRiseMm: 2800,
    treadDepthMm: 280,
    idealRiserMm: 175,
  };

  it('computes riser count and actual riser height', () => {
    const r = calculateStairStringer(BASE);
    // 2800 / 175 = 16 risers
    expect(r.riserCount).toBe(16);
    expect(r.actualRiserMm).toBeCloseTo(175, 0);
  });

  it('treadCount is riserCount − 1', () => {
    const r = calculateStairStringer(BASE);
    expect(r.treadCount).toBe(r.riserCount - 1);
  });

  it('totalRun equals treadCount × treadDepth', () => {
    const r = calculateStairStringer(BASE);
    expect(r.totalRunMm).toBeCloseTo(r.treadCount * BASE.treadDepthMm, 0);
  });

  it('stringerLength is hypotenuse of rise and run', () => {
    const r = calculateStairStringer(BASE);
    const expected = Math.sqrt(r.totalRunMm ** 2 + BASE.totalRiseMm ** 2);
    expect(r.stringerLengthMm).toBeCloseTo(expected, 0);
  });

  it('stringer angle is correct', () => {
    const r = calculateStairStringer(BASE);
    const expected = Math.atan(BASE.totalRiseMm / r.totalRunMm) * (180 / Math.PI);
    expect(r.stringerAngleDeg).toBeCloseTo(expected, 1);
  });

  it('matches the nominal run, length, and angle oracle in millimetres and degrees', () => {
    const result = calculateStairStringer(BASE);

    expect(result.riserCount).toBe(16);
    expect(result.actualRiserMm).toBe(175);
    expect(result.totalRunMm).toBe(4200);
    expect(result.stringerLengthMm).toBe(5047.8);
    expect(result.stringerAngleDeg).toBe(33.69);
  });

  it('passesIrc true when riser in 101.6–196.85 mm and tread ≥ 254 mm', () => {
    const r = calculateStairStringer(BASE);
    expect(r.passesIrc).toBe(true);
    expect(r.warningKey).toBeNull();
  });

  it('warns riserTooShort when actual riser < 101.6 mm', () => {
    // 1 riser clamped to 3 → actualRiser = 300/3 = 100 mm
    const r = calculateStairStringer({ totalRiseMm: 300, treadDepthMm: 280, idealRiserMm: 100 });
    expect(r.warningKey).toBe('riserTooShort');
    expect(r.passesIrc).toBe(false);
  });

  it('warns riserTooTall when actual riser > 196.85 mm', () => {
    // 3 risers × ~233 mm each
    const r = calculateStairStringer({ totalRiseMm: 700, treadDepthMm: 280, idealRiserMm: 240 });
    expect(r.warningKey).toBe('riserTooTall');
  });

  it('warns treadTooShallow when treadDepth < 254 mm', () => {
    const r = calculateStairStringer({ ...BASE, treadDepthMm: 200 });
    expect(r.warningKey).toBe('treadTooShallow');
    expect(r.passesIrc).toBe(false);
  });

  it.each([
    { totalRiseMm: 304.7, expectedWarning: 'riserTooShort' as const },
    { totalRiseMm: 304.8, expectedWarning: null },
    { totalRiseMm: 590.55, expectedWarning: null },
    { totalRiseMm: 590.7, expectedWarning: 'riserTooTall' as const },
  ])('checks IRC riser limits before display rounding at $totalRiseMm mm rise', ({ totalRiseMm, expectedWarning }) => {
    const result = calculateStairStringer({ totalRiseMm, treadDepthMm: 280, idealRiserMm: 1000 });

    expect(result.riserCount).toBe(3);
    expect(result.warningKey).toBe(expectedWarning);
    expect(result.passesIrc).toBe(expectedWarning === null);
  });

  it.each([
    { treadDepthMm: 253.9, expectedWarning: 'treadTooShallow' as const },
    { treadDepthMm: 254, expectedWarning: null },
  ])('checks the 254 mm tread boundary at $treadDepthMm mm', ({ treadDepthMm, expectedWarning }) => {
    const result = calculateStairStringer({ ...BASE, treadDepthMm });

    expect(result.warningKey).toBe(expectedWarning);
    expect(result.passesIrc).toBe(expectedWarning === null);
  });

  it('clamps riserCount to minimum 3', () => {
    const r = calculateStairStringer({ totalRiseMm: 100, treadDepthMm: 280 });
    expect(r.riserCount).toBeGreaterThanOrEqual(3);
  });

  it('clamps riserCount to maximum 20', () => {
    const result = calculateStairStringer({ totalRiseMm: 4000, treadDepthMm: 280, idealRiserMm: 100 });

    expect(result.riserCount).toBe(20);
    expect(result.treadCount).toBe(19);
  });

  it('defaults idealRiserMm to 175 when omitted', () => {
    const r = calculateStairStringer({ totalRiseMm: 2800, treadDepthMm: 280 });
    expect(r.riserCount).toBe(16);
  });

  describe('error guards', () => {
    it.each([
      ['zero totalRise', { totalRiseMm: 0, treadDepthMm: 280 }],
      ['negative totalRise', { totalRiseMm: -500, treadDepthMm: 280 }],
      ['zero treadDepth', { totalRiseMm: 2800, treadDepthMm: 0 }],
      ['NaN rise', { totalRiseMm: Number.NaN, treadDepthMm: 280 }],
      ['infinite treadDepth', { totalRiseMm: 2800, treadDepthMm: Number.POSITIVE_INFINITY }],
      ['NaN ideal riser', { totalRiseMm: 2800, treadDepthMm: 280, idealRiserMm: Number.NaN }],
      ['infinite headroom', { totalRiseMm: 2800, treadDepthMm: 280, headroomMm: Number.POSITIVE_INFINITY }],
    ])('throws RangeError for %s', (_, input) => {
      expect(() => calculateStairStringer(input)).toThrow(RangeError);
    });
  });
});
