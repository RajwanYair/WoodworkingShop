import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateCoveCut } from '../../src/engine/cove-cut';
import WOODGEARS_COVE_CUT_ORACLE from '../fixtures/oracles/woodgears-cove-cut.json';
import { propertyRunOptions } from '../property-seeds';

describe('calculateCoveCut', () => {
  it('computes fence angle using blade chord, cove depth, and blade kerf', () => {
    const result = calculateCoveCut({ copeWidthMm: 125, copeDepthMm: 20 });
    const chord = 2 * Math.sqrt(125 ** 2 - (125 - 20) ** 2);
    const angle = Math.asin(125 / Math.hypot(2.5, chord)) - Math.atan(2.5 / chord);
    const expected = Math.round(((angle * 180) / Math.PI) * 10) / 10;
    expect(result.fenceAngleDeg).toBe(expected);
    expect(result.fenceAngleDeg).toBeGreaterThan(0);
  });

  it('matches the Woodgears published fence angle', () => {
    const { sourceValues, derivedValues } = WOODGEARS_COVE_CUT_ORACLE;
    const result = calculateCoveCut({
      copeWidthMm: sourceValues.copeWidthMm,
      copeDepthMm: sourceValues.copeDepthMm,
      bladeDiameterMm: sourceValues.bladeDiameterMm,
      bladeKerfMm: sourceValues.bladeKerfMm,
    });

    expect(result.fenceAngleDeg).toBe(derivedValues.fenceAngleDeg);
  });

  it('changes fence angle when cove depth or blade kerf changes', () => {
    const base = calculateCoveCut({ copeWidthMm: 40, copeDepthMm: 20, bladeDiameterMm: 254 });
    const deeper = calculateCoveCut({ copeWidthMm: 40, copeDepthMm: 25, bladeDiameterMm: 254 });
    const widerKerf = calculateCoveCut({ copeWidthMm: 40, copeDepthMm: 20, bladeDiameterMm: 254, bladeKerfMm: 3.2 });

    expect(deeper.fenceAngleDeg).not.toBe(base.fenceAngleDeg);
    expect(widerKerf.fenceAngleDeg).not.toBe(base.fenceAngleDeg);
  });

  it('supports a cove depth beyond the blade center', () => {
    const result = calculateCoveCut({ copeWidthMm: 50, copeDepthMm: 150, bladeDiameterMm: 250 });

    expect(result.fenceAngleDeg).toBeGreaterThan(0);
  });

  it.each([
    { copeDepthMm: 3, maxPassDepthMm: 1.5, passCount: 2 },
    { copeDepthMm: 3.01, maxPassDepthMm: 1.5, passCount: 3 },
  ])('uses sufficient passes for $copeDepthMm mm depth', ({ copeDepthMm, maxPassDepthMm, passCount }) => {
    expect(calculateCoveCut({ copeWidthMm: 20, copeDepthMm, maxPassDepthMm }).passCount).toBe(passCount);
  });

  it('calculates pass count as ceil(depth / maxPassDepth)', () => {
    const result = calculateCoveCut({ copeWidthMm: 80, copeDepthMm: 10, maxPassDepthMm: 3 });
    expect(result.passCount).toBe(4);
  });

  it('distributes depth evenly across passes', () => {
    const result = calculateCoveCut({ copeWidthMm: 80, copeDepthMm: 10, maxPassDepthMm: 3 });
    expect(result.depthPerPassMm).toBe(2.5);
  });

  it('does not round a single-pass depth above its configured maximum', () => {
    const maxPassDepthMm = 1.0050000000000001;
    const result = calculateCoveCut({ copeWidthMm: 10, copeDepthMm: maxPassDepthMm, maxPassDepthMm });

    expect(result.depthPerPassMm).toBe(maxPassDepthMm);
  });

  it('keeps rounded pass depth within the configured maximum', () => {
    fc.assert(
      fc.property(fc.double({ min: 1.005, max: 1.009, noNaN: true, noDefaultInfinity: true }), (maxPassDepthMm) => {
        const result = calculateCoveCut({
          copeWidthMm: 10,
          copeDepthMm: maxPassDepthMm,
          maxPassDepthMm,
        });

        return result.depthPerPassMm <= maxPassDepthMm;
      }),
      {
        ...propertyRunOptions('tests/engine/cove-cut.test.ts', 100),
        path: '0:1:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0',
      },
    );
  });

  it('single pass when depth <= maxPassDepth', () => {
    const result = calculateCoveCut({ copeWidthMm: 10, copeDepthMm: 1.5, maxPassDepthMm: 1.5 });
    expect(result.passCount).toBe(1);
    expect(result.depthPerPassMm).toBe(1.5);
  });

  it('bladeHeightMm equals copeDepthMm', () => {
    const result = calculateCoveCut({ copeWidthMm: 80, copeDepthMm: 15 });
    expect(result.bladeHeightMm).toBe(15);
  });

  it('applies default bladeDiameterMm of 250 and maxPassDepthMm of 1.5', () => {
    const result = calculateCoveCut({ copeWidthMm: 20, copeDepthMm: 3 });
    expect(result.passCount).toBe(2);
  });

  it.each([
    ['copeWidthMm = 0', { copeWidthMm: 0, copeDepthMm: 10 }],
    ['copeDepthMm = 0', { copeWidthMm: 50, copeDepthMm: 0 }],
    ['bladeDiameterMm = 0', { copeWidthMm: 50, copeDepthMm: 10, bladeDiameterMm: 0 }],
    ['bladeKerfMm = 0', { copeWidthMm: 50, copeDepthMm: 10, bladeKerfMm: 0 }],
    ['maxPassDepthMm = 0', { copeWidthMm: 50, copeDepthMm: 10, maxPassDepthMm: 0 }],
    ['copeWidthMm >= bladeDiameterMm', { copeWidthMm: 250, copeDepthMm: 10, bladeDiameterMm: 250 }],
    ['copeWidthMm below blade kerf', { copeWidthMm: 2, copeDepthMm: 10 }],
    ['copeWidthMm exceeds blade chord', { copeWidthMm: 100, copeDepthMm: 10 }],
    ['copeDepthMm exceeds blade diameter', { copeWidthMm: 50, copeDepthMm: 251, bladeDiameterMm: 250 }],
    ['NaN copeWidthMm', { copeWidthMm: Number.NaN, copeDepthMm: 10 }],
    ['infinite copeDepthMm', { copeWidthMm: 50, copeDepthMm: Number.POSITIVE_INFINITY }],
    ['NaN bladeDiameterMm', { copeWidthMm: 50, copeDepthMm: 10, bladeDiameterMm: Number.NaN }],
    ['NaN bladeKerfMm', { copeWidthMm: 50, copeDepthMm: 10, bladeKerfMm: Number.NaN }],
    ['infinite maxPassDepthMm', { copeWidthMm: 50, copeDepthMm: 10, maxPassDepthMm: Number.POSITIVE_INFINITY }],
    ['overflowing pass count', { copeWidthMm: 50, copeDepthMm: 10, maxPassDepthMm: Number.MIN_VALUE }],
  ])('throws RangeError for invalid input: %s', (_label, input) => {
    expect(() => calculateCoveCut(input as Parameters<typeof calculateCoveCut>[0])).toThrow(RangeError);
  });
});
