/**
 * Pocket Hole Joinery Calculator — Sprint 195
 *
 * Computes pocket hole screw parameters: screw length, drill angle,
 * spacing along joint, number of screws, and driver bit size.
 * Based on Kreg-style pocket hole joinery standards.
 */

/** Standard pocket hole screw lengths in inches. */
export const POCKET_SCREW_LENGTHS = [0.625, 1.0, 1.25, 1.5, 2.0, 2.5] as const;

/** Screw head type. */
export type ScrewHeadType = 'coarse' | 'fine' | 'washer_head';

/** Material hardness category for screw thread selection. */
export type MaterialHardness = 'softwood' | 'hardwood' | 'plywood' | 'mdf';

/** Pocket hole joint configuration. */
export type JointType = 'butt' | 'mitre' | 'edge';

/** Input for pocket hole calculation. */
export interface PocketHoleInput {
  /** Thickness of workpiece receiving the pocket hole in mm. */
  readonly workpieceThicknessMm: number;
  /** Thickness of mating piece in mm. */
  readonly matingThicknessMm: number;
  /** Joint length in mm (dimension along which screws are spaced). */
  readonly jointLengthMm: number;
  /** Material hardness of the mating piece. */
  readonly materialHardness: MaterialHardness;
  /** Joint type. */
  readonly jointType: JointType;
  /** Minimum edge distance in mm (default: 25). */
  readonly edgeDistanceMm?: number;
}

/** Pocket hole calculation result. */
export interface PocketHoleResult {
  /** Recommended screw length in inches. */
  readonly screwLengthInches: number;
  /** Screw length in mm. */
  readonly screwLengthMm: number;
  /** Drill angle in degrees (typically 15°). */
  readonly drillAngleDeg: number;
  /** Recommended thread type based on material. */
  readonly threadType: ScrewHeadType;
  /** Number of screws for the joint. */
  readonly screwCount: number;
  /** Spacing between screws in mm. */
  readonly spacingMm: number;
  /** Drill bit diameter in mm for pocket bore. */
  readonly pocketBoreMm: number;
  /** Pilot hole diameter in mm. */
  readonly pilotHoleMm: number;
  /** Collar/stop depth setting in mm. */
  readonly collarDepthMm: number;
  /** Clamp time in minutes for glue + screw. */
  readonly clampTimeMin: number;
}

const INCHES_TO_MM = 25.4;

/**
 * Select optimal screw length based on workpiece thickness.
 * Rule: screw should penetrate ~60% into the mating piece
 * but not exceed total joint depth.
 */
export function selectScrewLength(workpieceThicknessMm: number, matingThicknessMm: number): number {
  if (workpieceThicknessMm <= 0) {
    throw new RangeError(`selectScrewLength: workpieceThicknessMm must be > 0, got ${workpieceThicknessMm}`);
  }
  if (matingThicknessMm <= 0) {
    throw new RangeError(`selectScrewLength: matingThicknessMm must be > 0, got ${matingThicknessMm}`);
  }

  // Target penetration: workpiece exit + 60% of mating piece
  const targetMm = workpieceThicknessMm * 0.5 + matingThicknessMm * 0.6;
  const targetInches = targetMm / INCHES_TO_MM;

  let selected: number = POCKET_SCREW_LENGTHS[0];
  for (const len of POCKET_SCREW_LENGTHS) {
    if (len <= targetInches) {
      selected = len;
    }
  }

  // Ensure screw doesn't punch through mating piece
  const maxMm = workpieceThicknessMm + matingThicknessMm - 3;
  const maxInches = maxMm / INCHES_TO_MM;
  if (selected * INCHES_TO_MM > maxMm) {
    for (const len of POCKET_SCREW_LENGTHS) {
      if (len <= maxInches) {
        selected = len;
      }
    }
  }

  return selected;
}

/**
 * Determine thread type based on material hardness.
 */
export function selectThreadType(hardness: MaterialHardness): ScrewHeadType {
  switch (hardness) {
    case 'softwood':
      return 'coarse';
    case 'hardwood':
      return 'fine';
    case 'plywood':
      return 'fine';
    case 'mdf':
      return 'washer_head';
  }
}

/**
 * Calculate pocket hole joinery parameters.
 *
 * @param input - Joint configuration
 * @returns Pocket hole parameters including screw length, spacing, and drill settings
 * @throws RangeError for invalid dimensions
 */
export function calculatePocketHole(input: PocketHoleInput): PocketHoleResult {
  const {
    workpieceThicknessMm,
    matingThicknessMm,
    jointLengthMm,
    materialHardness,
    jointType,
    edgeDistanceMm = 25,
  } = input;

  if (workpieceThicknessMm <= 0) {
    throw new RangeError(`calculatePocketHole: workpieceThicknessMm must be > 0, got ${workpieceThicknessMm}`);
  }
  if (matingThicknessMm <= 0) {
    throw new RangeError(`calculatePocketHole: matingThicknessMm must be > 0, got ${matingThicknessMm}`);
  }
  if (jointLengthMm <= 0) {
    throw new RangeError(`calculatePocketHole: jointLengthMm must be > 0, got ${jointLengthMm}`);
  }

  const screwLengthInches = selectScrewLength(workpieceThicknessMm, matingThicknessMm);
  const screwLengthMm = Math.round(screwLengthInches * INCHES_TO_MM * 10) / 10;

  const drillAngleDeg = 15;

  const threadType = selectThreadType(materialHardness);

  // Spacing: 150mm standard for butt joints, 100mm for mitre/edge
  const baseSpacing = jointType === 'butt' ? 150 : 100;
  const availableLength = jointLengthMm - 2 * edgeDistanceMm;

  let screwCount: number;
  if (availableLength <= 0) {
    screwCount = 1;
  } else if (availableLength <= baseSpacing) {
    screwCount = 2;
  } else {
    screwCount = Math.max(2, Math.round(availableLength / baseSpacing) + 1);
  }

  const spacingMm = screwCount > 1 ? Math.round((availableLength / (screwCount - 1)) * 100) / 100 : 0;

  // Drill bit sizes based on workpiece thickness
  const pocketBoreMm = workpieceThicknessMm <= 15 ? 8 : 9.5;
  const pilotHoleMm = workpieceThicknessMm <= 15 ? 3.5 : 4.0;

  // Collar depth = workpiece thickness adjusted for 15° angle entry
  const collarDepthMm = Math.round((workpieceThicknessMm / Math.cos((drillAngleDeg * Math.PI) / 180)) * 10) / 10;

  // Minimal clamp time for pocket hole + glue
  const clampTimeMin = materialHardness === 'mdf' ? 60 : 30;

  return {
    screwLengthInches,
    screwLengthMm,
    drillAngleDeg,
    threadType,
    screwCount,
    spacingMm,
    pocketBoreMm,
    pilotHoleMm,
    collarDepthMm,
    clampTimeMin,
  };
}
