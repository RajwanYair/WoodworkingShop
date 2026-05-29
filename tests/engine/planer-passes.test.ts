import { describe, it, expect } from 'vitest';
import { calculatePlanerPasses } from '../../src/engine/planer-passes';

describe('calculatePlanerPasses', () => {
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
    ])('throws RangeError for %s', (_, input) => {
      expect(() => calculatePlanerPasses(input)).toThrow(RangeError);
    });
  });
});
