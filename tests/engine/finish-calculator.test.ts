import { describe, expect, it } from 'vitest';
import {
  calculateFinish,
  computeFinishAreaM2,
  FINISH_SPECS,
  type FinishType,
} from '../../src/engine/finish-calculator';

describe('calculateFinish', () => {
  it.each([
    {
      desc: 'returns no cans for zero surface area',
      areaM2: 0,
      finish: 'paint' as const,
      coats: 2,
      expectedLitres: 0,
      expectedCans: [],
    },
    {
      desc: 'selects two one-litre cans for a nominal paint estimate',
      areaM2: 12,
      finish: 'paint' as const,
      coats: 2,
      expectedLitres: 2,
      expectedCans: [{ size: 1, count: 2 }],
    },
    {
      desc: 'selects a 2.5-litre and a 0.5-litre can for varnish',
      areaM2: 6,
      finish: 'varnish' as const,
      coats: 3,
      expectedLitres: 3,
      expectedCans: [
        { size: 2.5, count: 1 },
        { size: 0.5, count: 1 },
      ],
    },
    {
      desc: 'scales a large estimate to forty five-litre cans',
      areaM2: 1200,
      finish: 'paint' as const,
      coats: 2,
      expectedLitres: 200,
      expectedCans: [{ size: 5, count: 40 }],
    },
  ])('$desc', ({ areaM2, finish, coats, expectedLitres, expectedCans }) => {
    const estimate = calculateFinish(areaM2, finish, coats);

    expect(estimate.litresNeeded).toBe(expectedLitres);
    expect(estimate.canSizes).toEqual(expectedCans);
    expect(estimate.totalCanLitres).toBe(expectedLitres);
    expect(estimate.finishType).toBe(finish);
    expect(estimate.totalAreaM2).toBe(areaM2);
    expect(estimate.coats).toBe(coats);
  });

  it.each([
    ['primer', 8, 1],
    ['stain', 10, 2],
    ['paint', 12, 2],
    ['varnish', 6, 3],
    ['oil', 12, 2],
    ['lacquer', 10, 2],
  ] as const satisfies readonly (readonly [FinishType, number, number])[])(
    'uses the documented coverage and default coats for %s',
    (finish, coverageM2PerLitre, defaultCoats) => {
      const estimate = calculateFinish(coverageM2PerLitre, finish);

      expect(estimate.litresNeeded).toBe(defaultCoats);
      expect(estimate.coats).toBe(defaultCoats);
      expect(estimate.canSizes.reduce((total, can) => total + can.size * can.count, 0)).toBeGreaterThanOrEqual(
        estimate.litresNeeded,
      );
      expect(FINISH_SPECS[finish].coverageM2PerLitre).toBe(coverageM2PerLitre);
    },
  );

  it.each([
    ['negative surface area', -1, 'paint', 2],
    ['NaN surface area', Number.NaN, 'paint', 2],
    ['infinite surface area', Number.POSITIVE_INFINITY, 'paint', 2],
    ['zero coats', 1, 'paint', 0],
    ['negative coats', 1, 'paint', -1],
    ['NaN coats', 1, 'paint', Number.NaN],
    ['infinite coats', 1, 'paint', Number.POSITIVE_INFINITY],
  ] as const)('throws RangeError for %s', (_description, areaM2, finish, coats) => {
    expect(() => calculateFinish(areaM2, finish, coats)).toThrow(RangeError);
  });
});

describe('computeFinishAreaM2', () => {
  it('returns zero for an empty part list', () => {
    expect(computeFinishAreaM2([])).toBe(0);
  });

  it('converts both faces and four edges from square millimetres to square metres', () => {
    const area = computeFinishAreaM2([{ length: 1000, width: 500, thickness: 18, qty: 2 }]);

    expect(area).toBe(2.108);
  });
});
