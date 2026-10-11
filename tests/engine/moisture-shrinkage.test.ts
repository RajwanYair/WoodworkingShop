import { describe, it, expect } from 'vitest';
import { calculateMoistureShrinkage, MOISTURE_SHRINKAGE_LIMITS } from '../../src/engine/moisture-shrinkage';
import USDA_WHITE_OAK_SHRINKAGE_ORACLE from '../fixtures/oracles/white-oak-shrinkage-usda.json';

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

  it.each([
    {
      species: 'oak' as const,
      grain: 'tangential' as const,
      coefficient: 0.00369,
      changeAmountMm: 16.24,
      finalDimensionMm: 183.76,
    },
    {
      species: 'oak' as const,
      grain: 'radial' as const,
      coefficient: 0.00183,
      changeAmountMm: 8.05,
      finalDimensionMm: 191.95,
    },
  ])('matches the 200 mm oak $grain shrinkage oracle', (expected) => {
    expect(
      calculateMoistureShrinkage({
        initialMCPct: 30,
        targetMCPct: 8,
        species: expected.species,
        dimensionMm: 200,
        grain: expected.grain,
      }),
    ).toEqual({
      effectiveMCChangePct: 22,
      changeAmountMm: expected.changeAmountMm,
      finalDimensionMm: expected.finalDimensionMm,
      shrinkageCoefficient: expected.coefficient,
    });
  });

  it.each([
    { grain: 'radial' as const, shrinkagePct: USDA_WHITE_OAK_SHRINKAGE_ORACLE.shrinkagePct.radial },
    { grain: 'tangential' as const, shrinkagePct: USDA_WHITE_OAK_SHRINKAGE_ORACLE.shrinkagePct.tangential },
  ])('matches the USDA white-oak $grain shrinkage reference within reported variability', ({ grain, shrinkagePct }) => {
    const result = calculateMoistureShrinkage({
      initialMCPct: USDA_WHITE_OAK_SHRINKAGE_ORACLE.initialMCPct,
      targetMCPct: USDA_WHITE_OAK_SHRINKAGE_ORACLE.targetMCPct,
      species: 'oak',
      dimensionMm: USDA_WHITE_OAK_SHRINKAGE_ORACLE.dimensionMm,
      grain,
    });
    const referenceChangeMm = (USDA_WHITE_OAK_SHRINKAGE_ORACLE.dimensionMm * shrinkagePct) / 100;
    const allowedDifferenceMm = (referenceChangeMm * USDA_WHITE_OAK_SHRINKAGE_ORACLE.variabilityPct) / 100;

    expect(Math.abs(result.changeAmountMm - referenceChangeMm)).toBeLessThanOrEqual(allowedDifferenceMm);
    expect(
      Math.abs(result.finalDimensionMm - (USDA_WHITE_OAK_SHRINKAGE_ORACLE.dimensionMm - referenceChangeMm)),
    ).toBeLessThanOrEqual(allowedDifferenceMm);
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
    {
      initialMCPct: MOISTURE_SHRINKAGE_LIMITS.moistureContentPct.min,
      targetMCPct: MOISTURE_SHRINKAGE_LIMITS.moistureContentPct.max,
      dimensionMm: MOISTURE_SHRINKAGE_LIMITS.dimensionMm.min,
    },
    {
      initialMCPct: MOISTURE_SHRINKAGE_LIMITS.moistureContentPct.max,
      targetMCPct: MOISTURE_SHRINKAGE_LIMITS.moistureContentPct.min,
      dimensionMm: MOISTURE_SHRINKAGE_LIMITS.dimensionMm.max,
    },
  ])('accepts declared input boundaries: $initialMCPct% to $targetMCPct%, $dimensionMm mm', (input) => {
    expect(() => calculateMoistureShrinkage({ ...input, species: 'oak', grain: 'tangential' })).not.toThrow();
  });

  it.each([
    [
      'initialMCPct below minimum',
      { initialMCPct: -1, targetMCPct: 8, species: 'oak' as const, dimensionMm: 100, grain: 'tangential' as const },
    ],
    [
      'initialMCPct above maximum',
      { initialMCPct: 101, targetMCPct: 8, species: 'oak' as const, dimensionMm: 100, grain: 'tangential' as const },
    ],
    [
      'targetMCPct below minimum',
      { initialMCPct: 30, targetMCPct: -5, species: 'oak' as const, dimensionMm: 100, grain: 'tangential' as const },
    ],
    [
      'targetMCPct above maximum',
      { initialMCPct: 30, targetMCPct: 101, species: 'oak' as const, dimensionMm: 100, grain: 'tangential' as const },
    ],
    [
      'dimensionMm = 0',
      { initialMCPct: 30, targetMCPct: 8, species: 'oak' as const, dimensionMm: 0, grain: 'tangential' as const },
    ],
    [
      'dimensionMm above maximum',
      { initialMCPct: 30, targetMCPct: 8, species: 'oak' as const, dimensionMm: 3001, grain: 'tangential' as const },
    ],
    [
      'NaN initialMCPct',
      {
        initialMCPct: Number.NaN,
        targetMCPct: 8,
        species: 'oak' as const,
        dimensionMm: 100,
        grain: 'tangential' as const,
      },
    ],
    [
      'infinite targetMCPct',
      {
        initialMCPct: 30,
        targetMCPct: Number.POSITIVE_INFINITY,
        species: 'oak' as const,
        dimensionMm: 100,
        grain: 'tangential' as const,
      },
    ],
    [
      'NaN dimensionMm',
      {
        initialMCPct: 30,
        targetMCPct: 8,
        species: 'oak' as const,
        dimensionMm: Number.NaN,
        grain: 'tangential' as const,
      },
    ],
    [
      'overflowing change',
      {
        initialMCPct: 30,
        targetMCPct: 8,
        species: 'oak' as const,
        dimensionMm: Number.MAX_VALUE,
        grain: 'tangential' as const,
      },
    ],
  ])('throws RangeError for invalid input: %s', (_label, input) => {
    expect(() => calculateMoistureShrinkage(input)).toThrow(RangeError);
  });
});
