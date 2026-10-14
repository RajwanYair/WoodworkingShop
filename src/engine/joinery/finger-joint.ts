/**
 * Finger Joint (Box Joint) Calculator — Sprint 210
 *
 * Computes finger width, count, and layout for box/finger joints given
 * board width and desired finger count or width.
 */

/** Input for finger joint calculation. */
export interface FingerJointInput {
  /** Board width at the joint (mm). */
  readonly boardWidthMm: number;
  /** Desired finger width (mm). If omitted, derived from fingerCount. */
  readonly fingerWidthMm?: number;
  /** Desired number of fingers. If omitted, derived from fingerWidthMm. */
  readonly fingerCount?: number;
  /** Board thickness (mm) — determines socket depth. */
  readonly boardThicknessMm: number;
  /** Glue allowance added to socket depth (mm, default 0.5). */
  readonly glueAllowanceMm?: number;
}

/** Single finger or socket position. */
export interface FingerPosition {
  /** 0-based index. */
  readonly index: number;
  /** Start position from board edge (mm). */
  readonly startMm: number;
  /** End position (mm). */
  readonly endMm: number;
  /** Whether this is a finger (true) or socket (false) on board A. */
  readonly isFinger: boolean;
}

/** Result of finger joint calculation. */
export interface FingerJointResult {
  /** Computed finger width (mm). */
  readonly fingerWidthMm: number;
  /** Total finger count (on one board). */
  readonly fingerCount: number;
  /** Socket depth (mm). */
  readonly socketDepthMm: number;
  /** Layout of fingers and sockets for board A. */
  readonly layoutA: readonly FingerPosition[];
  /** Layout for board B (inverse of A). */
  readonly layoutB: readonly FingerPosition[];
  /** Total glue surface area for one face (mm²). */
  readonly glueSurfaceMm2: number;
}

/**
 * Calculate finger joint layout.
 *
 * @param input - Board dimensions and finger preferences
 * @returns Finger layout, socket depth, and glue area
 * @throws RangeError for invalid inputs
 */
export function calculateFingerJoint(input: FingerJointInput): FingerJointResult {
  const { boardWidthMm, boardThicknessMm, glueAllowanceMm = 0.5 } = input;

  if (boardWidthMm <= 0) {
    throw new RangeError(`calculateFingerJoint: boardWidthMm must be > 0, got ${boardWidthMm}`);
  }
  if (boardThicknessMm <= 0) {
    throw new RangeError(`calculateFingerJoint: boardThicknessMm must be > 0, got ${boardThicknessMm}`);
  }

  let fingerWidthMm: number;
  let fingerCount: number;

  if (input.fingerWidthMm !== undefined) {
    if (input.fingerWidthMm <= 0) {
      throw new RangeError(`calculateFingerJoint: fingerWidthMm must be > 0, got ${input.fingerWidthMm}`);
    }
    fingerWidthMm = input.fingerWidthMm;
    // Total slots = board width / finger width, rounded to nearest odd number
    const rawCount = Math.floor(boardWidthMm / fingerWidthMm);
    fingerCount = rawCount % 2 === 0 ? rawCount - 1 : rawCount;
    if (fingerCount < 3) {
      throw new RangeError('calculateFingerJoint: board too narrow for given fingerWidthMm');
    }
    // Recompute actual width to fill board evenly
    fingerWidthMm = round2(boardWidthMm / fingerCount);
  } else if (input.fingerCount !== undefined) {
    if (input.fingerCount < 3) {
      throw new RangeError(`calculateFingerJoint: fingerCount must be >= 3, got ${input.fingerCount}`);
    }
    fingerCount = input.fingerCount % 2 === 0 ? input.fingerCount - 1 : input.fingerCount;
    fingerWidthMm = round2(boardWidthMm / fingerCount);
  } else {
    // Default: finger width ≈ board thickness (classic rule of thumb)
    fingerWidthMm = boardThicknessMm;
    const rawCount = Math.floor(boardWidthMm / fingerWidthMm);
    fingerCount = rawCount % 2 === 0 ? rawCount - 1 : rawCount;
    if (fingerCount < 3) fingerCount = 3;
    fingerWidthMm = round2(boardWidthMm / fingerCount);
  }

  const socketDepthMm = round2(boardThicknessMm + glueAllowanceMm);

  const layoutA: FingerPosition[] = [];
  const layoutB: FingerPosition[] = [];
  for (let i = 0; i < fingerCount; i++) {
    const startMm = round2(i * fingerWidthMm);
    const endMm = round2((i + 1) * fingerWidthMm);
    const isFingerA = i % 2 === 0;
    layoutA.push({ index: i, startMm, endMm, isFinger: isFingerA });
    layoutB.push({ index: i, startMm, endMm, isFinger: !isFingerA });
  }

  // Glue surface = number of interfaces × finger width × socket depth
  // Each finger has two side faces; number of glued interfaces = fingerCount - 1
  const glueSurfaceMm2 = round2((fingerCount - 1) * fingerWidthMm * socketDepthMm);

  return {
    fingerWidthMm,
    fingerCount,
    socketDepthMm,
    layoutA,
    layoutB,
    glueSurfaceMm2,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
