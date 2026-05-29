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
  });

  describe('flat method', () => {
    it('returns compound angles for 90° corner with 38° spring (flat)', () => {
      const result = calculateCrownMoulding({ cornerAngleDeg: 90, springAngleDeg: 38, cuttingMethod: 'flat' });
      expect(result.cuttingMethod).toBe('flat');
      // For 90° corner: halfCorner = 45°; miter = atan(cos(38°)×tan(45°))
      const halfCornerRad = (45 * Math.PI) / 180;
      const springRad = (38 * Math.PI) / 180;
      const expectedMiter =
        Math.round(((Math.atan(Math.cos(springRad) * Math.tan(halfCornerRad)) * 180) / Math.PI) * 10) / 10;
      const expectedBevel =
        Math.round(((Math.asin(Math.sin(springRad) * Math.sin(halfCornerRad)) * 180) / Math.PI) * 10) / 10;
      expect(result.miterAngleDeg).toBe(expectedMiter);
      expect(result.bevelAngleDeg).toBe(expectedBevel);
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
});
