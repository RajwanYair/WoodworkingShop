import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import { calculateStairStringer } from '../../src/engine/stair-stringer';
import { calculateTaperJig } from '../../src/engine/taper-jig';

const NUM_RUNS = 200;
const LENGTH_TOLERANCE_MM = 0.25;
const ANGLE_TOLERANCE_DEG = 0.1;

describe('stair and taper property invariants', () => {
  it('stair-stringer output preserves geometric identities for valid ranges', () => {
    const riseArb = fc.double({ min: 400, max: 4500, noNaN: true, noDefaultInfinity: true });
    const treadArb = fc.double({ min: 180, max: 380, noNaN: true, noDefaultInfinity: true });
    const idealArb = fc.double({ min: 120, max: 220, noNaN: true, noDefaultInfinity: true });

    fc.assert(
      fc.property(riseArb, treadArb, idealArb, (totalRiseMm, treadDepthMm, idealRiserMm) => {
        const result = calculateStairStringer({ totalRiseMm, treadDepthMm, idealRiserMm });

        const runIdentity = Math.abs(result.totalRunMm - result.treadCount * result.treadDepthMm) < LENGTH_TOLERANCE_MM;
        const angleIdentity = Math.abs(
          result.stringerAngleDeg - (Math.atan(totalRiseMm / result.totalRunMm) * 180) / Math.PI,
        );
        const landingIdentity = result.treadCount === result.riserCount - 1;

        return (
          result.riserCount >= 3 &&
          result.riserCount <= 20 &&
          runIdentity &&
          angleIdentity < ANGLE_TOLERANCE_DEG &&
          landingIdentity
        );
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('taper-jig output preserves offset and angle relationships for valid ranges', () => {
    const lengthArb = fc.double({ min: 200, max: 2000, noNaN: true, noDefaultInfinity: true });

    fc.assert(
      fc.property(
        lengthArb,
        fc.boolean(),
        fc.integer({ min: 15, max: 120 }),
        fc.integer({ min: 1, max: 60 }),
        (length, twoFace, endBase, delta) => {
          const startWidthMm = endBase + delta;
          const endWidthMm = endBase;
          const taperedFaces = twoFace ? 2 : (1 as const);

          const result = calculateTaperJig({
            workpieceLengthMm: length,
            startWidthMm,
            endWidthMm,
            taperedFaces,
          });

          const totalRemoval = startWidthMm - endWidthMm;
          const expectedPerFace = taperedFaces === 2 ? totalRemoval / 2 : totalRemoval;
          const expectedAngle = (Math.atan(expectedPerFace / length) * 180) / Math.PI;

          return (
            Math.abs(result.materialRemovedPerFaceMm - expectedPerFace) < LENGTH_TOLERANCE_MM &&
            Math.abs(result.jigOffsetMm - expectedPerFace) < LENGTH_TOLERANCE_MM &&
            Math.abs(result.taperAngleDeg - expectedAngle) < ANGLE_TOLERANCE_DEG
          );
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it.each([
    { totalRiseMm: 0, treadDepthMm: 280 },
    { totalRiseMm: 2500, treadDepthMm: 0 },
    { totalRiseMm: -1, treadDepthMm: 280 },
  ])('stair-stringer throws RangeError for invalid bounds: %#', (input) => {
    expect(() => calculateStairStringer(input)).toThrow(RangeError);
  });

  it.each([
    { workpieceLengthMm: 0, startWidthMm: 70, endWidthMm: 40 },
    { workpieceLengthMm: 700, startWidthMm: 40, endWidthMm: 40 },
    { workpieceLengthMm: 700, startWidthMm: 40, endWidthMm: 50 },
  ])('taper-jig throws RangeError for invalid bounds: %#', (input) => {
    expect(() => calculateTaperJig(input)).toThrow(RangeError);
  });
});
