import { describe, it, expect } from 'vitest';
import { calculateDeflection, getModulus } from '../../src/engine/shelf-deflection';
import type { DeflectionInput } from '../../src/engine/shelf-deflection';

describe('calculateDeflection', () => {
  const baseInput: DeflectionInput = {
    spanMm: 900,
    widthMm: 250,
    thicknessMm: 18,
    material: 'plywood',
    loadType: 'uniform',
    loadN: 100,
    support: 'simple',
  };

  it('calculates uniform load deflection on simple supports', () => {
    const r = calculateDeflection(baseInput);
    expect(r.maxDeflectionMm).toBeGreaterThan(0);
    expect(r.modulusMPa).toBe(8300);
    expect(r.momentOfInertiaMm4).toBeGreaterThan(0);
    expect(r.spanThicknessRatio).toBe(50);
    expect(r.deflectionRatio).toBeGreaterThan(0);
  });

  it('center load produces more deflection than uniform for same total load', () => {
    const uniform = calculateDeflection(baseInput);
    const center = calculateDeflection({ ...baseInput, loadType: 'center' });
    // Center point load has higher peak deflection than same total uniform
    // uniform: 5wL⁴/384EI, center: PL³/48EI
    // ratio = (PL³/48) / (5·P/L·L⁴/384) = 384/(48·5) = 1.6
    expect(center.maxDeflectionMm).toBeGreaterThan(uniform.maxDeflectionMm);
  });

  it('fixed supports reduce deflection', () => {
    const simple = calculateDeflection(baseInput);
    const fixed = calculateDeflection({ ...baseInput, support: 'fixed' });
    expect(fixed.maxDeflectionMm).toBeLessThan(simple.maxDeflectionMm);
    expect(fixed.maxDeflectionMm).toBeCloseTo(simple.maxDeflectionMm / 5, 1);
  });

  it('thicker shelf deflects less', () => {
    const thin = calculateDeflection(baseInput);
    const thick = calculateDeflection({ ...baseInput, thicknessMm: 25 });
    expect(thick.maxDeflectionMm).toBeLessThan(thin.maxDeflectionMm);
  });

  it('longer span deflects more', () => {
    const short = calculateDeflection(baseInput);
    const long = calculateDeflection({ ...baseInput, spanMm: 1200 });
    expect(long.maxDeflectionMm).toBeGreaterThan(short.maxDeflectionMm);
  });

  it('reports exceedsLimit correctly', () => {
    // Heavy load on long thin shelf
    const heavy = calculateDeflection({
      ...baseInput,
      spanMm: 1200,
      thicknessMm: 12,
      material: 'particleboard',
      loadN: 300,
    });
    expect(heavy.exceedsLimit).toBe(true);

    // Light load on thick short shelf
    const light = calculateDeflection({
      ...baseInput,
      spanMm: 400,
      thicknessMm: 25,
      material: 'solidWood',
      loadN: 30,
    });
    expect(light.exceedsLimit).toBe(false);
  });

  it('combined load is between uniform and center', () => {
    const uniform = calculateDeflection(baseInput);
    const center = calculateDeflection({ ...baseInput, loadType: 'center' });
    const combined = calculateDeflection({ ...baseInput, loadType: 'combined' });
    expect(combined.maxDeflectionMm).toBeGreaterThan(uniform.maxDeflectionMm);
    expect(combined.maxDeflectionMm).toBeLessThan(center.maxDeflectionMm);
  });

  it('zero load produces zero deflection', () => {
    const r = calculateDeflection({ ...baseInput, loadN: 0 });
    expect(r.maxDeflectionMm).toBe(0);
    expect(r.exceedsLimit).toBe(false);
  });

  it('uses custom modulus', () => {
    const r = calculateDeflection({
      ...baseInput,
      material: 'custom',
      customModulusMPa: 5000,
    });
    expect(r.modulusMPa).toBe(5000);
  });

  it('recommendedMaxSpanMm is a positive number', () => {
    const r = calculateDeflection(baseInput);
    expect(r.recommendedMaxSpanMm).toBeGreaterThan(0);
    expect(Number.isFinite(r.recommendedMaxSpanMm)).toBe(true);
  });

  describe('validation', () => {
    it.each([
      ['spanMm <= 0', { ...baseInput, spanMm: 0 }],
      ['widthMm <= 0', { ...baseInput, widthMm: -10 }],
      ['thicknessMm <= 0', { ...baseInput, thicknessMm: 0 }],
      ['loadN < 0', { ...baseInput, loadN: -5 }],
      ['custom without modulus', { ...baseInput, material: 'custom' as const }],
    ])('throws RangeError for %s', (_label, input) => {
      expect(() => calculateDeflection(input as DeflectionInput)).toThrow(RangeError);
    });
  });
});

describe('getModulus', () => {
  it.each([
    ['solidWood', 11000],
    ['plywood', 8300],
    ['mdf', 3500],
    ['particleboard', 2500],
    ['melamine', 2800],
  ] as const)('returns correct value for %s', (mat, expected) => {
    expect(getModulus(mat)).toBe(expected);
  });

  it('returns custom value', () => {
    expect(getModulus('custom', 7000)).toBe(7000);
  });

  it('throws for custom without value', () => {
    expect(() => getModulus('custom')).toThrow(RangeError);
  });

  it('throws for custom with zero', () => {
    expect(() => getModulus('custom', 0)).toThrow(RangeError);
  });
});
