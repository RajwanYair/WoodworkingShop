import { describe, it, expect } from 'vitest';
import TITEBOND_WOOD_GLUE_CLAMPING_ORACLE from '../fixtures/oracles/titebond-wood-glue-clamping.json';
import { calculateGlueCoverage } from '../../src/engine/glue-coverage';
import { GLUE_COVERAGE_LIMITS } from '../../src/engine/glue-coverage';
import type { WoodGlueType } from '../../src/engine/glue-coverage';

describe('calculateGlueCoverage', () => {
  const BASE: { surfaceAreaMm2: number; glueType: WoodGlueType } = {
    surfaceAreaMm2: 100000,
    glueType: 'pva',
  };

  it('netVolumeMl = (area_mm2 / 1e6) / spreadRate * 1000 for PVA', () => {
    const r = calculateGlueCoverage(BASE);
    const expected = (100000 / 1_000_000 / 180) * 1000;
    expect(r.netVolumeMl).toBeCloseTo(expected, 2);
  });

  it('recommendedVolumeMl is netVolume × 1.15', () => {
    const r = calculateGlueCoverage(BASE);
    expect(r.recommendedVolumeMl).toBeCloseTo(r.netVolumeMl * 1.15, 1);
  });

  it.each([
    {
      glueType: 'pva' as const,
      netVolumeMl: 20,
      recommendedVolumeMl: 23,
      openTimeMin: 10,
      clampingTimeMin: 30,
      cureTimeHours: 24,
    },
    {
      glueType: 'polyurethane' as const,
      netVolumeMl: 14.4,
      recommendedVolumeMl: 16.56,
      openTimeMin: 15,
      clampingTimeMin: 60,
      cureTimeHours: 4,
    },
    {
      glueType: 'epoxy' as const,
      netVolumeMl: 30,
      recommendedVolumeMl: 34.5,
      openTimeMin: 20,
      clampingTimeMin: 60,
      cureTimeHours: 8,
    },
    {
      glueType: 'hide' as const,
      netVolumeMl: 22.5,
      recommendedVolumeMl: 25.88,
      openTimeMin: 5,
      clampingTimeMin: 45,
      cureTimeHours: 12,
    },
    {
      glueType: 'ca' as const,
      netVolumeMl: 9,
      recommendedVolumeMl: 10.35,
      openTimeMin: 1,
      clampingTimeMin: 5,
      cureTimeHours: 1,
    },
  ])('matches the 3.6 m² glue oracle for $glueType', (expected) => {
    const result = calculateGlueCoverage({ surfaceAreaMm2: 3_600_000, glueType: expected.glueType });

    expect(result).toEqual({
      ...expected,
      spreadRateM2PerL: { pva: 180, polyurethane: 250, epoxy: 120, hide: 160, ca: 400 }[expected.glueType],
      glueType: expected.glueType,
    });
  });

  it('scales linearly with jointCount', () => {
    const r1 = calculateGlueCoverage({ ...BASE, jointCount: 1 });
    const r3 = calculateGlueCoverage({ ...BASE, jointCount: 3 });
    expect(r3.netVolumeMl).toBeCloseTo(r1.netVolumeMl * 3, 1);
  });

  it('returns correct open/clamp/cure times for polyurethane', () => {
    const r = calculateGlueCoverage({ ...BASE, glueType: 'polyurethane' });
    expect(r.openTimeMin).toBe(15);
    expect(r.clampingTimeMin).toBe(60);
    expect(r.cureTimeHours).toBe(4);
  });

  it('matches Titebond unstressed-joint minimum clamping time for PVA', () => {
    const result = calculateGlueCoverage({
      surfaceAreaMm2: TITEBOND_WOOD_GLUE_CLAMPING_ORACLE.input.surfaceAreaMm2,
      glueType: TITEBOND_WOOD_GLUE_CLAMPING_ORACLE.input.glueType as WoodGlueType,
    });

    expect(result.clampingTimeMin).toBe(TITEBOND_WOOD_GLUE_CLAMPING_ORACLE.expected.clampingTimeMin);
  });

  it('returns correct spread rate for epoxy', () => {
    const r = calculateGlueCoverage({ ...BASE, glueType: 'epoxy' });
    expect(r.spreadRateM2PerL).toBe(120);
  });

  it('CA glue has highest spread rate (400 m²/L)', () => {
    const rCa = calculateGlueCoverage({ ...BASE, glueType: 'ca' });
    const rPva = calculateGlueCoverage(BASE);
    expect(rCa.netVolumeMl).toBeLessThan(rPva.netVolumeMl);
    expect(rCa.spreadRateM2PerL).toBe(400);
  });

  it('echoes back glueType', () => {
    const r = calculateGlueCoverage({ ...BASE, glueType: 'hide' });
    expect(r.glueType).toBe('hide');
  });

  it('defaults jointCount to 1 when omitted', () => {
    const r = calculateGlueCoverage(BASE);
    expect(r.netVolumeMl).toBeGreaterThan(0);
  });

  it.each([
    {
      surfaceAreaMm2: GLUE_COVERAGE_LIMITS.surfaceAreaMm2.min,
      jointCount: GLUE_COVERAGE_LIMITS.jointCount.min,
    },
    {
      surfaceAreaMm2: GLUE_COVERAGE_LIMITS.surfaceAreaMm2.max,
      jointCount: GLUE_COVERAGE_LIMITS.jointCount.max,
    },
  ])('accepts declared inclusive boundaries: $surfaceAreaMm2 mm² and $jointCount joints', (input) => {
    expect(() => calculateGlueCoverage({ ...input, glueType: 'pva' })).not.toThrow();
  });

  describe('error guards', () => {
    it.each([
      ['zero surfaceArea', { surfaceAreaMm2: 0, glueType: 'pva' as WoodGlueType }],
      ['surfaceArea below minimum', { surfaceAreaMm2: 99, glueType: 'pva' as WoodGlueType }],
      ['surfaceArea above maximum', { surfaceAreaMm2: 10_000_001, glueType: 'pva' as WoodGlueType }],
      ['negative surfaceArea', { surfaceAreaMm2: -500, glueType: 'pva' as WoodGlueType }],
      ['zero jointCount', { ...BASE, jointCount: 0 }],
      ['jointCount above maximum', { ...BASE, jointCount: 101 }],
      ['fractional jointCount', { ...BASE, jointCount: 1.5 }],
      ['NaN surfaceArea', { surfaceAreaMm2: Number.NaN, glueType: 'pva' as WoodGlueType }],
      ['infinite surfaceArea', { surfaceAreaMm2: Number.POSITIVE_INFINITY, glueType: 'pva' as WoodGlueType }],
      ['NaN jointCount', { ...BASE, jointCount: Number.NaN }],
      ['infinite jointCount', { ...BASE, jointCount: Number.POSITIVE_INFINITY }],
      [
        'overflowing combined area',
        { surfaceAreaMm2: Number.MAX_VALUE, glueType: 'pva' as WoodGlueType, jointCount: 2 },
      ],
    ])('throws RangeError for %s', (_, input) => {
      expect(() => calculateGlueCoverage(input)).toThrow(RangeError);
    });
  });
});
