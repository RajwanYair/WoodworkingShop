/**
 * Sprint 240 — Table-saw cove cut calculator.
 *
 * When the workpiece is fed at an angle (αfence) to the blade, the blade's
 * circular path traces an elliptical cove. The required fence angle is:
 *
 *   sin(α) = W / D
 *
 * where W = desired cove width and D = blade diameter.
 *
 * @see Hoadley, "Understanding Wood", ch. on machine joinery
 */

export interface CoveCutInput {
  /** Desired cove width (mm) */
  copeWidthMm: number;
  /** Desired cove depth (mm) */
  copeDepthMm: number;
  /** Blade diameter (mm). Default 250 mm (10″). */
  bladeDiameterMm?: number;
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

export function calculateCoveCut(input: CoveCutInput): CoveCutResult {
  const { copeWidthMm, copeDepthMm, bladeDiameterMm = 250, maxPassDepthMm = 1.5 } = input;

  if (copeWidthMm <= 0) {
    throw new RangeError('copeWidthMm must be greater than 0');
  }
  if (copeDepthMm <= 0) {
    throw new RangeError('copeDepthMm must be greater than 0');
  }
  if (bladeDiameterMm <= 0) {
    throw new RangeError('bladeDiameterMm must be greater than 0');
  }
  if (maxPassDepthMm <= 0) {
    throw new RangeError('maxPassDepthMm must be greater than 0');
  }
  if (copeWidthMm >= bladeDiameterMm) {
    throw new RangeError('copeWidthMm must be less than bladeDiameterMm');
  }

  const sinAlpha = copeWidthMm / bladeDiameterMm;
  const fenceAngleDeg = Math.round(((Math.asin(sinAlpha) * 180) / Math.PI) * 10) / 10;

  const passCount = Math.ceil(copeDepthMm / maxPassDepthMm);
  const depthPerPassMm = Math.round((copeDepthMm / passCount) * 100) / 100;

  return {
    fenceAngleDeg,
    passCount,
    depthPerPassMm,
    bladeHeightMm: copeDepthMm,
  };
}
