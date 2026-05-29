import { describe, it, expect } from 'vitest';
import { calculateCoveCut } from '../../src/engine/cove-cut';

describe('calculateCoveCut', () => {
  it('computes fence angle using sin(α) = W/D', () => {
    const result = calculateCoveCut({ copeWidthMm: 125, copeDepthMm: 20 });
    const expected = Math.round(((Math.asin(125 / 250) * 180) / Math.PI) * 10) / 10;
    expect(result.fenceAngleDeg).toBe(expected);
    expect(result.fenceAngleDeg).toBeGreaterThan(0);
  });

  it('returns fence angle of 30° when width is half blade diameter', () => {
    const result = calculateCoveCut({ copeWidthMm: 125, copeDepthMm: 10, bladeDiameterMm: 250 });
    expect(result.fenceAngleDeg).toBe(30);
  });

  it('calculates pass count as ceil(depth / maxPassDepth)', () => {
    const result = calculateCoveCut({ copeWidthMm: 100, copeDepthMm: 10, maxPassDepthMm: 3 });
    expect(result.passCount).toBe(4);
  });

  it('distributes depth evenly across passes', () => {
    const result = calculateCoveCut({ copeWidthMm: 100, copeDepthMm: 10, maxPassDepthMm: 3 });
    expect(result.depthPerPassMm).toBe(2.5);
  });

  it('single pass when depth <= maxPassDepth', () => {
    const result = calculateCoveCut({ copeWidthMm: 50, copeDepthMm: 1.5, maxPassDepthMm: 1.5 });
    expect(result.passCount).toBe(1);
    expect(result.depthPerPassMm).toBe(1.5);
  });

  it('bladeHeightMm equals copeDepthMm', () => {
    const result = calculateCoveCut({ copeWidthMm: 80, copeDepthMm: 15 });
    expect(result.bladeHeightMm).toBe(15);
  });

  it('applies default bladeDiameterMm of 250 and maxPassDepthMm of 1.5', () => {
    const result = calculateCoveCut({ copeWidthMm: 100, copeDepthMm: 3 });
    expect(result.passCount).toBe(2);
  });

  it.each([
    ['copeWidthMm = 0', { copeWidthMm: 0, copeDepthMm: 10 }],
    ['copeDepthMm = 0', { copeWidthMm: 50, copeDepthMm: 0 }],
    ['bladeDiameterMm = 0', { copeWidthMm: 50, copeDepthMm: 10, bladeDiameterMm: 0 }],
    ['maxPassDepthMm = 0', { copeWidthMm: 50, copeDepthMm: 10, maxPassDepthMm: 0 }],
    ['copeWidthMm >= bladeDiameterMm', { copeWidthMm: 250, copeDepthMm: 10, bladeDiameterMm: 250 }],
  ])('throws RangeError for invalid input: %s', (_label, input) => {
    expect(() => calculateCoveCut(input as Parameters<typeof calculateCoveCut>[0])).toThrow(RangeError);
  });
});
