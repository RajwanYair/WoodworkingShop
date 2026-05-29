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

export function calculatePlanerPasses(input: PlanerPassesInput): PlanerPassesResult {
  const { initialThicknessMm, targetThicknessMm, maxPassDepthMm = 1.5, boardLengthMm, snipeLengthMm = 50 } = input;

  if (initialThicknessMm <= 0) throw new RangeError('initialThicknessMm must be positive');
  if (targetThicknessMm <= 0) throw new RangeError('targetThicknessMm must be positive');
  if (targetThicknessMm >= initialThicknessMm)
    throw new RangeError('targetThicknessMm must be less than initialThicknessMm');
  if (maxPassDepthMm <= 0) throw new RangeError('maxPassDepthMm must be positive');
  if (boardLengthMm <= 0) throw new RangeError('boardLengthMm must be positive');
  if (snipeLengthMm < 0) throw new RangeError('snipeLengthMm must be non-negative');

  const totalRemovalMm = Math.round((initialThicknessMm - targetThicknessMm) * 100) / 100;
  const passCount = Math.ceil(totalRemovalMm / maxPassDepthMm);
  const depthPerPassMm = Math.round((totalRemovalMm / passCount) * 100) / 100;
  const snipeAllowanceMm = snipeLengthMm * 2;
  const effectiveLengthMm = Math.max(0, boardLengthMm - snipeAllowanceMm);

  return {
    passCount,
    depthPerPassMm,
    totalRemovalMm,
    effectiveLengthMm,
    snipeAllowanceMm,
  };
}
