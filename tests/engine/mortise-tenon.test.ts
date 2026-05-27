import { describe, it, expect } from 'vitest';
import { calculateMortiseTenon, findNearestChisel } from '../../src/engine/mortise-tenon';
import type { MortiseTenonInput } from '../../src/engine/mortise-tenon';

describe('calculateMortiseTenon', () => {
  it('calculates blind tenon with default 1/3 ratio', () => {
    const input: MortiseTenonInput = {
      stockThicknessMm: 30,
      stockWidthMm: 75,
      jointType: 'blind',
    };
    const r = calculateMortiseTenon(input);
    expect(r.tenonThicknessMm).toBe(10);
    expect(r.tenonWidthMm).toBe(69); // 75 - 2×3
    expect(r.tenonLengthMm).toBe(45); // 75 × 0.6
    expect(r.mortiseWidthMm).toBe(10);
    expect(r.mortiseHeightMm).toBe(69);
    expect(r.mortiseDepthMm).toBe(45);
    expect(r.mortiseOffsetMm).toBe(10);
    expect(r.jointType).toBe('blind');
    expect(r.hasHaunch).toBe(false);
    expect(r.haunchDepthMm).toBe(0);
    expect(r.recommendedChiselMm).toBe(10);
    expect(r.glueSurfaceAreaMm2).toBeGreaterThan(0);
  });

  it('calculates through tenon (length = stock thickness)', () => {
    const input: MortiseTenonInput = {
      stockThicknessMm: 25,
      stockWidthMm: 100,
      jointType: 'through',
    };
    const r = calculateMortiseTenon(input);
    expect(r.tenonLengthMm).toBe(25); // through = stock thickness
    expect(r.tenonThicknessMm).toBeCloseTo(8.3, 1);
    expect(r.tenonWidthMm).toBe(94); // 100 - 2×3
  });

  it('calculates stub tenon (short depth)', () => {
    const input: MortiseTenonInput = {
      stockThicknessMm: 20,
      stockWidthMm: 50,
      jointType: 'stub',
    };
    const r = calculateMortiseTenon(input);
    expect(r.tenonLengthMm).toBe(16.5); // 50 × 0.33
  });

  it('calculates wedged tenon', () => {
    const input: MortiseTenonInput = {
      stockThicknessMm: 30,
      stockWidthMm: 80,
      jointType: 'wedged',
    };
    const r = calculateMortiseTenon(input);
    // wedged defaults to ratio 1 — same as through: uses stockThicknessMm
    expect(r.tenonLengthMm).toBe(30);
  });

  it('applies custom thickness ratio', () => {
    const input: MortiseTenonInput = {
      stockThicknessMm: 40,
      stockWidthMm: 100,
      jointType: 'blind',
      tenonThicknessRatio: 0.25,
    };
    const r = calculateMortiseTenon(input);
    expect(r.tenonThicknessMm).toBe(10);
    expect(r.mortiseOffsetMm).toBe(15);
  });

  it('applies custom shoulder setback', () => {
    const input: MortiseTenonInput = {
      stockThicknessMm: 30,
      stockWidthMm: 60,
      jointType: 'blind',
      shoulderSetbackMm: 5,
    };
    const r = calculateMortiseTenon(input);
    expect(r.tenonWidthMm).toBe(50); // 60 - 2×5
  });

  it('includes haunch when specified', () => {
    const input: MortiseTenonInput = {
      stockThicknessMm: 30,
      stockWidthMm: 100,
      jointType: 'blind',
      haunchDepthMm: 10,
    };
    const r = calculateMortiseTenon(input);
    expect(r.hasHaunch).toBe(true);
    expect(r.haunchDepthMm).toBe(10);
  });

  it('computes glue surface area correctly', () => {
    const input: MortiseTenonInput = {
      stockThicknessMm: 30,
      stockWidthMm: 90,
      jointType: 'blind',
      shoulderSetbackMm: 0,
      tenonThicknessRatio: 1 / 3,
    };
    const r = calculateMortiseTenon(input);
    // cheeks: 2 × length × width + edges: 2 × length × thickness
    // length = 90×0.6 = 54, width = 90, thickness = 10
    // 2×54×90 + 2×54×10 = 9720 + 1080 = 10800
    expect(r.glueSurfaceAreaMm2).toBe(10800);
  });

  describe('validation', () => {
    it.each([
      ['stockThicknessMm <= 0', { stockThicknessMm: 0, stockWidthMm: 50, jointType: 'blind' as const }],
      ['stockWidthMm <= 0', { stockThicknessMm: 20, stockWidthMm: -1, jointType: 'blind' as const }],
      [
        'tenonThicknessRatio too low',
        { stockThicknessMm: 20, stockWidthMm: 50, jointType: 'blind' as const, tenonThicknessRatio: 0.1 },
      ],
      [
        'tenonThicknessRatio too high',
        { stockThicknessMm: 20, stockWidthMm: 50, jointType: 'blind' as const, tenonThicknessRatio: 0.7 },
      ],
      [
        'shoulderSetbackMm < 0',
        { stockThicknessMm: 20, stockWidthMm: 50, jointType: 'blind' as const, shoulderSetbackMm: -1 },
      ],
      ['haunchDepthMm < 0', { stockThicknessMm: 20, stockWidthMm: 50, jointType: 'blind' as const, haunchDepthMm: -1 }],
      [
        'tenon width <= 0',
        { stockThicknessMm: 20, stockWidthMm: 6, jointType: 'blind' as const, shoulderSetbackMm: 5 },
      ],
    ])('throws RangeError for %s', (_label, input) => {
      expect(() => calculateMortiseTenon(input as MortiseTenonInput)).toThrow(RangeError);
    });
  });
});

describe('findNearestChisel', () => {
  it.each([
    [10, 10],
    [11, 10],
    [12.5, 12],
    [8.3, 8],
    [3, 3],
    [38, 38],
    [50, 38],
    [6.5, 6],
  ])('for target %d returns %d', (target, expected) => {
    expect(findNearestChisel(target)).toBe(expected);
  });

  it('throws for target <= 0', () => {
    expect(() => findNearestChisel(0)).toThrow(RangeError);
  });
});
