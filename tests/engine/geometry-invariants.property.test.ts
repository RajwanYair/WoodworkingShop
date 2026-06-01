import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import { calculateCompoundMiter, calculatePolygonMiter } from '../../src/engine/miter-angle';
import { calculateRafterLength } from '../../src/engine/rafter-length';

const NUM_RUNS = 200;
const ANGLE_TOLERANCE = 0.05;
const LENGTH_TOLERANCE = 0.05;

describe('geometry property invariants', () => {
  it('polygon miter keeps regular-polygon angle identities', () => {
    fc.assert(
      fc.property(fc.integer({ min: 3, max: 36 }), (sides) => {
        const result = calculatePolygonMiter({ sides });

        const miterIdentity = Math.abs(result.miterAngle * sides - 180) < ANGLE_TOLERANCE;
        const interiorIdentity = Math.abs(result.interiorAngle * sides - result.angleSum) < ANGLE_TOLERANCE;

        return miterIdentity && interiorIdentity;
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('compound miter returns bounded finite angles for valid inputs', () => {
    const tiltArb = fc.float({ min: 0, max: 89.9, noNaN: true, noDefaultInfinity: true });
    const cornerArb = fc.float({ min: 0.1, max: 179.9, noNaN: true, noDefaultInfinity: true });

    fc.assert(
      fc.property(tiltArb, cornerArb, (tiltDeg, cornerDeg) => {
        const result = calculateCompoundMiter({ tiltDeg, cornerDeg });

        return (
          Number.isFinite(result.miterAngle) &&
          Number.isFinite(result.bevelAngle) &&
          Math.abs(result.miterAngle) <= 90 &&
          result.bevelAngle >= 0 &&
          result.bevelAngle <= 90
        );
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('rafter calculator preserves run/rise/angle consistency', () => {
    const spanArb = fc.float({ min: 500, max: 15000, noNaN: true, noDefaultInfinity: true });
    const pitchArb = fc.float({ min: 0.1, max: 2.5, noNaN: true, noDefaultInfinity: true });
    const plateArb = fc.float({ min: 38, max: 140, noNaN: true, noDefaultInfinity: true });
    const overhangArb = fc.float({ min: 0, max: 1200, noNaN: true, noDefaultInfinity: true });

    fc.assert(
      fc.property(spanArb, pitchArb, plateArb, overhangArb, fc.boolean(), (span, pitch, plate, overhang, shedRoof) => {
        const result = calculateRafterLength({
          totalSpanMm: span,
          pitchRatio: pitch,
          plateWidthMm: plate,
          overhangMm: overhang,
          shedRoof,
        });

        const expectedRun = shedRoof ? span : span / 2;
        const expectedRise = expectedRun * pitch;

        return (
          Math.abs(result.runMm - expectedRun) < LENGTH_TOLERANCE &&
          Math.abs(result.riseMm - expectedRise) < LENGTH_TOLERANCE &&
          result.totalLengthMm >= result.rafterLengthMm &&
          Math.abs(result.plumbCutAngleDeg + result.seatCutAngleDeg - 90) < ANGLE_TOLERANCE
        );
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it.each([
    { totalSpanMm: 0, pitchRatio: 0.5, plateWidthMm: 89, overhangMm: 0 },
    { totalSpanMm: 4000, pitchRatio: 0, plateWidthMm: 89, overhangMm: 0 },
    { totalSpanMm: 4000, pitchRatio: 0.5, plateWidthMm: 0, overhangMm: 0 },
    { totalSpanMm: 4000, pitchRatio: 0.5, plateWidthMm: 89, overhangMm: -1 },
  ])('rafter calculator throws RangeError for invalid bounds: %#', (input) => {
    expect(() => calculateRafterLength(input)).toThrow(RangeError);
  });
});
