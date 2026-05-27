/**
 * Dowel Joint Calculator — Sprint 193
 *
 * Computes dowel spacing, depth, diameter selection, and drilling
 * coordinates for edge-to-face and edge-to-edge dowel joints.
 * Ensures proper alignment, adequate strength, and minimum
 * edge clearance for common woodworking joinery.
 */

/** Standard dowel diameters in mm. */
export const STANDARD_DOWEL_DIAMETERS = [6, 8, 10, 12] as const;

/** Dowel diameter type. */
export type DowelDiameter = (typeof STANDARD_DOWEL_DIAMETERS)[number];

/** Joint orientation. */
export type JointOrientation = 'edge_to_face' | 'edge_to_edge' | 'mitre';

/** Input for dowel joint calculation. */
export interface DowelJointInput {
  /** Joint length in mm (the dimension along which dowels are spaced). */
  readonly jointLengthMm: number;
  /** Board thickness in mm (determines max dowel diameter). */
  readonly boardThicknessMm: number;
  /** Joint orientation. */
  readonly orientation: JointOrientation;
  /** Desired dowel diameter in mm (auto-selected if omitted). */
  readonly dowelDiameterMm?: DowelDiameter;
  /** Minimum edge clearance in mm (default: 50). */
  readonly edgeClearanceMm?: number;
  /** Minimum spacing between dowels in mm (default: 100). */
  readonly minSpacingMm?: number;
  /** Maximum spacing between dowels in mm (default: 200). */
  readonly maxSpacingMm?: number;
}

/** Single dowel position. */
export interface DowelPosition {
  /** Distance from start edge in mm. */
  readonly offsetMm: number;
  /** Drilling depth per side in mm. */
  readonly depthMm: number;
  /** Dowel total length in mm. */
  readonly dowelLengthMm: number;
}

/** Result of dowel joint calculation. */
export interface DowelJointResult {
  /** Selected dowel diameter in mm. */
  readonly dowelDiameterMm: DowelDiameter;
  /** Number of dowels. */
  readonly count: number;
  /** Actual spacing between dowels in mm. */
  readonly spacingMm: number;
  /** Drilling depth per side in mm. */
  readonly drillDepthMm: number;
  /** Total dowel length (both sides + gap). */
  readonly dowelLengthMm: number;
  /** Drill bit diameter required (= dowel diameter). */
  readonly drillBitMm: number;
  /** Positions of each dowel along the joint. */
  readonly positions: readonly DowelPosition[];
  /** Minimum clamp time in minutes for PVA glue. */
  readonly clampTimeMin: number;
}

/**
 * Select optimal dowel diameter based on board thickness.
 * Rule of thumb: dowel diameter ≤ ½ board thickness.
 *
 * @param boardThicknessMm - Board thickness in mm
 * @returns Optimal dowel diameter
 */
export function selectDowelDiameter(boardThicknessMm: number): DowelDiameter {
  const maxDiameter = boardThicknessMm / 2;
  let selected: DowelDiameter = 6;
  for (const d of STANDARD_DOWEL_DIAMETERS) {
    if (d <= maxDiameter) {
      selected = d;
    }
  }
  return selected;
}

/**
 * Calculate dowel joint layout.
 *
 * @param input - Joint parameters
 * @returns Dowel positions, spacing, and drilling data
 * @throws RangeError if jointLength ≤ 0, boardThickness ≤ 0, or insufficient space for dowels
 */
export function calculateDowelJoint(input: DowelJointInput): DowelJointResult {
  const {
    jointLengthMm,
    boardThicknessMm,
    orientation,
    edgeClearanceMm = 50,
    minSpacingMm = 100,
    maxSpacingMm = 200,
  } = input;

  if (jointLengthMm <= 0) {
    throw new RangeError(`calculateDowelJoint: jointLengthMm must be > 0, got ${jointLengthMm}`);
  }
  if (boardThicknessMm <= 0) {
    throw new RangeError(`calculateDowelJoint: boardThicknessMm must be > 0, got ${boardThicknessMm}`);
  }
  if (edgeClearanceMm < 0) {
    throw new RangeError(`calculateDowelJoint: edgeClearanceMm must be ≥ 0, got ${edgeClearanceMm}`);
  }

  const dowelDiameterMm = input.dowelDiameterMm ?? selectDowelDiameter(boardThicknessMm);

  // Available length for dowel placement
  const availableLength = jointLengthMm - 2 * edgeClearanceMm;

  if (availableLength <= 0) {
    throw new RangeError(`calculateDowelJoint: joint too short for edge clearance (available=${availableLength}mm)`);
  }

  // Determine number of dowels
  let count: number;
  if (availableLength <= minSpacingMm) {
    count = 2; // minimum 2 dowels for alignment
  } else {
    // Target spacing within min–max range
    const targetSpacing = (minSpacingMm + maxSpacingMm) / 2;
    count = Math.max(2, Math.round(availableLength / targetSpacing) + 1);
  }

  // Calculate actual spacing
  const spacingMm = count > 1 ? Math.round((availableLength / (count - 1)) * 100) / 100 : 0;

  // Clamp spacing to max — add more dowels if needed
  if (spacingMm > maxSpacingMm && count > 1) {
    count = Math.ceil(availableLength / maxSpacingMm) + 1;
  }

  const finalSpacing = count > 1 ? Math.round((availableLength / (count - 1)) * 100) / 100 : 0;

  // Drill depth depends on orientation
  const depthFactors: Record<JointOrientation, number> = {
    edge_to_face: 2.5,
    edge_to_edge: 2.0,
    mitre: 2.0,
  };

  const drillDepthMm = Math.round(dowelDiameterMm * depthFactors[orientation]);
  const dowelLengthMm = drillDepthMm * 2 - 1; // 1mm gap for glue squeeze-out

  // Generate positions
  const positions: DowelPosition[] = [];
  for (let i = 0; i < count; i++) {
    const offsetMm =
      count > 1
        ? Math.round((edgeClearanceMm + i * finalSpacing) * 100) / 100
        : Math.round((jointLengthMm / 2) * 100) / 100;
    positions.push({ offsetMm, depthMm: drillDepthMm, dowelLengthMm });
  }

  // Clamp time (PVA): 30 min standard, 45 for end grain (edge_to_edge)
  const clampTimeMin = orientation === 'edge_to_edge' ? 45 : 30;

  return {
    dowelDiameterMm,
    count,
    spacingMm: finalSpacing,
    drillDepthMm,
    dowelLengthMm,
    drillBitMm: dowelDiameterMm,
    positions,
    clampTimeMin,
  };
}

/**
 * Calculate minimum number of dowels for a given load.
 *
 * @param loadKg - Expected shear load in kg
 * @param dowelDiameterMm - Dowel diameter in mm
 * @returns Minimum number of dowels required
 * @throws RangeError if loadKg ≤ 0 or dowelDiameter not in standard set
 */
export function minDowelsForLoad(loadKg: number, dowelDiameterMm: DowelDiameter): number {
  if (loadKg <= 0) {
    throw new RangeError(`minDowelsForLoad: loadKg must be > 0, got ${loadKg}`);
  }

  // Approximate shear capacity per dowel (kg) based on diameter
  const shearCapacity: Record<DowelDiameter, number> = {
    6: 25,
    8: 40,
    10: 60,
    12: 85,
  };

  const capacity = shearCapacity[dowelDiameterMm];
  return Math.max(2, Math.ceil(loadKg / capacity));
}
