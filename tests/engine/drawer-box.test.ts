import { describe, it, expect } from 'vitest';
import { calculateDrawerBox } from '../../src/engine/drawer-box';

describe('calculateDrawerBox', () => {
  describe('side-mount (default)', () => {
    it.each([
      {
        desc: 'standard 500 mm wide opening, side mount',
        input: { openingWidthMm: 500, openingHeightMm: 150, openingDepthMm: 550 },
        expected: {
          boxWidthMm: 500 - 25.4,
          boxHeightMm: 150 - 6,
          boxDepthMm: 550 - 19,
          isDepthAdequate: true,
        },
      },
      {
        desc: 'shallow cabinet triggers noteShort',
        input: { openingWidthMm: 400, openingHeightMm: 150, openingDepthMm: 280 },
        expected: { noteKey: 'noteShort', isDepthAdequate: false },
      },
    ])('$desc', ({ input, expected }) => {
      const r = calculateDrawerBox(input);
      if (expected.boxWidthMm !== undefined) expect(r.boxWidthMm).toBeCloseTo(expected.boxWidthMm, 1);
      if (expected.boxHeightMm !== undefined) expect(r.boxHeightMm).toBeCloseTo(expected.boxHeightMm, 1);
      if (expected.boxDepthMm !== undefined) expect(r.boxDepthMm).toBeCloseTo(expected.boxDepthMm, 1);
      if (expected.isDepthAdequate !== undefined) expect(r.isDepthAdequate).toBe(expected.isDepthAdequate);
      if (expected.noteKey !== undefined) expect(r.noteKey).toBe(expected.noteKey);
    });
  });

  describe('slide type variations', () => {
    it.each([
      { slideType: 'side' as const, expectedDeduction: 25.4 },
      { slideType: 'bottom' as const, expectedDeduction: 2 },
      { slideType: 'center' as const, expectedDeduction: 6 },
    ])('$slideType mount deducts $expectedDeduction mm from width', ({ slideType, expectedDeduction }) => {
      const r = calculateDrawerBox({ openingWidthMm: 500, openingHeightMm: 150, openingDepthMm: 550, slideType });
      expect(r.boxWidthMm).toBeCloseTo(500 - expectedDeduction, 1);
    });
  });

  describe('false front dimensions', () => {
    it('false front adds 2 mm reveal each side', () => {
      const r = calculateDrawerBox({ openingWidthMm: 500, openingHeightMm: 150, openingDepthMm: 550 });
      expect(r.falseFrontWidthMm).toBeCloseTo(500 + 4, 1);
      expect(r.falseFrontHeightMm).toBeCloseTo(150 + 4, 1);
    });
  });

  describe('throws on invalid input', () => {
    it.each([
      { desc: 'zero width', input: { openingWidthMm: 0, openingHeightMm: 150, openingDepthMm: 550 } },
      { desc: 'negative height', input: { openingWidthMm: 500, openingHeightMm: -1, openingDepthMm: 550 } },
      { desc: 'zero depth', input: { openingWidthMm: 500, openingHeightMm: 150, openingDepthMm: 0 } },
    ])('throws for $desc', ({ input }) => {
      expect(() => calculateDrawerBox(input)).toThrow(RangeError);
    });
  });
});
