/**
 * Lumber Planer Pass Calculator — Sprint 235
 *
 * Calculates the number of planer passes required to reduce a board from
 * its initial thickness to a target thickness, distributing material
 * removal evenly across passes.
 *
 * Snipe allowance: planers lift the board slightly at both ends, leaving
 * a thinner "snipe" zone. The effective usable board length is reduced by
 * the snipe allowance at each end (2× snipeLengthMm total).
 *
 *   passCount      = ceil(totalRemovalMm / maxPassDepthMm)
 *   depthPerPass   = totalRemovalMm / passCount   (rounded to 2 dp)
 *   effectiveLength = boardLengthMm - 2 × snipeLengthMm
 */

import { assertFiniteNumber } from './invariant';

export interface PlanerPassesInput {
  /** Current board thickness in mm */
  initialThicknessMm: number;
  /** Target (finished) thickness in mm */
  targetThicknessMm: number;
  /** Maximum single-pass cut depth in mm — default 1.5 */
  maxPassDepthMm?: number;
  /** Board length in mm */
  boardLengthMm: number;
  /** Snipe zone length at each end in mm — default 50 */
  snipeLengthMm?: number;
}

export interface PlanerPassesResult {
  /** Number of planer passes required */
  passCount: number;
  /** Material removed per pass (evenly distributed) in mm */
  depthPerPassMm: number;
  /** Total material removed in mm */
  totalRemovalMm: number;
  /** Usable board length after trimming snipe at both ends in mm */
  effectiveLengthMm: number;
  /** Total snipe allowance to trim (both ends) in mm */
  snipeAllowanceMm: number;
}

/**
 * Calculate evenly distributed planer passes and usable length after trimming snipe.
 * @param input Board thicknesses, length, pass depth, and snipe allowance in millimetres.
 * @returns Pass count, removal depths, and usable-length measurements in millimetres.
 * @throws {RangeError} When dimensions are non-finite/out of range or calculations overflow.
 */
export function calculatePlanerPasses(input: PlanerPassesInput): PlanerPassesResult {
  const { initialThicknessMm, targetThicknessMm, maxPassDepthMm = 1.5, boardLengthMm, snipeLengthMm = 50 } = input;

  const fn = 'calculatePlanerPasses';
  assertFiniteNumber(fn, 'initialThicknessMm', initialThicknessMm);
  assertFiniteNumber(fn, 'targetThicknessMm', targetThicknessMm);
  assertFiniteNumber(fn, 'maxPassDepthMm', maxPassDepthMm);
  assertFiniteNumber(fn, 'boardLengthMm', boardLengthMm);
  assertFiniteNumber(fn, 'snipeLengthMm', snipeLengthMm);

  if (initialThicknessMm <= 0) throw new RangeError('initialThicknessMm must be positive');
  if (targetThicknessMm <= 0) throw new RangeError('targetThicknessMm must be positive');
  if (targetThicknessMm >= initialThicknessMm)
    throw new RangeError('targetThicknessMm must be less than initialThicknessMm');
  if (maxPassDepthMm <= 0) throw new RangeError('maxPassDepthMm must be positive');
  if (boardLengthMm <= 0) throw new RangeError('boardLengthMm must be positive');
  if (snipeLengthMm < 0) throw new RangeError('snipeLengthMm must be non-negative');

  const totalRemovalMm = Math.round((initialThicknessMm - targetThicknessMm) * 100) / 100;
  const passCount = Math.ceil(totalRemovalMm / maxPassDepthMm);
  const depthPerPassMm = Math.min(Math.round((totalRemovalMm / passCount) * 100) / 100, maxPassDepthMm);
  const snipeAllowanceMm = snipeLengthMm * 2;
  const effectiveLengthMm = Math.max(0, boardLengthMm - snipeAllowanceMm);
  assertFiniteNumber(fn, 'passCount', passCount);
  assertFiniteNumber(fn, 'depthPerPassMm', depthPerPassMm);
  assertFiniteNumber(fn, 'totalRemovalMm', totalRemovalMm);
  assertFiniteNumber(fn, 'snipeAllowanceMm', snipeAllowanceMm);
  assertFiniteNumber(fn, 'effectiveLengthMm', effectiveLengthMm);

  return {
    passCount,
    depthPerPassMm,
    totalRemovalMm,
    effectiveLengthMm,
    snipeAllowanceMm,
  };
}
