import { describe, it, expect } from 'vitest';
import { calculateCrownMoulding } from '../../src/engine/crown-moulding';

describe('calculateCrownMoulding', () => {
  describe('in_position method', () => {
    it('calculates miter angle as (180 - corner) / 2, bevel = 0 for 90° corner', () => {
      const result = calculateCrownMoulding({ cornerAngleDeg: 90, springAngleDeg: 38, cuttingMethod: 'in_position' });
      expect(result.miterAngleDeg).toBe(45);
      expect(result.bevelAngleDeg).toBe(0);
      expect(result.cuttingMethod).toBe('in_position');
    });

    it('calculates miter angle for 135° corner in_position', () => {
      const result = calculateCrownMoulding({ cornerAngleDeg: 135, springAngleDeg: 38, cuttingMethod: 'in_position' });
      expect(result.miterAngleDeg).toBe(22.5);
      expect(result.bevelAngleDeg).toBe(0);
    });

    it.each([
      { cornerAngleDeg: 90, miterAngleDeg: 45 },
      { cornerAngleDeg: 135, miterAngleDeg: 22.5 },
      { cornerAngleDeg: 179.8, miterAngleDeg: 0.1 },
    ])('matches the in-position miter oracle for a $cornerAngleDeg° corner', ({ cornerAngleDeg, miterAngleDeg }) => {
      expect(calculateCrownMoulding({ cornerAngleDeg, springAngleDeg: 38, cuttingMethod: 'in_position' })).toEqual({
        miterAngleDeg,
        bevelAngleDeg: 0,
        cuttingMethod: 'in_position',
      });
    });
  });

  describe('flat method', () => {
    it('returns compound angles for 90° corner with 38° spring (flat)', () => {
      const result = calculateCrownMoulding({ cornerAngleDeg: 90, springAngleDeg: 38, cuttingMethod: 'flat' });
      expect(result.cuttingMethod).toBe('flat');
      expect(result.miterAngleDeg).toBe(38.2);
      expect(result.bevelAngleDeg).toBe(25.8);
    });

    it('matches the compound-angle oracle for a 135° corner and 38° spring', () => {
      expect(calculateCrownMoulding({ cornerAngleDeg: 135, springAngleDeg: 38, cuttingMethod: 'flat' })).toEqual({
        miterAngleDeg: 62.3,
        bevelAngleDeg: 34.7,
        cuttingMethod: 'flat',
      });
    });

    it('returns positive miter and bevel angles for flat method', () => {
      const result = calculateCrownMoulding({ cornerAngleDeg: 90, springAngleDeg: 45, cuttingMethod: 'flat' });
      expect(result.miterAngleDeg).toBeGreaterThan(0);
      expect(result.bevelAngleDeg).toBeGreaterThan(0);
    });

    it('flat method bevel is less than miter angle for common angles', () => {
      const result = calculateCrownMoulding({ cornerAngleDeg: 90, springAngleDeg: 38, cuttingMethod: 'flat' });
      expect(result.bevelAngleDeg).toBeLessThan(result.miterAngleDeg);
    });

    it('echoes cuttingMethod', () => {
      const result = calculateCrownMoulding({ cornerAngleDeg: 90, springAngleDeg: 38, cuttingMethod: 'flat' });
      expect(result.cuttingMethod).toBe('flat');
    });
  });

  it.each([
    ['cornerAngleDeg = 0', { cornerAngleDeg: 0, springAngleDeg: 38, cuttingMethod: 'flat' as const }],
    ['cornerAngleDeg = 180', { cornerAngleDeg: 180, springAngleDeg: 38, cuttingMethod: 'flat' as const }],
    ['springAngleDeg = 0', { cornerAngleDeg: 90, springAngleDeg: 0, cuttingMethod: 'flat' as const }],
    ['springAngleDeg = 90', { cornerAngleDeg: 90, springAngleDeg: 90, cuttingMethod: 'flat' as const }],
  ])('throws RangeError for invalid input: %s', (_label, input) => {
    expect(() => calculateCrownMoulding(input)).toThrow(RangeError);
  });

  it.each([
    ['NaN cornerAngleDeg', { cornerAngleDeg: Number.NaN, springAngleDeg: 38, cuttingMethod: 'flat' as const }],
    [
      'infinite springAngleDeg',
      { cornerAngleDeg: 90, springAngleDeg: Number.POSITIVE_INFINITY, cuttingMethod: 'flat' as const },
    ],
  ])('throws RangeError for non-finite input: %s', (_label, input) => {
    expect(() => calculateCrownMoulding(input)).toThrow(RangeError);
  });
});
