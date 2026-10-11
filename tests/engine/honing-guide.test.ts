import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateHoningGuide } from '../../src/engine/honing-guide';
import HONING_GUIDE_RIGHT_TRIANGLE_ORACLE from '../fixtures/oracles/honing-guide-right-triangle.json';
import { propertyRunOptions } from '../property-seeds';

const NUM_RUNS = 200;

describe('calculateHoningGuide', () => {
  it('calculates projection for 25° bevel at 25 mm guide height', () => {
    const result = calculateHoningGuide({ bevelAngleDeg: 25, guideHeightMm: 25 });
    expect(result.projectionMm).toBe(53.6);
    expect(result.actualBevelAngleDeg).toBe(25);
  });

  it('matches the OpenStax idealized right-triangle projection oracle', () => {
    const { input, expected } = HONING_GUIDE_RIGHT_TRIANGLE_ORACLE;
    const result = calculateHoningGuide(input);

    expect(result.projectionMm).toBe(expected.projectionMm);
    expect(result.actualBevelAngleDeg).toBe(input.bevelAngleDeg);
  });

  it('returns null microbevelProjectionMm when microbevelDeg is 0 (default)', () => {
    const result = calculateHoningGuide({ bevelAngleDeg: 25, guideHeightMm: 25 });
    expect(result.microbevelProjectionMm).toBeNull();
  });

  it('returns null microbevelProjectionMm when microbevelDeg is explicitly 0', () => {
    const result = calculateHoningGuide({ bevelAngleDeg: 25, guideHeightMm: 25, microbevelDeg: 0 });
    expect(result.microbevelProjectionMm).toBeNull();
  });

  it('calculates shorter microbevel projection for a 5° micro-bevel', () => {
    const result = calculateHoningGuide({ bevelAngleDeg: 25, guideHeightMm: 25, microbevelDeg: 5 });
    expect(result.microbevelProjectionMm).not.toBeNull();
    // microbevel (25+5=30°) → shorter projection than 25°
    expect(result.microbevelProjectionMm!).toBeLessThan(result.projectionMm);
  });

  it('microbevel projection formula: guideHeight / tan(bevel + micro)', () => {
    const result = calculateHoningGuide({ bevelAngleDeg: 20, guideHeightMm: 30, microbevelDeg: 5 });
    expect(result.microbevelProjectionMm).toBe(64.3);
  });

  it('echoes actualBevelAngleDeg', () => {
    const result = calculateHoningGuide({ bevelAngleDeg: 38, guideHeightMm: 22 });
    expect(result.actualBevelAngleDeg).toBe(38);
  });

  it.each([
    ['bevelAngleDeg = 0', { bevelAngleDeg: 0, guideHeightMm: 25 }],
    ['bevelAngleDeg = 90', { bevelAngleDeg: 90, guideHeightMm: 25 }],
    ['guideHeightMm = 0', { bevelAngleDeg: 25, guideHeightMm: 0 }],
    ['guideHeightMm negative', { bevelAngleDeg: 25, guideHeightMm: -1 }],
    ['microbevelDeg negative', { bevelAngleDeg: 25, guideHeightMm: 25, microbevelDeg: -1 }],
    ['microbevelDeg = 45', { bevelAngleDeg: 25, guideHeightMm: 25, microbevelDeg: 45 }],
    ['microbevelDeg >= 90 - bevel', { bevelAngleDeg: 25, guideHeightMm: 25, microbevelDeg: 65 }],
  ])('throws RangeError for invalid input: %s', (_label, input) => {
    expect(() => calculateHoningGuide(input as Parameters<typeof calculateHoningGuide>[0])).toThrow(RangeError);
  });

  it.each([
    ['NaN bevelAngleDeg', { bevelAngleDeg: Number.NaN, guideHeightMm: 25 }],
    ['infinite guideHeightMm', { bevelAngleDeg: 25, guideHeightMm: Number.POSITIVE_INFINITY }],
    ['NaN microbevelDeg', { bevelAngleDeg: 25, guideHeightMm: 25, microbevelDeg: Number.NaN }],
    ['overflowing projection', { bevelAngleDeg: 0.000001, guideHeightMm: Number.MAX_VALUE }],
  ])('throws RangeError for non-finite input: %s', (_label, input) => {
    expect(() => calculateHoningGuide(input)).toThrow(RangeError);
  });

  it('preserves projection scaling and angle monotonicity across valid geometry', () => {
    const heightArb = fc.integer({ min: 10, max: 100 });
    const angleArb = fc.integer({ min: 5, max: 80 });

    fc.assert(
      fc.property(heightArb, angleArb, fc.integer({ min: 2, max: 5 }), (height, angle, scale) => {
        const projection = calculateHoningGuide({ bevelAngleDeg: angle, guideHeightMm: height }).projectionMm;
        const scaledProjection = calculateHoningGuide({
          bevelAngleDeg: angle,
          guideHeightMm: height * scale,
        }).projectionMm;
        const steeperProjection = calculateHoningGuide({
          bevelAngleDeg: angle + 1,
          guideHeightMm: height,
        }).projectionMm;

        return Math.abs(scaledProjection - projection * scale) <= 0.3 && steeperProjection <= projection;
      }),
      propertyRunOptions('tests/engine/honing-guide.test.ts', NUM_RUNS),
    );
  });

  it('keeps microbevel projection below the primary bevel across valid geometry', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 60 }),
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 10, max: 100 }),
        (bevelAngleDeg, microbevelDeg, guideHeightMm) => {
          const result = calculateHoningGuide({ bevelAngleDeg, microbevelDeg, guideHeightMm });
          return result.microbevelProjectionMm !== null && result.microbevelProjectionMm < result.projectionMm;
        },
      ),
      propertyRunOptions('tests/engine/honing-guide.test.ts', NUM_RUNS),
    );
  });
});
