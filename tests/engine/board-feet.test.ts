import { describe, it, expect } from 'vitest';
import {
  calculateBoardFeet,
  linearFeetToBoardFeet,
  NOMINAL_TO_ACTUAL,
  SPECIES_COST_PER_BF,
} from '../../src/engine/board-feet';
import type { BoardFeetInput } from '../../src/engine/board-feet';

const baseInput: BoardFeetInput = {
  thicknessIn: 1,
  widthIn: 6,
  lengthIn: 96,
};

describe('calculateBoardFeet', () => {
  it('computes board feet for 1×6×96 (actual dimensions)', () => {
    const result = calculateBoardFeet(baseInput);
    // BF = (1 × 6 × 96) / 144 = 4.0
    expect(result.boardFeet).toBe(4);
    expect(result.totalBoardFeet).toBe(4);
    expect(result.actualThicknessIn).toBe(1);
    expect(result.actualWidthIn).toBe(6);
  });

  it('converts nominal 2×4 to actual 1.5×3.5', () => {
    const result = calculateBoardFeet({
      thicknessIn: 2,
      widthIn: 4,
      lengthIn: 96,
      useNominal: true,
    });
    expect(result.actualThicknessIn).toBe(1.5);
    expect(result.actualWidthIn).toBe(3.5);
    // BF = (1.5 × 3.5 × 96) / 144 = 3.5
    expect(result.boardFeet).toBe(3.5);
  });

  it('multiplies by quantity', () => {
    const result = calculateBoardFeet({ ...baseInput, quantity: 5 });
    expect(result.totalBoardFeet).toBe(20);
  });

  it('estimates cost from species lookup', () => {
    const result = calculateBoardFeet({ ...baseInput, species: 'walnut' });
    // 4 BF × $12/BF = $48
    expect(result.estimatedCost).toBe(48);
  });

  it('uses custom costPerBf over species', () => {
    const result = calculateBoardFeet({
      ...baseInput,
      species: 'walnut',
      costPerBf: 10,
    });
    // 4 BF × $10 = $40
    expect(result.estimatedCost).toBe(40);
  });

  it('returns null cost when no species or costPerBf', () => {
    const result = calculateBoardFeet(baseInput);
    expect(result.estimatedCost).toBeNull();
  });

  it('returns null cost for unknown species', () => {
    const result = calculateBoardFeet({ ...baseInput, species: 'zebrawood' });
    expect(result.estimatedCost).toBeNull();
  });

  it('calculates volume in cubic inches', () => {
    const result = calculateBoardFeet(baseInput);
    // 1 × 6 × 96 = 576 cu in
    expect(result.volumeCuIn).toBe(576);
  });

  it('estimates weight at ~3.5 lbs/bf', () => {
    const result = calculateBoardFeet(baseInput);
    // 4 BF × 3.5 = 14 lbs
    expect(result.estimatedWeightLbs).toBe(14);
  });

  it('passes through non-standard nominal dimensions unchanged', () => {
    const result = calculateBoardFeet({
      thicknessIn: 5,
      widthIn: 7,
      lengthIn: 48,
      useNominal: true,
    });
    // 5 and 7 not in NOMINAL_TO_ACTUAL, so pass through
    expect(result.actualThicknessIn).toBe(5);
    expect(result.actualWidthIn).toBe(7);
  });

  it.each([
    { desc: 'thicknessIn = 0', override: { thicknessIn: 0 } },
    { desc: 'widthIn = -1', override: { widthIn: -1 } },
    { desc: 'lengthIn = -10', override: { lengthIn: -10 } },
    { desc: 'quantity = 0', override: { quantity: 0 } },
    { desc: 'quantity = 2.5', override: { quantity: 2.5 } },
  ])('throws RangeError for $desc', ({ override }) => {
    expect(() => calculateBoardFeet({ ...baseInput, ...override })).toThrow(RangeError);
  });
});

describe('linearFeetToBoardFeet', () => {
  it('converts 8 linear feet of 1×6 to 4 BF', () => {
    // BF = (1 × 6 × 8) / 12 = 4
    expect(linearFeetToBoardFeet(1, 6, 8)).toBe(4);
  });

  it('converts 10 linear feet of 2×4 to 6.667 BF', () => {
    // BF = (2 × 4 × 10) / 12 = 6.667
    expect(linearFeetToBoardFeet(2, 4, 10)).toBeCloseTo(6.667, 2);
  });

  it.each([
    { desc: 'thicknessIn = 0', args: [0, 6, 8] as const },
    { desc: 'widthIn = -1', args: [1, -1, 8] as const },
    { desc: 'linearFeet = -5', args: [1, 6, -5] as const },
  ])('throws RangeError for $desc', ({ args }) => {
    expect(() => linearFeetToBoardFeet(...args)).toThrow(RangeError);
  });
});

describe('NOMINAL_TO_ACTUAL', () => {
  it('has 8 standard nominal sizes', () => {
    expect(Object.keys(NOMINAL_TO_ACTUAL)).toHaveLength(8);
  });

  it('maps 2 nominal to 1.5 actual', () => {
    expect(NOMINAL_TO_ACTUAL['2']).toBe(1.5);
  });

  it('maps 4 nominal to 3.5 actual', () => {
    expect(NOMINAL_TO_ACTUAL['4']).toBe(3.5);
  });
});

describe('SPECIES_COST_PER_BF', () => {
  it('has 10 species defined', () => {
    expect(Object.keys(SPECIES_COST_PER_BF)).toHaveLength(10);
  });

  it('all costs are positive', () => {
    for (const cost of Object.values(SPECIES_COST_PER_BF)) {
      expect(cost).toBeGreaterThan(0);
    }
  });
});
