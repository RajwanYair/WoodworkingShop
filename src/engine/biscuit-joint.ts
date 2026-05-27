/**
 * Biscuit Joinery Calculator — Sprint 208
 *
 * Calculates biscuit size selection, slot depth, and placement positions
 * for edge, butt, and miter joints.
 */

/** Biscuit size standard. */
export type BiscuitSize = '#0' | '#10' | '#20';

/** Joint type for biscuit placement. */
export type BiscuitJointType = 'edge' | 'butt' | 'miter';

/** Input for biscuit joinery calculation. */
export interface BiscuitJointInput {
  /** Joint run length (mm). */
  readonly jointLengthMm: number;
  /** Board thickness (mm). */
  readonly boardThicknessMm: number;
  /** Joint type. */
  readonly jointType: BiscuitJointType;
  /** Optional manual biscuit size override. */
  readonly biscuitSize?: BiscuitSize;
  /** Target center-to-center spacing (mm). */
  readonly spacingMm?: number;
  /** Edge margin from both ends (mm). */
  readonly edgeMarginMm?: number;
}

/** Single biscuit center position. */
export interface BiscuitPosition {
  /** 0-based index. */
  readonly index: number;
  /** Center position from one end (mm). */
  readonly centerMm: number;
}

/** Result for biscuit joinery layout. */
export interface BiscuitJointResult {
  /** Selected biscuit size. */
  readonly biscuitSize: BiscuitSize;
  /** Slot depth per side (mm). */
  readonly slotDepthMm: number;
  /** Total biscuit count. */
  readonly count: number;
  /** Placement positions along joint length. */
  readonly positions: readonly BiscuitPosition[];
  /** Final spacing used (mm). */
  readonly actualSpacingMm: number;
}

/** Nominal biscuit dimensions (length x width x thickness, mm). */
const BISCUIT_DIMENSIONS: Record<BiscuitSize, { readonly length: number; readonly width: number }> = {
  '#0': { length: 47, width: 15 },
  '#10': { length: 53, width: 19 },
  '#20': { length: 56, width: 23 },
} as const;

/**
 * Recommend biscuit size from board thickness.
 *
 * @param boardThicknessMm - Board thickness in mm
 * @returns Recommended biscuit size
 * @throws RangeError for invalid thickness
 */
export function recommendBiscuitSize(boardThicknessMm: number): BiscuitSize {
  if (boardThicknessMm <= 0) {
    throw new RangeError(`recommendBiscuitSize: boardThicknessMm must be > 0, got ${boardThicknessMm}`);
  }

  if (boardThicknessMm < 15) return '#0';
  if (boardThicknessMm < 22) return '#10';
  return '#20';
}

/**
 * Calculate biscuit layout for a joint.
 *
 * @param input - Joint dimensions and spacing preferences
 * @returns Biscuit size, slot depth, count, and center positions
 * @throws RangeError for invalid dimensions
 */
export function calculateBiscuitLayout(input: BiscuitJointInput): BiscuitJointResult {
  const { jointLengthMm, boardThicknessMm, jointType, spacingMm = 120, edgeMarginMm = 40 } = input;

  if (jointLengthMm <= 0) {
    throw new RangeError(`calculateBiscuitLayout: jointLengthMm must be > 0, got ${jointLengthMm}`);
  }
  if (boardThicknessMm <= 0) {
    throw new RangeError(`calculateBiscuitLayout: boardThicknessMm must be > 0, got ${boardThicknessMm}`);
  }
  if (spacingMm <= 0) {
    throw new RangeError(`calculateBiscuitLayout: spacingMm must be > 0, got ${spacingMm}`);
  }
  if (edgeMarginMm < 0) {
    throw new RangeError(`calculateBiscuitLayout: edgeMarginMm must be >= 0, got ${edgeMarginMm}`);
  }

  const selected = input.biscuitSize ?? recommendBiscuitSize(boardThicknessMm);
  const dim = BISCUIT_DIMENSIONS[selected];

  if (jointLengthMm <= edgeMarginMm * 2) {
    throw new RangeError('calculateBiscuitLayout: usable length is <= 0 after edge margins');
  }

  // Slot depth per side: half biscuit length + safety clearance, capped by thickness limit.
  const depthByBiscuit = dim.length / 2 + 1;
  const thicknessLimit = boardThicknessMm * (jointType === 'miter' ? 0.45 : 0.6);
  const slotDepthMm = round2(Math.min(depthByBiscuit, thicknessLimit));

  if (slotDepthMm <= 0) {
    throw new RangeError('calculateBiscuitLayout: computed slotDepthMm is <= 0');
  }

  const usableLength = jointLengthMm - edgeMarginMm * 2;
  const count = Math.max(2, Math.floor(usableLength / spacingMm) + 1);
  const actualSpacingMm = round2(usableLength / (count - 1));

  const positions: BiscuitPosition[] = [];
  for (let i = 0; i < count; i++) {
    positions.push({
      index: i,
      centerMm: round2(edgeMarginMm + i * actualSpacingMm),
    });
  }

  return {
    biscuitSize: selected,
    slotDepthMm,
    count,
    positions,
    actualSpacingMm,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
