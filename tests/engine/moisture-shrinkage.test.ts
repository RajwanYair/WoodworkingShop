import { describe, it, expect } from 'vitest';
import { calculateMoistureShrinkage } from '../../src/engine/moisture-shrinkage';

describe('calculateMoistureShrinkage', () => {
  it('computes shrinkage for oak tangential from 30% to 8%', () => {
    const result = calculateMoistureShrinkage({
      initialMCPct: 30,
      targetMCPct: 8,
      species: 'oak',
      dimensionMm: 200,
      grain: 'tangential',
    });
    expect(result.effectiveMCChangePct).toBe(22);
    // 200 * 22 * 0.00369 ≈ 16.24 mm
    expect(result.changeAmountMm).toBeCloseTo(16.24, 1);
    expect(result.finalDimensionMm).toBeCloseTo(200 - 16.24, 1);
  });

  it('caps effective MC at FSP (30%) when initial MC > 30', () => {
    const above = calculateMoistureShrinkage({
      initialMCPct: 80,
      targetMCPct: 10,
      species: 'pine',
      dimensionMm: 100,
      grain: 'radial',
    });
    const atFSP = calculateMoistureShrinkage({
      initialMCPct: 30,
      targetMCPct: 10,
      species: 'pine',
      dimensionMm: 100,
      grain: 'radial',
    });
    expect(above.effectiveMCChangePct).toBe(atFSP.effectiveMCChangePct);
    expect(above.changeAmountMm).toBe(atFSP.changeAmountMm);
  });

  it('returns zero change when drying and both MCs are above FSP', () => {
    const result = calculateMoistureShrinkage({
      initialMCPct: 50,
      targetMCPct: 40,
      species: 'walnut',
      dimensionMm: 150,
      grain: 'tangential',
    });
    expect(result.effectiveMCChangePct).toBe(0);
    expect(result.changeAmountMm).toBe(0);
    expect(result.finalDimensionMm).toBe(150);
  });

  it('returns negative changeAmountMm (swelling) when target MC > initial MC', () => {
    const result = calculateMoistureShrinkage({
      initialMCPct: 8,
      targetMCPct: 20,
      species: 'maple',
      dimensionMm: 100,
      grain: 'tangential',
    });
    expect(result.effectiveMCChangePct).toBe(-12);
    expect(result.changeAmountMm).toBeLessThan(0);
  });

  it('uses correct shrinkage coefficient for species and grain', () => {
    const result = calculateMoistureShrinkage({
      initialMCPct: 20,
      targetMCPct: 10,
      species: 'cherry',
      dimensionMm: 100,
      grain: 'radial',
    });
    expect(result.shrinkageCoefficient).toBe(0.00193);
  });

  it.each([
    [
      'initialMCPct < 0',
      { initialMCPct: -1, targetMCPct: 8, species: 'oak' as const, dimensionMm: 100, grain: 'tangential' as const },
    ],
    [
      'targetMCPct < 0',
      { initialMCPct: 30, targetMCPct: -5, species: 'oak' as const, dimensionMm: 100, grain: 'tangential' as const },
    ],
    [
      'dimensionMm = 0',
      { initialMCPct: 30, targetMCPct: 8, species: 'oak' as const, dimensionMm: 0, grain: 'tangential' as const },
    ],
  ])('throws RangeError for invalid input: %s', (_label, input) => {
    expect(() => calculateMoistureShrinkage(input)).toThrow(RangeError);
  });
});
