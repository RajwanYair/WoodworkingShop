/**
 * Shelf Pin Spacing Calculator — Sprint 201
 *
 * Computes optimal shelf pin hole layout for adjustable shelving,
 * including row spacing, edge clearances, and drilling templates.
 */

/** Standard shelf pin hole diameters (mm). */
export const SHELF_PIN_DIAMETERS = [5, 6, 7, 8, 10] as const;
export type ShelfPinDiameter = (typeof SHELF_PIN_DIAMETERS)[number];

/** Shelf pin hole pattern style. */
export type PinPatternStyle = 'single_row' | 'double_row' | 'euro_32';

/** Input for shelf pin spacing calculation. */
export interface ShelfPinInput {
  /** Interior height of the cabinet (mm). */
  readonly cabinetHeightMm: number;
  /** Number of adjustable positions desired. */
  readonly positions: number;
  /** Pin hole diameter (mm). */
  readonly pinDiameterMm: ShelfPinDiameter;
  /** Distance from top/bottom edge to first hole (mm). */
  readonly edgeClearanceMm?: number;
  /** Pattern style. */
  readonly pattern?: PinPatternStyle;
  /** Panel thickness for depth calculation (mm). */
  readonly panelThicknessMm?: number;
}

/** A single pin hole position. */
export interface PinHole {
  /** Distance from bottom of cabinet (mm). */
  readonly y: number;
  /** Hole index (0-based). */
  readonly index: number;
}

/** Result of shelf pin spacing calculation. */
export interface ShelfPinResult {
  /** Spacing between holes (mm). */
  readonly spacingMm: number;
  /** All hole positions from bottom. */
  readonly holes: readonly PinHole[];
  /** Recommended drill depth (mm). */
  readonly drillDepthMm: number;
  /** Total number of holes per side. */
  readonly holeCount: number;
  /** Usable adjustment range (mm). */
  readonly adjustmentRangeMm: number;
  /** Whether pattern is Euro 32mm system compliant. */
  readonly isEuro32: boolean;
}

/**
 * Calculate shelf pin hole spacing and positions.
 *
 * @param input - Cabinet and pin parameters
 * @returns Hole positions and drill specifications
 * @throws RangeError for invalid dimensions
 */
export function calculateShelfPins(input: ShelfPinInput): ShelfPinResult {
  const {
    cabinetHeightMm,
    positions,
    pinDiameterMm,
    edgeClearanceMm = 50,
    pattern = 'single_row',
    panelThicknessMm = 18,
  } = input;

  if (cabinetHeightMm <= 0) {
    throw new RangeError(`calculateShelfPins: cabinetHeightMm must be > 0, got ${cabinetHeightMm}`);
  }
  if (positions < 2 || !Number.isInteger(positions)) {
    throw new RangeError(`calculateShelfPins: positions must be an integer >= 2, got ${positions}`);
  }
  if (edgeClearanceMm < 0) {
    throw new RangeError(`calculateShelfPins: edgeClearanceMm must be >= 0, got ${edgeClearanceMm}`);
  }
  if (panelThicknessMm <= 0) {
    throw new RangeError(`calculateShelfPins: panelThicknessMm must be > 0, got ${panelThicknessMm}`);
  }

  const usableHeight = cabinetHeightMm - 2 * edgeClearanceMm;
  if (usableHeight <= 0) {
    throw new RangeError(`calculateShelfPins: usable height is <= 0 (cabinet too short for edge clearance)`);
  }

  let spacingMm: number;
  let isEuro32 = false;

  if (pattern === 'euro_32') {
    spacingMm = 32;
    isEuro32 = true;
  } else {
    spacingMm = Math.round((usableHeight / (positions - 1)) * 10) / 10;
  }

  // Generate hole positions
  const holeCount = pattern === 'euro_32' ? Math.floor(usableHeight / 32) + 1 : positions;

  const holes: PinHole[] = [];
  for (let i = 0; i < holeCount; i++) {
    holes.push({
      y: Math.round((edgeClearanceMm + i * spacingMm) * 10) / 10,
      index: i,
    });
  }

  // Drill depth: pin diameter + 2mm clearance, max 2/3 panel thickness
  const maxDepth = Math.round((panelThicknessMm * 2) / 3);
  const idealDepth = pinDiameterMm + 2;
  const drillDepthMm = Math.min(idealDepth, maxDepth);

  const adjustmentRangeMm = holeCount > 1 ? Math.round((holeCount - 1) * spacingMm * 10) / 10 : 0;

  return {
    spacingMm,
    holes,
    drillDepthMm,
    holeCount,
    adjustmentRangeMm,
    isEuro32,
  };
}

/**
 * Calculate the number of shelf pins needed for a project.
 *
 * @param shelves - Number of adjustable shelves
 * @param pinsPerShelf - Pins per shelf (typically 4)
 * @param sparePercent - Spare pin percentage (0–100)
 * @returns Total pins needed (including spares)
 */
export function totalPinsNeeded(shelves: number, pinsPerShelf: number = 4, sparePercent: number = 10): number {
  if (shelves <= 0 || !Number.isInteger(shelves)) {
    throw new RangeError(`totalPinsNeeded: shelves must be a positive integer, got ${shelves}`);
  }
  if (pinsPerShelf <= 0) {
    throw new RangeError(`totalPinsNeeded: pinsPerShelf must be > 0, got ${pinsPerShelf}`);
  }
  if (sparePercent < 0 || sparePercent > 100) {
    throw new RangeError(`totalPinsNeeded: sparePercent must be 0–100, got ${sparePercent}`);
  }

  const base = shelves * pinsPerShelf;
  return Math.ceil(base * (1 + sparePercent / 100));
}
