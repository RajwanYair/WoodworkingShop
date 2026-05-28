/**
 * Cabinet Door Sizing Calculator — Sprint 220
 *
 * Calculates door dimensions from a cabinet face opening given the
 * overlay style, gap clearance, and number of doors.
 *
 * All dimensions in millimetres. Pure function — no side effects.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** How the door sits relative to the face frame or cabinet side. */
export type DoorOverlay = 'full' | 'half' | 'inset';

/** Input for cabinet door sizing. */
export interface CabinetDoorInput {
  /** Width of the face opening (inside-to-inside of cabinet sides or stiles), mm. */
  readonly openingWidthMm: number;
  /** Height of the face opening (inside-to-inside of top rail and floor / bottom rail), mm. */
  readonly openingHeightMm: number;
  /** Number of doors covering this opening (1 or 2). */
  readonly doorCount: 1 | 2;
  /** Overlay style — how far the door extends past the opening. */
  readonly overlay: DoorOverlay;
  /**
   * Overlay amount for full/half overlay (mm, ignored for inset).
   * Defaults: full = 9.5 mm (3/8"), half = 4.75 mm (3/16").
   */
  readonly overlayMm?: number;
  /**
   * Gap on each side of the door (mm).
   * Defaults: full/half = 2 mm, inset = 1.5 mm.
   */
  readonly gapMm?: number;
  /** Face frame stile width (mm). Required for inset and half-overlay calculations. Default 38 mm (1-1/2"). */
  readonly stileWidthMm?: number;
}

/** Dimensions and counts for a single door leaf. */
export interface DoorLeafResult {
  /** Finished width of one door leaf (mm). */
  readonly widthMm: number;
  /** Finished height of one door leaf (mm). */
  readonly heightMm: number;
}

/** Result of cabinet door sizing calculation. */
export interface CabinetDoorResult {
  /** Dimensions of each door leaf. */
  readonly doorLeaf: DoorLeafResult;
  /** Total number of hinges recommended for this door set. */
  readonly hingeCount: number;
  /** Overlay amount used (mm). */
  readonly overlayMm: number;
  /** Gap used per side (mm). */
  readonly gapMm: number;
  /** True if the total door width covers the opening adequately. */
  readonly isValid: boolean;
  /** Advisory notes key array (i18n key suffixes). */
  readonly notes: readonly string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum hinges per door leaf. */
const MIN_HINGES = 2;
/** Add a hinge for every additional 500 mm of door height beyond the base. */
const HINGE_STEP_MM = 500;
/** Door height at which the third hinge becomes recommended (mm). */
const THREE_HINGE_HEIGHT_MM = 900;

// ─── Implementation ───────────────────────────────────────────────────────────

/**
 * Calculate cabinet door leaf dimensions, hinge count, and notes.
 *
 * @param input - Opening dimensions, overlay style, and door count
 * @returns Door leaf size, hinge count, and validity
 * @throws RangeError for invalid dimensions
 */
export function calculateCabinetDoor(input: CabinetDoorInput): CabinetDoorResult {
  const { openingWidthMm, openingHeightMm, doorCount, overlay, stileWidthMm = 38 } = input;

  if (openingWidthMm <= 0) {
    throw new RangeError(`calculateCabinetDoor: openingWidthMm must be > 0, got ${openingWidthMm}`);
  }
  if (openingHeightMm <= 0) {
    throw new RangeError(`calculateCabinetDoor: openingHeightMm must be > 0, got ${openingHeightMm}`);
  }
  if (stileWidthMm <= 0) {
    throw new RangeError(`calculateCabinetDoor: stileWidthMm must be > 0, got ${stileWidthMm}`);
  }

  // Resolve overlay and gap defaults
  let resolvedOverlay: number;
  let resolvedGap: number;

  if (overlay === 'full') {
    resolvedOverlay = input.overlayMm ?? 9.5;
    resolvedGap = input.gapMm ?? 2;
  } else if (overlay === 'half') {
    resolvedOverlay = input.overlayMm ?? 4.75;
    resolvedGap = input.gapMm ?? 2;
  } else {
    // inset
    resolvedOverlay = 0;
    resolvedGap = input.gapMm ?? 1.5;
  }

  if (resolvedOverlay < 0) {
    throw new RangeError(`calculateCabinetDoor: overlayMm must be ≥ 0, got ${resolvedOverlay}`);
  }
  if (resolvedGap < 0) {
    throw new RangeError(`calculateCabinetDoor: gapMm must be ≥ 0, got ${resolvedGap}`);
  }

  // Calculate total door width for all leaves combined
  // For full/half overlay: door covers opening + overlay on each outer edge (2×overlay)
  // For inset: door fits inside opening minus gap on each side (2×gap)
  // For 2-door pair: subtract the centre gap between the doors
  const centreSplit = doorCount === 2 ? resolvedGap : 0;

  let totalDoorWidth: number;
  if (overlay === 'inset') {
    totalDoorWidth = openingWidthMm - 2 * resolvedGap;
  } else {
    // face-frame construction: overlay extends onto stile
    // total = opening + 2×overlay - 2×gap (gap between door edge and stile reveal)
    totalDoorWidth = openingWidthMm + 2 * resolvedOverlay - 2 * resolvedGap;
  }

  // Subtract centre gap for double doors before dividing
  totalDoorWidth -= centreSplit;

  const leafWidthMm = totalDoorWidth / doorCount;

  // Door height: same logic applied vertically
  let leafHeightMm: number;
  if (overlay === 'inset') {
    leafHeightMm = openingHeightMm - 2 * resolvedGap;
  } else {
    leafHeightMm = openingHeightMm + 2 * resolvedOverlay - 2 * resolvedGap;
  }

  // Hinge count: 2 hinges base, +1 per HINGE_STEP_MM above THREE_HINGE_HEIGHT_MM
  let hingeCount = MIN_HINGES;
  if (leafHeightMm >= THREE_HINGE_HEIGHT_MM) {
    hingeCount += Math.floor((leafHeightMm - THREE_HINGE_HEIGHT_MM) / HINGE_STEP_MM) + 1;
  }
  // Multiply by door count (each leaf needs its own hinges)
  hingeCount *= doorCount;

  // Validity checks
  const isValid = leafWidthMm > 0 && leafHeightMm > 0;

  // Advisory notes
  const notes: string[] = [];
  if (doorCount === 2 && leafWidthMm < 150) {
    notes.push('narrowLeaf');
  }
  if (leafWidthMm > 600 && doorCount === 1) {
    notes.push('wideLeaf');
  }
  if (overlay === 'inset' && (openingWidthMm < 200 || openingHeightMm < 200)) {
    notes.push('smallInset');
  }
  if (leafHeightMm > 1800) {
    notes.push('tallDoor');
  }

  return {
    doorLeaf: { widthMm: Math.round(leafWidthMm * 10) / 10, heightMm: Math.round(leafHeightMm * 10) / 10 },
    hingeCount,
    overlayMm: resolvedOverlay,
    gapMm: resolvedGap,
    isValid,
    notes,
  };
}

/**
 * Suggest a door count based on opening width.
 * Returns 2 for openings wider than 450 mm, 1 for narrower.
 */
export function recommendDoorCount(openingWidthMm: number): 1 | 2 {
  return openingWidthMm > 450 ? 2 : 1;
}
