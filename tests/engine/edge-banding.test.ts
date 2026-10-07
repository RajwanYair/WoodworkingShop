import { describe, expect, it } from 'vitest';
import { deriveRawStockDimensions } from '../../src/engine/edge-banding';

describe('deriveRawStockDimensions', () => {
  it('preserves dimensions when the process is absent or disabled', () => {
    expect(deriveRawStockDimensions(600, 300, ['width-start'])).toEqual({ length: 600, width: 300 });
    expect(
      deriveRawStockDimensions(600, 300, ['width-start'], {
        enabled: false,
        bandThicknessMm: 1,
        trimAllowanceMm: 0,
      }),
    ).toEqual({ length: 600, width: 300 });
  });

  it.each([
    [['width-start'], { length: 600, width: 299 }],
    [['length-start', 'length-end'], { length: 598, width: 300 }],
    [['width-start', 'width-end'], { length: 600, width: 298 }],
    [['width-start'], { length: 600, width: 300 }],
  ] as const)('applies band thickness and trim allowance per selected edge', (edges, expected) => {
    const trimAllowanceMm = edges.length === 1 && expected.width === 300 ? 1 : 0;
    expect(
      deriveRawStockDimensions(600, 300, edges, {
        enabled: true,
        bandThicknessMm: 1,
        trimAllowanceMm,
      }),
    ).toEqual(expected);
  });

  it.each([
    [0, 300],
    [600, Number.NaN],
  ])('throws RangeError for invalid dimensions %s×%s', (length, width) => {
    expect(() => deriveRawStockDimensions(length, width)).toThrow(RangeError);
  });

  it('throws RangeError when enabled allowances are invalid or exceed a dimension', () => {
    expect(() =>
      deriveRawStockDimensions(600, 300, ['width-start'], {
        enabled: true,
        bandThicknessMm: Number.NaN,
        trimAllowanceMm: 0,
      }),
    ).toThrow(RangeError);
    expect(() =>
      deriveRawStockDimensions(1, 1, ['width-start', 'width-end'], {
        enabled: true,
        bandThicknessMm: 1,
        trimAllowanceMm: 0,
      }),
    ).toThrow(RangeError);
  });
});
