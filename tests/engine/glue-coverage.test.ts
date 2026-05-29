import { describe, it, expect } from 'vitest';
import { calculateGlueCoverage } from '../../src/engine/glue-coverage';
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

  describe('error guards', () => {
    it.each([
      ['zero surfaceArea', { surfaceAreaMm2: 0, glueType: 'pva' as WoodGlueType }],
      ['negative surfaceArea', { surfaceAreaMm2: -500, glueType: 'pva' as WoodGlueType }],
      ['zero jointCount', { ...BASE, jointCount: 0 }],
    ])('throws RangeError for %s', (_, input) => {
      expect(() => calculateGlueCoverage(input)).toThrow(RangeError);
    });
  });
});
