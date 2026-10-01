import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateKerfBending } from '../../src/engine/kerf-bending';
import type { KerfMaterial } from '../../src/engine/kerf-bending';
import CALCGALLERY_KERF_BENDING_ORACLE from '../fixtures/oracles/calcgallery-kerf-bending.json';
import { propertyRunOptions } from '../property-seeds';

describe('calculateKerfBending', () => {
  describe('basic spacing formula', () => {
    it.each([
      // [desc, thickness, radius, kerfWidth, material, expectedSpacing approx]
      ['plywood 18mm R150', 18, 150, 3.2, 'plywood' as KerfMaterial, (3.2 * (150 + 18)) / (18 - 3)],
      ['mdf 18mm R200', 18, 200, 3.2, 'mdf' as KerfMaterial, (3.2 * (200 + 18)) / (18 - 2.5)],
      ['hardwood 25mm R300', 25, 300, 4, 'hardwood' as KerfMaterial, (4 * (300 + 25)) / (25 - 4)],
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

  it('matches CalcGallery kerf spacing for its published inside-radius example', () => {
    const { input, expected } = CALCGALLERY_KERF_BENDING_ORACLE;
    const result = calculateKerfBending(input);

    expect(result.kerfSpacingMm).toBeCloseTo(expected.kerfSpacingMm, 1);
    expect(Math.abs(result.kerfSpacingMm - CALCGALLERY_KERF_BENDING_ORACLE.sourceValues.spacingMm)).toBeLessThanOrEqual(
      CALCGALLERY_KERF_BENDING_ORACLE.toleranceMm,
    );
    expect(result.kerfCount).toBe(expected.kerfCount);
    expect(result.arcLengthMm).toBeCloseTo(expected.arcLengthMm, 1);
  });

  it('computes kerfCount as ceil(arcLength / spacing)', () => {
    const result = calculateKerfBending({
      thicknessMm: 18,
      bendRadiusMm: 150,
      kerfWidthMm: 3.2,
      material: 'plywood',
    });
    const spacing = (3.2 * (150 + 18)) / 15;
    const arc = (Math.PI / 2) * (150 + 18);
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

  it.each([
    { material: 'plywood' as const, minimumWallMm: 3 },
    { material: 'mdf' as const, minimumWallMm: 2.5 },
    { material: 'softwood' as const, minimumWallMm: 3 },
    { material: 'hardwood' as const, minimumWallMm: 4 },
  ])('uses the $material minimum wall at the infeasible thickness boundary', ({ material, minimumWallMm }) => {
    const atMinimum = calculateKerfBending({ thicknessMm: minimumWallMm, bendRadiusMm: 100, material });
    const aboveMinimum = calculateKerfBending({ thicknessMm: minimumWallMm + 1, bendRadiusMm: 100, material });

    expect(atMinimum.isFeasible).toBe(false);
    expect(atMinimum.remainingThicknessMm).toBe(minimumWallMm);
    expect(atMinimum.kerfCount).toBe(0);
    expect(aboveMinimum.kerfDepthMm).toBe(1);
    expect(aboveMinimum.remainingThicknessMm).toBe(minimumWallMm);
  });

  it.each([
    { kerfWidthMm: 1.6, expectedCount: 1, feasible: false },
    { kerfWidthMm: 0.8, expectedCount: 2, feasible: true },
  ])('applies the minimum kerf-count boundary at width $kerfWidthMm mm', ({ kerfWidthMm, expectedCount, feasible }) => {
    const result = calculateKerfBending({ thicknessMm: 4, bendRadiusMm: 100, kerfWidthMm, material: 'plywood' });

    expect(result.kerfCount).toBe(expectedCount);
    expect(result.isFeasible).toBe(feasible);
    expect(result.warningKey).toBe(feasible ? undefined : 'tooFewKerfs');
  });

  it.each([
    { kerfWidthMm: 0.1182, expectedCount: 200, feasible: true },
    { kerfWidthMm: 0.1175, expectedCount: 201, feasible: false },
  ])('applies the maximum kerf-count boundary at count $expectedCount', ({ kerfWidthMm, expectedCount, feasible }) => {
    const result = calculateKerfBending({ thicknessMm: 18, bendRadiusMm: 100, kerfWidthMm });

    expect(result.kerfCount).toBe(expectedCount);
    expect(result.isFeasible).toBe(feasible);
  });

  it('scales outside arc length and kerf spacing with the converted outside radius', () => {
    const baseline = calculateKerfBending({ thicknessMm: 18, bendRadiusMm: 100 });
    const doubledRadius = calculateKerfBending({ thicknessMm: 18, bendRadiusMm: 200 });

    expect(doubledRadius.arcLengthMm).toBeCloseTo((Math.PI / 2) * 218, 1);
    expect(doubledRadius.kerfSpacingMm).toBe(46.5);
    expect(doubledRadius.kerfCount).toBe(baseline.kerfCount);
  });

  it('rounds spacing and arc length to one decimal millimetre', () => {
    const result = calculateKerfBending({ thicknessMm: 18, bendRadiusMm: 151, kerfWidthMm: 3.2 });

    expect(result.kerfSpacingMm).toBe(36.1);
    expect(result.arcLengthMm).toBe(265.5);
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
      ['NaN thickness', { thicknessMm: Number.NaN, bendRadiusMm: 150 }],
      ['infinite radius', { thicknessMm: 18, bendRadiusMm: Number.POSITIVE_INFINITY }],
      ['NaN kerfWidth', { thicknessMm: 18, bendRadiusMm: 150, kerfWidthMm: Number.NaN }],
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

  it('replays non-finite thickness rejection at seed 303011, path 21', () => {
    const thicknessArbitrary = fc.double({ noNaN: false, noDefaultInfinity: false });

    fc.assert(
      fc.property(thicknessArbitrary, (thicknessMm) => {
        const shouldReject = !Number.isFinite(thicknessMm) || thicknessMm <= 0;

        try {
          calculateKerfBending({ thicknessMm, bendRadiusMm: 150 });
          return !shouldReject;
        } catch (error) {
          return shouldReject && error instanceof RangeError;
        }
      }),
      { ...propertyRunOptions('tests/engine/kerf-bending.test.ts', 1), path: '21' },
    );
  });
});
