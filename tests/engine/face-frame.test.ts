import { describe, it, expect } from 'vitest';
import WOODWORKCALC_FACE_FRAME_ORACLE from '../fixtures/oracles/woodworkcalc-face-frame.json';
import { calculateFaceFrame } from '../../src/engine/face-frame';

describe('calculateFaceFrame', () => {
  it('matches shared frame dimensions from the published WoodWorkCalc example', () => {
    const { engineInput, expected } = WOODWORKCALC_FACE_FRAME_ORACLE;
    const result = calculateFaceFrame(engineInput);

    expect(result.railLengthMm).toBe(expected.railLengthMm);
    expect(result.stileLengthMm).toBe(expected.stileLengthMm);
  });

  describe('single opening', () => {
    it.each([
      {
        desc: 'standard 600×720 cabinet with default 38 mm members',
        input: { cabinetWidthMm: 600, cabinetHeightMm: 720 },
        expected: {
          stileLengthMm: 720,
          railLengthMm: 600 - 2 * 38,
          openingWidthMm: 600 - 2 * 38,
          openingHeightMm: 720 - 2 * 38,
          partCount: 3,
        },
      },
      {
        desc: 'narrow 300 mm cabinet',
        input: { cabinetWidthMm: 300, cabinetHeightMm: 600 },
        expected: {
          stileLengthMm: 600,
          railLengthMm: 300 - 2 * 38,
          partCount: 3,
        },
      },
    ])('$desc', ({ input, expected }) => {
      const r = calculateFaceFrame(input);
      expect(r.stileLengthMm).toBeCloseTo(expected.stileLengthMm, 1);
      expect(r.railLengthMm).toBeCloseTo(expected.railLengthMm, 1);
      if (expected.openingWidthMm !== undefined) expect(r.openingWidthMm).toBeCloseTo(expected.openingWidthMm, 1);
      if (expected.openingHeightMm !== undefined) expect(r.openingHeightMm).toBeCloseTo(expected.openingHeightMm, 1);
      if (expected.partCount !== undefined) expect(r.partList).toHaveLength(expected.partCount);
    });
  });

  describe('multiple openings', () => {
    it('2 openings produces middle rail in part list', () => {
      const r = calculateFaceFrame({ cabinetWidthMm: 600, cabinetHeightMm: 900, openingCount: 2 });
      expect(r.partList).toHaveLength(4); // stile, top, bottom, middle
      expect(r.partList.find((p) => p.label === 'Middle Rail')).toBeDefined();
    });

    it('3 openings produces 2 middle rails (qty 2)', () => {
      const r = calculateFaceFrame({ cabinetWidthMm: 600, cabinetHeightMm: 1200, openingCount: 3 });
      const mid = r.partList.find((p) => p.label === 'Middle Rail');
      expect(mid?.qty).toBe(2);
    });

    it('opening height is divided evenly', () => {
      const r = calculateFaceFrame({ cabinetWidthMm: 600, cabinetHeightMm: 720, openingCount: 2, railWidthMm: 38 });
      const totalRails = 3 * 38; // 3 rails for 2 openings
      const expectedHeight = (720 - totalRails) / 2;
      expect(r.openingHeightMm).toBeCloseTo(expectedHeight, 1);
    });
  });

  describe('boundary dimensions and opening counts', () => {
    it.each([
      {
        desc: 'minimum positive dimensions with minimum member widths',
        input: { cabinetWidthMm: 100, cabinetHeightMm: 100, stileWidthMm: 19, railWidthMm: 19 },
        expected: { stileLengthMm: 100, railLengthMm: 62, openingWidthMm: 62, openingHeightMm: 62 },
      },
      {
        desc: 'four openings with fractional millimetre height',
        input: { cabinetWidthMm: 2400, cabinetHeightMm: 1000, stileWidthMm: 100, railWidthMm: 50, openingCount: 4 },
        expected: { stileLengthMm: 1000, railLengthMm: 2200, openingWidthMm: 2200, openingHeightMm: 187.5 },
      },
    ])('calculates $desc in millimetres', ({ input, expected }) => {
      const result = calculateFaceFrame(input);

      expect(result.stileLengthMm).toBe(expected.stileLengthMm);
      expect(result.railLengthMm).toBe(expected.railLengthMm);
      expect(result.openingWidthMm).toBe(expected.openingWidthMm);
      expect(result.openingHeightMm).toBe(expected.openingHeightMm);
    });
  });

  describe('glue surface', () => {
    it('computes correctly for 1 opening', () => {
      const r = calculateFaceFrame({ cabinetWidthMm: 600, cabinetHeightMm: 720, stileWidthMm: 38, railWidthMm: 38 });
      // 2 rails × 2 joints × 38 × 38
      expect(r.totalGlueSurfaceMm2).toBe(2 * 2 * 38 * 38);
    });
  });

  describe('throws on invalid input', () => {
    it.each([
      { desc: 'zero width', input: { cabinetWidthMm: 0, cabinetHeightMm: 720 } },
      { desc: 'negative height', input: { cabinetWidthMm: 600, cabinetHeightMm: -1 } },
      { desc: 'zero stile width', input: { cabinetWidthMm: 600, cabinetHeightMm: 720, stileWidthMm: 0 } },
      { desc: 'negative rail width', input: { cabinetWidthMm: 600, cabinetHeightMm: 720, railWidthMm: -1 } },
      { desc: 'stiles wider than cabinet', input: { cabinetWidthMm: 100, cabinetHeightMm: 720, stileWidthMm: 60 } },
      { desc: 'rails leave no room for an opening', input: { cabinetWidthMm: 600, cabinetHeightMm: 76 } },
      { desc: 'fractional opening count', input: { cabinetWidthMm: 600, cabinetHeightMm: 720, openingCount: 1.5 } },
      { desc: 'opening count 0', input: { cabinetWidthMm: 600, cabinetHeightMm: 720, openingCount: 0 } },
      { desc: 'opening count 5', input: { cabinetWidthMm: 600, cabinetHeightMm: 720, openingCount: 5 } },
    ])('throws for $desc', ({ input }) => {
      expect(() => calculateFaceFrame(input)).toThrow(RangeError);
    });
  });
});
