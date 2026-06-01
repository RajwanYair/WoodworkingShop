/**
 * Stair Stringer Calculator — Sprint 231
 *
 * Calculates stair geometry from total rise and run:
 *
 *   riserCount   = round(totalRiseMm / idealRiserMm)   (clamped 3..20)
 *   actualRiser  = totalRiseMm / riserCount
 *   treadCount   = riserCount − 1  (open stringer; last tread is the landing)
 *   totalRun     = treadCount × treadDepthMm
 *   stringerLen  = √(totalRun² + totalRiseMm²)
 *   stringerAngle= atan(totalRiseMm / totalRun) × (180 / π)
 *
 * IRC 2021 guidelines:
 *   riser height : 4″ (101.6 mm) – 7¾″ (196.85 mm)
 *   tread depth  : ≥ 10″ (254 mm)
 *   headroom     : ≥ 80″ (2032 mm) — caller-supplied, validated only
 */

import { assertGreaterThan } from './invariant';

export interface StairStringerInput {
  /** Total vertical rise from floor to upper level in mm */
  totalRiseMm: number;
  /** Horizontal depth of each tread in mm (nosing excluded) */
  treadDepthMm: number;
  /** Ideal riser height to target (mm) — default 175 mm ≈ 6⅞″ */
  idealRiserMm?: number;
  /** Minimum required headroom clearance in mm — default 2032 mm (80″) */
  headroomMm?: number;
}

export interface StairStringerResult {
  /** Number of risers */
  riserCount: number;
  /** Actual riser height in mm */
  actualRiserMm: number;
  /** Number of treads (riserCount − 1) */
  treadCount: number;
  /** Total horizontal run in mm */
  totalRunMm: number;
  /** Stringer length (hypotenuse) in mm */
  stringerLengthMm: number;
  /** Stringer angle from horizontal in degrees */
  stringerAngleDeg: number;
  /** Tread depth as supplied in mm */
  treadDepthMm: number;
  /** Whether the layout passes IRC 2021 riser-height limits */
  passesIrc: boolean;
  /** i18n warning key when IRC limits are exceeded, otherwise null */
  warningKey: 'riserTooShort' | 'riserTooTall' | 'treadTooShallow' | null;
}

const IRC_RISER_MIN_MM = 101.6; // 4″
const IRC_RISER_MAX_MM = 196.85; // 7¾″
const IRC_TREAD_MIN_MM = 254; // 10″

export function calculateStairStringer(input: StairStringerInput): StairStringerResult {
  const fn = 'calculateStairStringer';
  const { totalRiseMm, treadDepthMm, idealRiserMm = 175, headroomMm = 2032 } = input;

  assertGreaterThan(fn, 'totalRiseMm', totalRiseMm, 0);
  assertGreaterThan(fn, 'treadDepthMm', treadDepthMm, 0);
  assertGreaterThan(fn, 'idealRiserMm', idealRiserMm, 0);
  assertGreaterThan(fn, 'headroomMm', headroomMm, 0);

  const riserCount = Math.min(20, Math.max(3, Math.round(totalRiseMm / idealRiserMm)));
  const actualRiserMm = Math.round((totalRiseMm / riserCount) * 10) / 10;
  const treadCount = riserCount - 1;
  const totalRunMm = Math.round(treadCount * treadDepthMm * 10) / 10;
  const stringerLengthMm = Math.round(Math.sqrt(totalRunMm ** 2 + totalRiseMm ** 2) * 10) / 10;
  const stringerAngleDeg = Math.round(Math.atan(totalRiseMm / totalRunMm) * (180 / Math.PI) * 100) / 100;

  let warningKey: StairStringerResult['warningKey'] = null;
  if (actualRiserMm < IRC_RISER_MIN_MM) warningKey = 'riserTooShort';
  else if (actualRiserMm > IRC_RISER_MAX_MM) warningKey = 'riserTooTall';
  else if (treadDepthMm < IRC_TREAD_MIN_MM) warningKey = 'treadTooShallow';

  return {
    riserCount,
    actualRiserMm,
    treadCount,
    totalRunMm,
    stringerLengthMm,
    stringerAngleDeg,
    treadDepthMm,
    passesIrc: warningKey === null,
    warningKey,
  };
}
