import { describe, it, expect } from 'vitest';
import { calculateDadoRabbet } from '../../src/engine/dado-rabbet';
import type { DadoRabbetJointType } from '../../src/engine/dado-rabbet';
import WOOD_MAGAZINE_GROOVE_DEPTH_ORACLE from '../fixtures/oracles/wood-magazine-groove-depth.json';

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

  it('keeps the rounded cut depth within WOOD Magazine maximum', () => {
    const { sourceValues, derivedValues } = WOOD_MAGAZINE_GROOVE_DEPTH_ORACLE;
    const result = calculateDadoRabbet({
      jointType: 'dado',
      matingThicknessMm: 12,
      boardThicknessMm: sourceValues.stockThicknessMm,
    });

    expect(result.cutDepthMm).toBe(derivedValues.cutDepthMm);
    expect(result.cutDepthMm).toBeLessThanOrEqual(derivedValues.maximumDepthMm);
    expect(result.remainingThicknessMm).toBe(derivedValues.remainingThicknessMm);
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

  it.each([
    { matingThicknessMm: 6, expectedRecommendation: '6 mm straight router bit or dado blade set', expectedPasses: 1 },
    { matingThicknessMm: 9, expectedRecommendation: '9.5 mm straight router bit or dado blade set', expectedPasses: 1 },
    {
      matingThicknessMm: 12.2,
      expectedRecommendation: '12.7 mm straight router bit or dado blade set',
      expectedPasses: 1,
    },
    {
      matingThicknessMm: 12.21,
      expectedRecommendation: 'Dado blade set (table saw) — multiple passes',
      expectedPasses: 2,
    },
  ])(
    'selects a bit recommendation and pass count for a $matingThicknessMm mm panel',
    ({ matingThicknessMm, expectedRecommendation, expectedPasses }) => {
      const result = calculateDadoRabbet({ jointType: 'dado', matingThicknessMm, boardThicknessMm: 30 });

      expect(result.bitsRecommendation).toBe(expectedRecommendation);
      expect(result.passCount).toBe(expectedPasses);
    },
  );

  it.each([
    { boardThicknessMm: 19, expectedDepthMm: 6.3, expectedRemainingMm: 12.7 },
    { boardThicknessMm: 25, expectedDepthMm: 8.3, expectedRemainingMm: 16.7 },
  ])(
    'rounds cut depth and remaining thickness for a $boardThicknessMm mm board',
    ({ boardThicknessMm, expectedDepthMm, expectedRemainingMm }) => {
      const result = calculateDadoRabbet({ jointType: 'throughDado', matingThicknessMm: 12, boardThicknessMm });

      expect(result.cutDepthMm).toBe(expectedDepthMm);
      expect(result.remainingThicknessMm).toBe(expectedRemainingMm);
    },
  );

  it('ignores rabbet offset for dado joints and defaults rabbet offset to zero', () => {
    const dado = calculateDadoRabbet({
      jointType: 'dado',
      matingThicknessMm: 12,
      boardThicknessMm: 19,
      offsetFromEdgeMm: 8,
    });
    const rabbet = calculateDadoRabbet({ jointType: 'rabbet', matingThicknessMm: 12, boardThicknessMm: 19 });

    expect(dado.offsetFromEdgeMm).toBe(0);
    expect(rabbet.offsetFromEdgeMm).toBe(0);
  });

  describe('error guards', () => {
    it.each([
      ['zero mating', { jointType: 'dado' as DadoRabbetJointType, matingThicknessMm: 0, boardThicknessMm: 19 }],
      ['zero board', { jointType: 'dado' as DadoRabbetJointType, matingThicknessMm: 12, boardThicknessMm: 0 }],
      ['mating >= board', { jointType: 'dado' as DadoRabbetJointType, matingThicknessMm: 20, boardThicknessMm: 19 }],
      [
        'NaN mating thickness',
        { jointType: 'dado' as DadoRabbetJointType, matingThicknessMm: Number.NaN, boardThicknessMm: 19 },
      ],
      [
        'infinite board thickness',
        { jointType: 'dado' as DadoRabbetJointType, matingThicknessMm: 12, boardThicknessMm: Number.POSITIVE_INFINITY },
      ],
      [
        'NaN rabbet offset',
        {
          jointType: 'rabbet' as DadoRabbetJointType,
          matingThicknessMm: 12,
          boardThicknessMm: 19,
          offsetFromEdgeMm: Number.NaN,
        },
      ],
      [
        'negative rabbet offset',
        {
          jointType: 'rabbet' as DadoRabbetJointType,
          matingThicknessMm: 12,
          boardThicknessMm: 19,
          offsetFromEdgeMm: -1,
        },
      ],
    ])('throws for %s', (_label, input) => {
      expect(() => calculateDadoRabbet(input)).toThrow(RangeError);
    });
  });
});
