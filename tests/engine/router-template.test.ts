import { describe, it, expect } from 'vitest';
import { calculateRouterTemplate } from '../../src/engine/router-template';

describe('calculateRouterTemplate', () => {
  it('computes offset as (bushingOD - bitDiameter) / 2', () => {
    const result = calculateRouterTemplate({ bushingODMm: 20, bitDiameterMm: 12, cutType: 'inside' });
    expect(result.offsetMm).toBe(4);
  });

  it.each([
    { cutType: 'inside' as const, adjustmentPerSideMm: 4, totalAdjustmentMm: 8, adjustedDimensionMm: 108 },
    { cutType: 'outside' as const, adjustmentPerSideMm: -4, totalAdjustmentMm: -8, adjustedDimensionMm: 92 },
  ])('matches the 20 mm bushing / 12 mm bit $cutType oracle', ({ cutType, ...expected }) => {
    expect(calculateRouterTemplate({ bushingODMm: 20, bitDiameterMm: 12, cutType, nominalDimensionMm: 100 })).toEqual({
      offsetMm: 4,
      templateAdjustmentPerSideMm: expected.adjustmentPerSideMm,
      totalTemplateAdjustmentMm: expected.totalAdjustmentMm,
      adjustedDimensionMm: expected.adjustedDimensionMm,
    });
  });

  it('inside cut: templateAdjustmentPerSide is positive (enlarge template)', () => {
    const result = calculateRouterTemplate({ bushingODMm: 20, bitDiameterMm: 12, cutType: 'inside' });
    expect(result.templateAdjustmentPerSideMm).toBeGreaterThan(0);
  });

  it('outside cut: templateAdjustmentPerSide is negative (shrink template)', () => {
    const result = calculateRouterTemplate({ bushingODMm: 20, bitDiameterMm: 12, cutType: 'outside' });
    expect(result.templateAdjustmentPerSideMm).toBeLessThan(0);
  });

  it('totalTemplateAdjustment = 2 × perSide', () => {
    const result = calculateRouterTemplate({ bushingODMm: 20, bitDiameterMm: 12, cutType: 'inside' });
    expect(result.totalTemplateAdjustmentMm).toBeCloseTo(result.templateAdjustmentPerSideMm * 2, 5);
  });

  it('adjustedDimensionMm is null when nominalDimension not provided', () => {
    const result = calculateRouterTemplate({ bushingODMm: 20, bitDiameterMm: 12, cutType: 'inside' });
    expect(result.adjustedDimensionMm).toBeNull();
  });

  it('adjustedDimensionMm is computed when nominal is provided — inside cut enlarges feature', () => {
    const result = calculateRouterTemplate({
      bushingODMm: 20,
      bitDiameterMm: 12,
      cutType: 'inside',
      nominalDimensionMm: 100,
    });
    // offset = 4, per side = +4, total = +8 → 108
    expect(result.adjustedDimensionMm).toBeCloseTo(108, 3);
  });

  it('outside cut shrinks feature size', () => {
    const result = calculateRouterTemplate({
      bushingODMm: 20,
      bitDiameterMm: 12,
      cutType: 'outside',
      nominalDimensionMm: 100,
    });
    // offset = 4, per side = -4, total = -8 → 92
    expect(result.adjustedDimensionMm).toBeCloseTo(92, 3);
  });

  it.each([
    ['bushingODMm = 0', { bushingODMm: 0, bitDiameterMm: 12, cutType: 'inside' as const }],
    ['bitDiameterMm = 0', { bushingODMm: 20, bitDiameterMm: 0, cutType: 'inside' as const }],
    ['bushing <= bit', { bushingODMm: 12, bitDiameterMm: 12, cutType: 'inside' as const }],
    ['nominalDimension = 0', { bushingODMm: 20, bitDiameterMm: 12, cutType: 'inside' as const, nominalDimensionMm: 0 }],
  ])('throws RangeError for invalid input: %s', (_label, input) => {
    expect(() => calculateRouterTemplate(input)).toThrow(RangeError);
  });

  it.each([
    ['NaN bushingODMm', { bushingODMm: Number.NaN, bitDiameterMm: 12, cutType: 'inside' as const }],
    [
      'infinite bitDiameterMm',
      { bushingODMm: 20, bitDiameterMm: Number.POSITIVE_INFINITY, cutType: 'inside' as const },
    ],
    [
      'NaN nominalDimensionMm',
      { bushingODMm: 20, bitDiameterMm: 12, cutType: 'inside' as const, nominalDimensionMm: Number.NaN },
    ],
    [
      'outside offset consumes dimension',
      { bushingODMm: 20, bitDiameterMm: 12, cutType: 'outside' as const, nominalDimensionMm: 8 },
    ],
    ['overflowing offset', { bushingODMm: Number.MAX_VALUE, bitDiameterMm: 1, cutType: 'inside' as const }],
  ])('throws RangeError for non-finite or invalid result: %s', (_label, input) => {
    expect(() => calculateRouterTemplate(input)).toThrow(RangeError);
  });
});
