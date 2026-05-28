import { describe, it, expect } from 'vitest';
import { calculateDadoRabbet } from '../../src/engine/dado-rabbet';
import type { DadoRabbetJointType } from '../../src/engine/dado-rabbet';

describe('calculateDadoRabbet', () => {
  describe('cut width = mating thickness + 0.5 mm clearance', () => {
    it.each([
      ['12mm panel → 12.5mm cut', 12, 19, 12.5],
      ['18mm panel → 18.5mm cut', 18, 25, 18.5],
      ['6mm panel → 6.5mm cut', 6, 19, 6.5],
    ])('%s', (_label, mating, board, expectedWidth) => {
      const result = calculateDadoRabbet({
        jointType: 'dado',
        matingThicknessMm: mating,
        boardThicknessMm: board,
      });
      expect(result.cutWidthMm).toBeCloseTo(expectedWidth, 1);
    });
  });

  it('cut depth is 1/3 of board thickness', () => {
    const result = calculateDadoRabbet({
      jointType: 'dado',
      matingThicknessMm: 12,
      boardThicknessMm: 19,
    });
    expect(result.cutDepthMm).toBeCloseTo(19 / 3, 0);
  });

  it('remaining thickness = boardThickness - cutDepth', () => {
    const result = calculateDadoRabbet({
      jointType: 'throughDado',
      matingThicknessMm: 18,
      boardThicknessMm: 25,
    });
    expect(result.remainingThicknessMm).toBeCloseTo(25 - result.cutDepthMm, 1);
  });

  it('rabbet returns offset from edge', () => {
    const result = calculateDadoRabbet({
      jointType: 'rabbet',
      matingThicknessMm: 12,
      boardThicknessMm: 19,
      offsetFromEdgeMm: 5,
    });
    expect(result.offsetFromEdgeMm).toBe(5);
  });

  it('dado zero-fills offsetFromEdge', () => {
    const result = calculateDadoRabbet({
      jointType: 'dado',
      matingThicknessMm: 12,
      boardThicknessMm: 19,
    });
    expect(result.offsetFromEdgeMm).toBe(0);
  });

  it('passCount is 1 for cuts ≤ 12.7 mm', () => {
    const result = calculateDadoRabbet({
      jointType: 'dado',
      matingThicknessMm: 12,
      boardThicknessMm: 25,
    });
    expect(result.passCount).toBe(1);
  });

  it('passCount increases for wider cuts', () => {
    const result = calculateDadoRabbet({
      jointType: 'dado',
      matingThicknessMm: 25,
      boardThicknessMm: 38,
    });
    expect(result.passCount).toBeGreaterThan(1);
  });

  describe('error guards', () => {
    it.each([
      ['zero mating', { jointType: 'dado' as DadoRabbetJointType, matingThicknessMm: 0, boardThicknessMm: 19 }],
      ['zero board', { jointType: 'dado' as DadoRabbetJointType, matingThicknessMm: 12, boardThicknessMm: 0 }],
      ['mating >= board', { jointType: 'dado' as DadoRabbetJointType, matingThicknessMm: 20, boardThicknessMm: 19 }],
    ])('throws for %s', (_label, input) => {
      expect(() => calculateDadoRabbet(input)).toThrow(RangeError);
    });
  });
});
