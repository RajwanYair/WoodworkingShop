import { describe, it, expect } from 'vitest';
import { calculateKerfBending } from '../../src/engine/kerf-bending';
import type { KerfMaterial } from '../../src/engine/kerf-bending';

describe('calculateKerfBending', () => {
  describe('basic spacing formula', () => {
    it.each([
      // [desc, thickness, radius, kerfWidth, material, expectedSpacing approx]
      ['plywood 18mm R150', 18, 150, 3.2, 'plywood' as KerfMaterial, (3.2 * 150) / (18 - 3)],
      ['mdf 18mm R200', 18, 200, 3.2, 'mdf' as KerfMaterial, (3.2 * 200) / (18 - 2.5)],
      ['hardwood 25mm R300', 25, 300, 4, 'hardwood' as KerfMaterial, (4 * 300) / (25 - 4)],
    ])('%s: spacing matches formula', (_desc, t, r, kw, mat, expectedSpacing) => {
      const result = calculateKerfBending({
        thicknessMm: t,
        bendRadiusMm: r,
        kerfWidthMm: kw,
        material: mat,
      });
      expect(result.kerfSpacingMm).toBeCloseTo(expectedSpacing, 0);
      expect(result.isFeasible).toBe(true);
    });
  });

  it('computes kerfCount as ceil(arcLength / spacing)', () => {
    const result = calculateKerfBending({
      thicknessMm: 18,
      bendRadiusMm: 150,
      kerfWidthMm: 3.2,
      material: 'plywood',
    });
    const spacing = (3.2 * 150) / 15;
    const arc = (Math.PI / 2) * 150;
    expect(result.kerfCount).toBe(Math.ceil(arc / spacing));
  });

  it('remaining thickness equals material min wall', () => {
    const result = calculateKerfBending({
      thicknessMm: 18,
      bendRadiusMm: 200,
      material: 'plywood',
    });
    expect(result.remainingThicknessMm).toBe(3);
  });

  it('defaults kerfWidth to 3.2 mm', () => {
    const withDefault = calculateKerfBending({ thicknessMm: 18, bendRadiusMm: 200, material: 'mdf' });
    const explicit = calculateKerfBending({ thicknessMm: 18, bendRadiusMm: 200, kerfWidthMm: 3.2, material: 'mdf' });
    expect(withDefault.kerfSpacingMm).toBe(explicit.kerfSpacingMm);
  });

  describe('error guards', () => {
    it.each([
      ['zero thickness', { thicknessMm: 0, bendRadiusMm: 150 }],
      ['negative radius', { thicknessMm: 18, bendRadiusMm: -10 }],
      ['zero kerfWidth', { thicknessMm: 18, bendRadiusMm: 150, kerfWidthMm: 0 }],
    ])('throws for %s', (_label, input) => {
      expect(() => calculateKerfBending(input as Parameters<typeof calculateKerfBending>[0])).toThrow(RangeError);
    });
  });

  it('returns infeasible when panel too thin to kerf (plywood 3mm)', () => {
    const result = calculateKerfBending({ thicknessMm: 3, bendRadiusMm: 100, material: 'plywood' });
    expect(result.isFeasible).toBe(false);
    expect(result.warningKey).toBe('tooFewKerfs');
    expect(result.kerfCount).toBe(0);
  });
});
