/**
 * Sprint 242 — Rafter length & birdsmouth calculator.
 *
 * Computes the rafter length, plumb-cut angle, seat-cut angle, and
 * birdsmouth notch depth for a simple gable roof.
 *
 * Definitions
 * -----------
 * Pitch  : rise-per-run ratio (e.g., 6/12 = 0.5). Common notation "6 in 12".
 * Run    : horizontal span from wall plate to ridge centre (mm).
 *          Run = totalSpanMm / 2  when shedRoof = false (symmetric gable).
 *          Run = totalSpanMm      when shedRoof = true  (single-slope).
 * Rise   : vertical height of rafter = run × pitchRatio.
 * Rafter length (common) = √(run² + rise²)
 * Plumb-cut angle = atan(rise/run) — the angle at the ridge peak.
 * Seat-cut angle  = 90° − plumb-cut angle — the level cut at the wall.
 * Birdsmouth depth = min(plateWidthMm / 3, 1/3 × rafter depth).
 *   The "1/3 rule" avoids weakening the rafter beyond IBC limits.
 */

import { assertAtLeast, assertGreaterThan } from './invariant';

export interface RafterLengthInput {
  /** Full building span from outer wall to outer wall (mm) */
  totalSpanMm: number;
  /** Roof pitch expressed as rise-per-run (e.g. 0.5 for 6-in-12) */
  pitchRatio: number;
  /** Wall plate (top plate) width in mm — used for birdsmouth seat cut */
  plateWidthMm: number;
  /** Rafter overhang beyond wall (mm) — adds to rafter length */
  overhangMm?: number;
  /** True for single-slope (shed) roof — full span used as run */
  shedRoof?: boolean;
}

export interface RafterLengthResult {
  /** Horizontal run (mm) */
  runMm: number;
  /** Vertical rise (mm) */
  riseMm: number;
  /** Rafter length from ridge to heel (no overhang) (mm) */
  rafterLengthMm: number;
  /** Total rafter length including overhang (mm) */
  totalLengthMm: number;
  /** Plumb-cut angle at ridge (degrees) */
  plumbCutAngleDeg: number;
  /** Seat-cut angle (level cut at wall) (degrees) */
  seatCutAngleDeg: number;
  /** Birdsmouth notch depth (mm) */
  birdsmouthDepthMm: number;
}

export function calculateRafterLength(input: RafterLengthInput): RafterLengthResult {
  const fn = 'calculateRafterLength';
  const { totalSpanMm, pitchRatio, plateWidthMm, overhangMm = 0, shedRoof = false } = input;

  assertGreaterThan(fn, 'totalSpanMm', totalSpanMm, 0);
  assertGreaterThan(fn, 'pitchRatio', pitchRatio, 0);
  assertGreaterThan(fn, 'plateWidthMm', plateWidthMm, 0);
  assertAtLeast(fn, 'overhangMm', overhangMm, 0);

  const runMm = shedRoof ? totalSpanMm : totalSpanMm / 2;
  const riseMm = Math.round(runMm * pitchRatio * 100) / 100;

  const rafterLengthMm = Math.round(Math.sqrt(runMm ** 2 + riseMm ** 2) * 100) / 100;

  // Overhang adds horizontal run component; the sloped length of the overhang follows the same pitch
  const overhangSlantMm = Math.round(Math.sqrt(overhangMm ** 2 + (overhangMm * pitchRatio) ** 2) * 100) / 100;
  const totalLengthMm = Math.round((rafterLengthMm + overhangSlantMm) * 100) / 100;

  const plumbAngleRad = Math.atan(pitchRatio);
  const plumbCutAngleDeg = Math.round(((plumbAngleRad * 180) / Math.PI) * 100) / 100;
  const seatCutAngleDeg = Math.round((90 - plumbCutAngleDeg) * 100) / 100;

  // Birdsmouth depth capped at 1/3 of plate width (IBC 1/3 rule)
  const birdsmouthDepthMm = Math.round((plateWidthMm / 3) * 100) / 100;

  return {
    runMm,
    riseMm,
    rafterLengthMm,
    totalLengthMm,
    plumbCutAngleDeg,
    seatCutAngleDeg,
    birdsmouthDepthMm,
  };
}
