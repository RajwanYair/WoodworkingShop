import { assertFiniteNumber } from './invariant';

export interface HoningGuideInput {
  bevelAngleDeg: number;
  guideHeightMm: number;
  microbevelDeg?: number;
}

export interface HoningGuideResult {
  projectionMm: number;
  microbevelProjectionMm: number | null;
  actualBevelAngleDeg: number;
}

/**
 * Calculate honing-guide projection for a bevel and optional microbevel.
 * @param input Bevel angle in degrees, guide height in millimetres, and optional microbevel angle.
 * @returns Projection distances in millimetres and the requested bevel angle.
 * @throws {RangeError} When inputs are non-finite/out of range or calculated projections overflow.
 */
export function calculateHoningGuide(input: HoningGuideInput): HoningGuideResult {
  const { bevelAngleDeg, guideHeightMm, microbevelDeg = 0 } = input;

  const fn = 'calculateHoningGuide';
  assertFiniteNumber(fn, 'bevelAngleDeg', bevelAngleDeg);
  assertFiniteNumber(fn, 'guideHeightMm', guideHeightMm);
  assertFiniteNumber(fn, 'microbevelDeg', microbevelDeg);

  if (bevelAngleDeg <= 0 || bevelAngleDeg >= 90) {
    throw new RangeError('bevelAngleDeg must be between 0° and 90° (exclusive)');
  }
  if (guideHeightMm <= 0) {
    throw new RangeError('guideHeightMm must be greater than 0');
  }
  if (microbevelDeg < 0) {
    throw new RangeError('microbevelDeg must be 0 or greater');
  }
  if (microbevelDeg >= 45) {
    throw new RangeError('microbevelDeg must be less than 45°');
  }
  if (microbevelDeg >= 90 - bevelAngleDeg) {
    throw new RangeError('microbevelDeg must be less than (90° − bevelAngleDeg)');
  }

  const bevelRad = (bevelAngleDeg * Math.PI) / 180;
  const projectionMm = Math.round((guideHeightMm / Math.tan(bevelRad)) * 10) / 10;
  assertFiniteNumber(fn, 'projectionMm', projectionMm);

  let microbevelProjectionMm: number | null = null;
  if (microbevelDeg > 0) {
    const microbevelRad = ((bevelAngleDeg + microbevelDeg) * Math.PI) / 180;
    microbevelProjectionMm = Math.round((guideHeightMm / Math.tan(microbevelRad)) * 10) / 10;
    assertFiniteNumber(fn, 'microbevelProjectionMm', microbevelProjectionMm);
  }

  return {
    projectionMm,
    microbevelProjectionMm,
    actualBevelAngleDeg: bevelAngleDeg,
  };
}
