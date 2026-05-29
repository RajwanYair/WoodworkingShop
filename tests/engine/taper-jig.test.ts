import { describe, it, expect } from 'vitest';
import { calculateTaperJig } from '../../src/engine/taper-jig';

describe('calculateTaperJig', () => {
  const BASE = {
    workpieceLengthMm: 700,
    startWidthMm: 70,
    endWidthMm: 40,
    taperedFaces: 1 as const,
  };

  it('computes jig offset as total removal for 1-face taper', () => {
    const r = calculateTaperJig(BASE);
    expect(r.jigOffsetMm).toBeCloseTo(30, 1);
    expect(r.materialRemovedPerFaceMm).toBeCloseTo(30, 1);
    expect(r.taperedFaces).toBe(1);
  });

  it('computes jig offset as half removal per face for 2-face taper', () => {
    const r = calculateTaperJig({ ...BASE, taperedFaces: 2 });
    expect(r.jigOffsetMm).toBeCloseTo(15, 1);
    expect(r.materialRemovedPerFaceMm).toBeCloseTo(15, 1);
    expect(r.taperedFaces).toBe(2);
  });

  it('computes taper angle correctly', () => {
    const r = calculateTaperJig(BASE);
    const expected = Math.atan(30 / 700) * (180 / Math.PI);
    expect(r.taperAngleDeg).toBeCloseTo(expected, 1);
  });

  it('computes taper per foot correctly', () => {
    const r = calculateTaperJig(BASE);
    const expected = (30 / 700) * 304.8;
    expect(r.taperPerFootMm).toBeCloseTo(expected, 1);
  });

  it('defaults to 1 tapered face when taperedFaces is omitted', () => {
    const r = calculateTaperJig({
      workpieceLengthMm: 500,
      startWidthMm: 60,
      endWidthMm: 35,
    });
    expect(r.taperedFaces).toBe(1);
    expect(r.jigOffsetMm).toBeCloseTo(25, 1);
  });

  it('handles a very shallow taper (small angle)', () => {
    const r = calculateTaperJig({
      workpieceLengthMm: 1000,
      startWidthMm: 50,
      endWidthMm: 48,
    });
    expect(r.taperAngleDeg).toBeGreaterThan(0);
    expect(r.taperAngleDeg).toBeLessThan(1);
  });

  describe('error guards', () => {
    it.each([
      ['zero workpieceLength', { ...BASE, workpieceLengthMm: 0 }],
      ['zero startWidth', { ...BASE, startWidthMm: 0 }],
      ['zero endWidth', { ...BASE, endWidthMm: 0 }],
      ['endWidth equal to startWidth', { ...BASE, endWidthMm: 70 }],
      ['endWidth greater than startWidth', { ...BASE, endWidthMm: 80 }],
    ])('throws RangeError for %s', (_, input) => {
      expect(() => calculateTaperJig(input)).toThrow(RangeError);
    });
  });
});
