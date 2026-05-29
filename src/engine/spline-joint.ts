/**
 * Sprint 246 — Spline joint calculator.
 *
 * Computes slot and spline sizing plus estimated glue area for a spline joint.
 */

export interface SplineJointInput {
  /** Thickness of each mating board (mm). */
  boardThicknessMm: number;
  /** Thickness of the spline stock (mm). */
  splineThicknessMm: number;
  /** Slot depth cut into each board (mm). */
  slotDepthPerBoardMm: number;
  /** Length of one spline/joint line (mm). */
  jointLengthMm: number;
  /** Number of splines across the joint. */
  splineCount: number;
}

export interface SplineJointResult {
  /** Recommended slot width for practical glue clearance (mm). */
  recommendedSlotWidthMm: number;
  /** Spline insertion depth across both boards (mm). */
  totalInsertionDepthMm: number;
  /** Material left from slot bottom to opposite face (mm). */
  remainingWallThicknessMm: number;
  /** Total spline stock length required (mm). */
  totalSplineLengthMm: number;
  /** Estimated glue surface area per spline (mm^2). */
  glueAreaPerSplineMm2: number;
  /** Estimated total glue surface area for all splines (mm^2). */
  totalGlueAreaMm2: number;
}

/**
 * Calculate sizing and glue metrics for a spline joint.
 * @param input Joint dimensions and spline settings.
 * @returns Derived spline and slot dimensions with glue-area estimates.
 * @throws {RangeError} When any input is outside practical bounds.
 */
export function calculateSplineJoint(input: SplineJointInput): SplineJointResult {
  const { boardThicknessMm, splineThicknessMm, slotDepthPerBoardMm, jointLengthMm, splineCount } = input;

  if (boardThicknessMm <= 0) {
    throw new RangeError(`calculateSplineJoint: boardThicknessMm must be > 0, got ${boardThicknessMm}`);
  }
  if (splineThicknessMm <= 0) {
    throw new RangeError(`calculateSplineJoint: splineThicknessMm must be > 0, got ${splineThicknessMm}`);
  }
  if (slotDepthPerBoardMm <= 0) {
    throw new RangeError(`calculateSplineJoint: slotDepthPerBoardMm must be > 0, got ${slotDepthPerBoardMm}`);
  }
  if (jointLengthMm <= 0) {
    throw new RangeError(`calculateSplineJoint: jointLengthMm must be > 0, got ${jointLengthMm}`);
  }
  if (!Number.isInteger(splineCount) || splineCount <= 0) {
    throw new RangeError(`calculateSplineJoint: splineCount must be a positive integer, got ${splineCount}`);
  }
  if (splineThicknessMm >= boardThicknessMm) {
    throw new RangeError(
      `calculateSplineJoint: splineThicknessMm must be < boardThicknessMm, got ${splineThicknessMm}`,
    );
  }
  if (slotDepthPerBoardMm >= boardThicknessMm) {
    throw new RangeError(
      `calculateSplineJoint: slotDepthPerBoardMm must be < boardThicknessMm, got ${slotDepthPerBoardMm}`,
    );
  }

  const round3 = (value: number) => Math.round(value * 1000) / 1000;

  const glueClearanceMm = 0.1;
  const recommendedSlotWidthMm = round3(splineThicknessMm + glueClearanceMm);
  const totalInsertionDepthMm = round3(slotDepthPerBoardMm * 2);
  const remainingWallThicknessMm = round3(boardThicknessMm - slotDepthPerBoardMm);
  const totalSplineLengthMm = round3(jointLengthMm * splineCount);

  // Two slot walls per board and two boards per spline: 4 wall faces total.
  const glueAreaPerSplineMm2 = round3(4 * slotDepthPerBoardMm * jointLengthMm);
  const totalGlueAreaMm2 = round3(glueAreaPerSplineMm2 * splineCount);

  return {
    recommendedSlotWidthMm,
    totalInsertionDepthMm,
    remainingWallThicknessMm,
    totalSplineLengthMm,
    glueAreaPerSplineMm2,
    totalGlueAreaMm2,
  };
}
