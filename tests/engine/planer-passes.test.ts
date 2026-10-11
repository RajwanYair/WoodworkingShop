import { describe, it, expect } from 'vitest';
import DEWALT_DW735_PLANER_PASSES_ORACLE from '../fixtures/oracles/dewalt-dw735-planer-passes.json';
import { calculatePlanerPasses } from '../../src/engine/planer-passes';

describe('calculatePlanerPasses', () => {
  it('matches the DW735 manual maximum-cut-depth example for pass count', () => {
    const result = calculatePlanerPasses(DEWALT_DW735_PLANER_PASSES_ORACLE.engineInput);

    expect(result.totalRemovalMm).toBe(DEWALT_DW735_PLANER_PASSES_ORACLE.expected.totalRemovalMm);
    expect(result.passCount).toBe(DEWALT_DW735_PLANER_PASSES_ORACLE.expected.passCount);
    expect(result.depthPerPassMm).toBe(DEWALT_DW735_PLANER_PASSES_ORACLE.engineInput.maxPassDepthMm);
    expect(result.depthPerPassMm).toBeLessThanOrEqual(DEWALT_DW735_PLANER_PASSES_ORACLE.engineInput.maxPassDepthMm);
  });

  const BASE = {
    initialThicknessMm: 50,
    targetThicknessMm: 45,
    boardLengthMm: 1000,
  };

  it('calculates pass count and total removal', () => {
    const r = calculatePlanerPasses(BASE);
    expect(r.passCount).toBe(4); // ceil(5 / 1.5) = 4
    expect(r.totalRemovalMm).toBe(5);
  });

  it('distributes removal evenly across passes', () => {
    const r = calculatePlanerPasses(BASE);
    expect(r.depthPerPassMm).toBe(1.25); // 5 / 4 = 1.25
  });

  it('calculates snipe allowance and effective length with defaults', () => {
    const r = calculatePlanerPasses(BASE);
    expect(r.snipeAllowanceMm).toBe(100); // 50 * 2
    expect(r.effectiveLengthMm).toBe(900); // 1000 - 100
  });

  it('matches the nominal dimensional oracle in millimetres', () => {
    expect(calculatePlanerPasses(BASE)).toEqual({
      passCount: 4,
      depthPerPassMm: 1.25,
      totalRemovalMm: 5,
      effectiveLengthMm: 900,
      snipeAllowanceMm: 100,
    });
  });

  it.each([
    { removalMm: 3, maxPassDepthMm: 1.5, expectedPasses: 2 },
    { removalMm: 3.01, maxPassDepthMm: 1.5, expectedPasses: 3 },
    { removalMm: 4.5, maxPassDepthMm: 1.5, expectedPasses: 3 },
  ])('uses the minimum safe pass count for $removalMm mm removal', ({ removalMm, maxPassDepthMm, expectedPasses }) => {
    const result = calculatePlanerPasses({
      initialThicknessMm: 50,
      targetThicknessMm: 50 - removalMm,
      maxPassDepthMm,
      boardLengthMm: 1000,
    });

    expect(result.passCount).toBe(expectedPasses);
    expect(result.depthPerPassMm).toBeLessThanOrEqual(maxPassDepthMm);
  });

  it('uses custom maxPassDepthMm', () => {
    const r = calculatePlanerPasses({ ...BASE, maxPassDepthMm: 1 });
    expect(r.passCount).toBe(5); // ceil(5 / 1) = 5
  });

  it('uses custom snipeLengthMm', () => {
    const r = calculatePlanerPasses({ ...BASE, snipeLengthMm: 75 });
    expect(r.snipeAllowanceMm).toBe(150);
    expect(r.effectiveLengthMm).toBe(850);
  });

  it('single pass when removal ≤ maxPassDepth', () => {
    const r = calculatePlanerPasses({ initialThicknessMm: 46, targetThicknessMm: 45, boardLengthMm: 1000 });
    expect(r.passCount).toBe(1);
    expect(r.depthPerPassMm).toBe(1);
  });

  it('clamps effectiveLengthMm to 0 when snipe exceeds board length', () => {
    const r = calculatePlanerPasses({ ...BASE, boardLengthMm: 100, snipeLengthMm: 75 });
    expect(r.effectiveLengthMm).toBe(0); // max(0, 100 - 150)
  });

  describe('error guards', () => {
    it.each([
      ['zero initialThickness', { ...BASE, initialThicknessMm: 0 }],
      ['zero targetThickness', { ...BASE, targetThicknessMm: 0 }],
      ['target >= initial', { ...BASE, targetThicknessMm: 50 }],
      ['zero boardLength', { ...BASE, boardLengthMm: 0 }],
      ['negative snipeLength', { ...BASE, snipeLengthMm: -1 }],
      ['NaN initialThickness', { ...BASE, initialThicknessMm: Number.NaN }],
      ['infinite targetThickness', { ...BASE, targetThicknessMm: Number.POSITIVE_INFINITY }],
      ['NaN maxPassDepth', { ...BASE, maxPassDepthMm: Number.NaN }],
      ['infinite boardLength', { ...BASE, boardLengthMm: Number.POSITIVE_INFINITY }],
      ['NaN snipeLength', { ...BASE, snipeLengthMm: Number.NaN }],
      ['overflowing pass count', { ...BASE, maxPassDepthMm: Number.MIN_VALUE }],
      ['overflowing snipe allowance', { ...BASE, snipeLengthMm: Number.MAX_VALUE }],
    ])('throws RangeError for %s', (_, input) => {
      expect(() => calculatePlanerPasses(input)).toThrow(RangeError);
    });
  });
});
