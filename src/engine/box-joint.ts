/**
 * Box Joint Calculator — Sprint 232
 *
 * Calculates finger (box) joint layout for a given board width and finger size.
 *
 *   fingerCount    = floor(boardWidthMm / fingerWidthMm)
 *                  Adjust downward until fingerCount is odd (so both outer
 *                  corners are the same member's finger). Minimum 3 fingers.
 *   actualFinger   = boardWidthMm / fingerCount
 *   socketCount    = floor(fingerCount / 2)    — slots cut in mating board
 *   glueArea       = fingerCount × fingerWidthMm × depthMm × 2 (two flanks/finger)
 *
 * Finger depth is commonly set equal to board thickness (depthMm = boardThicknessMm).
 */

export interface BoxJointInput {
  /** Width of the board at the joint in mm */
  boardWidthMm: number;
  /** Desired finger width in mm */
  fingerWidthMm: number;
  /** Joint depth (= board thickness) in mm */
  depthMm: number;
}

export interface BoxJointResult {
  /** Number of fingers (always odd) */
  fingerCount: number;
  /** Actual finger width after adjustment in mm */
  actualFingerWidthMm: number;
  /** Number of sockets cut in the mating board */
  socketCount: number;
  /** Total glue surface area (both boards combined) in mm² */
  glueSurfaceMm2: number;
  /** Waste at each edge (half the difference between idealWidth and boardWidth) in mm */
  edgeWasteMm: number;
}

export function calculateBoxJoint(input: BoxJointInput): BoxJointResult {
  const { boardWidthMm, fingerWidthMm, depthMm } = input;

  if (boardWidthMm <= 0) throw new RangeError('boardWidthMm must be positive');
  if (fingerWidthMm <= 0) throw new RangeError('fingerWidthMm must be positive');
  if (depthMm <= 0) throw new RangeError('depthMm must be positive');
  if (fingerWidthMm >= boardWidthMm) throw new RangeError('fingerWidthMm must be less than boardWidthMm');

  // Start with floor count, force odd, minimum 3
  let fingerCount = Math.floor(boardWidthMm / fingerWidthMm);
  if (fingerCount < 3) fingerCount = 3;
  if (fingerCount % 2 === 0) fingerCount -= 1;
  if (fingerCount < 3) fingerCount = 3;

  const actualFingerWidthMm = Math.round((boardWidthMm / fingerCount) * 100) / 100;
  const socketCount = Math.floor(fingerCount / 2);
  // Each finger has 2 glue faces (flanks); both boards contribute equally → × 2 boards
  const glueSurfaceMm2 = Math.round(fingerCount * actualFingerWidthMm * depthMm * 2 * 10) / 10;
  const edgeWasteMm = Math.round(((fingerCount * actualFingerWidthMm - boardWidthMm) / 2) * 100) / 100;

  return {
    fingerCount,
    actualFingerWidthMm,
    socketCount,
    glueSurfaceMm2,
    edgeWasteMm,
  };
}
