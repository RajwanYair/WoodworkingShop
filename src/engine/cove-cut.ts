/**
 * Sprint 240 — Table-saw cove cut calculator.
 *
 * Computes the fence angle from the blade chord at the requested cove depth,
 * including blade kerf, using the published Woodgears cove-table geometry.
 */

import { assertFiniteNumber } from './invariant';

export interface CoveCutInput {
  /** Desired cove width (mm) */
  copeWidthMm: number;
  /** Desired cove depth (mm) */
  copeDepthMm: number;
  /** Blade diameter (mm). Default 250 mm (10″). */
  bladeDiameterMm?: number;
  /** Blade kerf width (mm). Default 2.5 mm. */
  bladeKerfMm?: number;
  /** Maximum depth removed per pass (mm). Default 1.5 mm. */
  maxPassDepthMm?: number;
}

export interface CoveCutResult {
  /** Auxiliary-fence angle relative to the blade/miter slot (degrees) */
  fenceAngleDeg: number;
  /** Number of passes required */
  passCount: number;
  /** Actual depth removed per pass (mm) */
  depthPerPassMm: number;
  /** Final blade height above table (equal to copeDepthMm) */
  bladeHeightMm: number;
}

/**
 * Calculate table-saw cove fence angle and evenly distributed cut passes.
 * @param input Cove width/depth, blade diameter/kerf, and maximum pass depth in millimetres.
 * @returns Fence angle in degrees, pass schedule, and final blade height in millimetres.
 * @throws {RangeError} When dimensions are non-finite/out of range or calculations overflow.
 */
export function calculateCoveCut(input: CoveCutInput): CoveCutResult {
  const { copeWidthMm, copeDepthMm, bladeDiameterMm = 250, bladeKerfMm = 2.5, maxPassDepthMm = 1.5 } = input;

  const fn = 'calculateCoveCut';
  assertFiniteNumber(fn, 'copeWidthMm', copeWidthMm);
  assertFiniteNumber(fn, 'copeDepthMm', copeDepthMm);
  assertFiniteNumber(fn, 'bladeDiameterMm', bladeDiameterMm);
  assertFiniteNumber(fn, 'bladeKerfMm', bladeKerfMm);
  assertFiniteNumber(fn, 'maxPassDepthMm', maxPassDepthMm);

  if (copeWidthMm <= 0) {
    throw new RangeError('copeWidthMm must be greater than 0');
  }
  if (copeDepthMm <= 0) {
    throw new RangeError('copeDepthMm must be greater than 0');
  }
  if (bladeDiameterMm <= 0) {
    throw new RangeError('bladeDiameterMm must be greater than 0');
  }
  if (bladeKerfMm <= 0) {
    throw new RangeError('bladeKerfMm must be greater than 0');
  }
  if (maxPassDepthMm <= 0) {
    throw new RangeError('maxPassDepthMm must be greater than 0');
  }
  if (copeDepthMm > bladeDiameterMm) {
    throw new RangeError('copeDepthMm must not exceed bladeDiameterMm');
  }

  const bladeRadiusMm = bladeDiameterMm / 2;
  const bladeChordMm = 2 * Math.sqrt(bladeRadiusMm ** 2 - (bladeRadiusMm - copeDepthMm) ** 2);
  if (copeWidthMm < bladeKerfMm || copeWidthMm > bladeChordMm) {
    throw new RangeError('copeWidthMm must be between bladeKerfMm and the blade chord at copeDepthMm');
  }

  const fenceAngleRad =
    Math.asin(copeWidthMm / Math.hypot(bladeKerfMm, bladeChordMm)) - Math.atan(bladeKerfMm / bladeChordMm);
  const fenceAngleDeg = Math.round(((fenceAngleRad * 180) / Math.PI) * 10) / 10;

  const passCount = Math.ceil(copeDepthMm / maxPassDepthMm);
  const roundedDepthPerPassMm = Math.round((copeDepthMm / passCount) * 100) / 100;
  const depthPerPassMm = Math.min(roundedDepthPerPassMm, maxPassDepthMm);
  assertFiniteNumber(fn, 'fenceAngleDeg', fenceAngleDeg);
  assertFiniteNumber(fn, 'passCount', passCount);
  assertFiniteNumber(fn, 'depthPerPassMm', depthPerPassMm);
  assertFiniteNumber(fn, 'bladeHeightMm', copeDepthMm);

  return {
    fenceAngleDeg,
    passCount,
    depthPerPassMm,
    bladeHeightMm: copeDepthMm,
  };
}
