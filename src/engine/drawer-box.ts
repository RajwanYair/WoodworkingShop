/**
 * Drawer Box Sizing Calculator — Sprint 223
 *
 * Calculates internal drawer box dimensions from a cabinet opening, slide type,
 * and material thickness. Outputs box width/height/depth and false-front size.
 *
 * All dimensions in millimetres. Pure function — no side effects.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Slide mounting position — determines width deductions. */
export type DrawerSlideType = 'side' | 'bottom' | 'center';

/** Input for drawer box sizing. */
export interface DrawerBoxInput {
  /** Width of the cabinet opening (inside-to-inside), mm. Must be > 0. */
  readonly openingWidthMm: number;
  /** Height of the cabinet opening, mm. Must be > 0. */
  readonly openingHeightMm: number;
  /** Inside depth of the cabinet (available for drawer travel), mm. Must be > 0. */
  readonly openingDepthMm: number;
  /** Slide mounting style. Defaults to 'side'. */
  readonly slideType?: DrawerSlideType;
  /** Thickness of each box side in mm. Defaults to 12 mm (1/2"). */
  readonly sideThicknessMm?: number;
  /** Thickness of the false front (overlay) in mm. Defaults to 19 mm (3/4"). */
  readonly falseFrontThicknessMm?: number;
}

/** Calculated drawer box dimensions. */
export interface DrawerBoxResult {
  /** Box width (inside–to–outside of side panels), mm. */
  readonly boxWidthMm: number;
  /** Box height (outside of front/back panels to top of side), mm. */
  readonly boxHeightMm: number;
  /** Box depth (front-to-back of side panels), mm. */
  readonly boxDepthMm: number;
  /** False front width (covers opening + small overlap), mm. */
  readonly falseFrontWidthMm: number;
  /** False front height, mm. */
  readonly falseFrontHeightMm: number;
  /** True when box depth is ≥ recommended minimum (300 mm). */
  readonly isDepthAdequate: boolean;
  /** Advisory note i18n key suffix, or null when none. */
  readonly noteKey: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_SIDE_THICKNESS_MM = 12;
const DEFAULT_FALSE_FRONT_THICKNESS_MM = 19;

/** Side-mount slide clearance: 12.7 mm (1/2") per side = 25.4 mm total. */
const SIDE_MOUNT_CLEARANCE_MM = 25.4;
/** Bottom-mount (undermount) clearance: 1 mm per side = 2 mm total. */
const BOTTOM_MOUNT_CLEARANCE_MM = 2;
/** Centre-mount clearance: 3 mm per side = 6 mm total. */
const CENTER_MOUNT_CLEARANCE_MM = 6;
/** Gap above box top to bottom of false front rail, mm. */
const HEIGHT_CLEARANCE_MM = 6;
/** Minimum recommended box depth, mm. */
const MIN_BOX_DEPTH_MM = 300;
/** Reveal/overlap for false front per side, mm. */
const FALSE_FRONT_REVEAL_MM = 2;

// ─── Implementation ───────────────────────────────────────────────────────────

/**
 * Calculate drawer box dimensions from opening size, slide type, and material.
 *
 * @param input - Opening dimensions, slide type, and thicknesses
 * @returns Finished box dimensions and false front size
 * @throws RangeError for non-positive dimensions
 */
export function calculateDrawerBox(input: DrawerBoxInput): DrawerBoxResult {
  const {
    openingWidthMm,
    openingHeightMm,
    openingDepthMm,
    slideType = 'side',
    sideThicknessMm = DEFAULT_SIDE_THICKNESS_MM,
    falseFrontThicknessMm = DEFAULT_FALSE_FRONT_THICKNESS_MM,
  } = input;

  if (openingWidthMm <= 0) throw new RangeError('openingWidthMm must be > 0');
  if (openingHeightMm <= 0) throw new RangeError('openingHeightMm must be > 0');
  if (openingDepthMm <= 0) throw new RangeError('openingDepthMm must be > 0');
  if (sideThicknessMm <= 0) throw new RangeError('sideThicknessMm must be > 0');
  if (falseFrontThicknessMm <= 0) throw new RangeError('falseFrontThicknessMm must be > 0');

  // Width deduction depends on slide type
  const widthClearance =
    slideType === 'side'
      ? SIDE_MOUNT_CLEARANCE_MM
      : slideType === 'bottom'
        ? BOTTOM_MOUNT_CLEARANCE_MM
        : CENTER_MOUNT_CLEARANCE_MM;

  const boxWidthMm = openingWidthMm - widthClearance;
  if (boxWidthMm <= 0) {
    throw new RangeError('Opening too narrow for selected slide type clearance');
  }

  // Height: opening height minus gap clearance, minus false-front thickness to avoid protrusion
  const boxHeightMm = openingHeightMm - HEIGHT_CLEARANCE_MM;
  if (boxHeightMm <= 0) {
    throw new RangeError('Opening too shallow for drawer box height clearance');
  }

  // Depth: cabinet inside depth minus false-front thickness so the box clears
  const boxDepthMm = openingDepthMm - falseFrontThicknessMm;
  if (boxDepthMm <= 0) {
    throw new RangeError('openingDepthMm must be greater than falseFrontThicknessMm');
  }

  // False front: covers opening with a small reveal on each edge
  const falseFrontWidthMm = openingWidthMm + 2 * FALSE_FRONT_REVEAL_MM;
  const falseFrontHeightMm = openingHeightMm + 2 * FALSE_FRONT_REVEAL_MM;

  const isDepthAdequate = boxDepthMm >= MIN_BOX_DEPTH_MM;
  const noteKey = isDepthAdequate ? null : 'noteShort';

  return {
    boxWidthMm,
    boxHeightMm,
    boxDepthMm,
    falseFrontWidthMm,
    falseFrontHeightMm,
    isDepthAdequate,
    noteKey,
  };
}
