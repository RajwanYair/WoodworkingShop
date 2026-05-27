/**
 * Drawer Slide Calculator — Sprint 202
 *
 * Computes drawer box dimensions based on slide type, mounting style,
 * and opening dimensions. Includes clearance calculations and
 * recommended overlay/inset values.
 */

/** Drawer slide mounting style. */
export type SlideMountStyle = 'side_mount' | 'under_mount' | 'center_mount';

/** Drawer slide extension type. */
export type SlideExtension = 'three_quarter' | 'full' | 'over_travel';

/** Standard slide lengths (mm). */
export const STANDARD_SLIDE_LENGTHS = [250, 300, 350, 400, 450, 500, 550, 600] as const;
export type SlideLengthMm = (typeof STANDARD_SLIDE_LENGTHS)[number];

/** Input for drawer slide calculation. */
export interface DrawerSlideInput {
  /** Width of the cabinet opening (mm). */
  readonly openingWidthMm: number;
  /** Height of the cabinet opening (mm). */
  readonly openingHeightMm: number;
  /** Depth of the cabinet interior (mm). */
  readonly cabinetDepthMm: number;
  /** Slide mounting style. */
  readonly mountStyle: SlideMountStyle;
  /** Slide extension type. */
  readonly extension?: SlideExtension;
  /** Drawer front overlay beyond opening (mm). */
  readonly overlayMm?: number;
  /** Drawer side material thickness (mm). */
  readonly drawerSideThicknessMm?: number;
  /** Drawer bottom material thickness (mm). */
  readonly drawerBottomThicknessMm?: number;
}

/** Result of drawer slide calculation. */
export interface DrawerSlideResult {
  /** Internal drawer box width (mm). */
  readonly boxWidthMm: number;
  /** Internal drawer box height (mm). */
  readonly boxHeightMm: number;
  /** Maximum drawer box depth (mm). */
  readonly boxDepthMm: number;
  /** Required clearance per side (mm). */
  readonly clearancePerSideMm: number;
  /** Recommended slide length (mm). */
  readonly recommendedSlideLengthMm: number;
  /** Maximum internal load capacity note. */
  readonly mountStyle: SlideMountStyle;
  /** Extension type used. */
  readonly extension: SlideExtension;
  /** Total horizontal gap needed (both sides combined, mm). */
  readonly totalHorizontalGapMm: number;
  /** Bottom clearance for under-mount slides (mm). */
  readonly bottomClearanceMm: number;
}

/** Clearance values per slide mount style (mm per side). */
const CLEARANCE_MAP: Record<SlideMountStyle, number> = {
  side_mount: 12.7,
  under_mount: 3.2,
  center_mount: 0,
};

/** Bottom clearance for under-mount slides (mm). */
const UNDER_MOUNT_BOTTOM_CLEARANCE = 13.5;

/**
 * Calculate drawer box dimensions and slide requirements.
 *
 * @param input - Opening dimensions and slide parameters
 * @returns Drawer box dimensions and clearances
 * @throws RangeError for invalid dimensions
 */
export function calculateDrawerSlide(input: DrawerSlideInput): DrawerSlideResult {
  const {
    openingWidthMm,
    openingHeightMm,
    cabinetDepthMm,
    mountStyle,
    extension = 'full',
    drawerSideThicknessMm = 15,
    drawerBottomThicknessMm = 6,
  } = input;

  if (openingWidthMm <= 0) {
    throw new RangeError(`calculateDrawerSlide: openingWidthMm must be > 0, got ${openingWidthMm}`);
  }
  if (openingHeightMm <= 0) {
    throw new RangeError(`calculateDrawerSlide: openingHeightMm must be > 0, got ${openingHeightMm}`);
  }
  if (cabinetDepthMm <= 0) {
    throw new RangeError(`calculateDrawerSlide: cabinetDepthMm must be > 0, got ${cabinetDepthMm}`);
  }
  if (drawerSideThicknessMm <= 0) {
    throw new RangeError(`calculateDrawerSlide: drawerSideThicknessMm must be > 0, got ${drawerSideThicknessMm}`);
  }
  if (drawerBottomThicknessMm <= 0) {
    throw new RangeError(`calculateDrawerSlide: drawerBottomThicknessMm must be > 0, got ${drawerBottomThicknessMm}`);
  }

  const clearancePerSideMm = CLEARANCE_MAP[mountStyle];
  const totalHorizontalGapMm = clearancePerSideMm * 2;

  // Box width = opening width − total gap − 2× side thickness
  const boxWidthMm = Math.round((openingWidthMm - totalHorizontalGapMm - 2 * drawerSideThicknessMm) * 10) / 10;

  // Box height: leave 3mm clearance top, minus bottom panel
  const bottomClearanceMm = mountStyle === 'under_mount' ? UNDER_MOUNT_BOTTOM_CLEARANCE : 0;
  const boxHeightMm = Math.round((openingHeightMm - 3 - bottomClearanceMm - drawerBottomThicknessMm) * 10) / 10;

  // Recommended slide length — largest standard that fits the cabinet depth with 25mm rear clearance
  const maxSlideLength = cabinetDepthMm - 25;
  const recommendedSlideLengthMm = findRecommendedSlideLength(maxSlideLength);

  // Box depth based on slide length
  const boxDepthMm = Math.round((recommendedSlideLengthMm - 2) * 10) / 10;

  if (boxWidthMm <= 0) {
    throw new RangeError(`calculateDrawerSlide: computed box width is <= 0 (opening too narrow for slide clearance)`);
  }
  if (boxHeightMm <= 0) {
    throw new RangeError(`calculateDrawerSlide: computed box height is <= 0 (opening too short)`);
  }

  return {
    boxWidthMm,
    boxHeightMm,
    boxDepthMm,
    clearancePerSideMm,
    recommendedSlideLengthMm,
    mountStyle,
    extension,
    totalHorizontalGapMm,
    bottomClearanceMm,
  };
}

/**
 * Find the largest standard slide length that fits within the available depth.
 *
 * @param maxLengthMm - Maximum available length (mm)
 * @returns Recommended standard slide length
 */
export function findRecommendedSlideLength(maxLengthMm: number): number {
  if (maxLengthMm <= 0) {
    throw new RangeError(`findRecommendedSlideLength: maxLengthMm must be > 0, got ${maxLengthMm}`);
  }

  let best = STANDARD_SLIDE_LENGTHS[0];
  for (const len of STANDARD_SLIDE_LENGTHS) {
    if (len <= maxLengthMm) {
      best = len;
    } else {
      break;
    }
  }
  return best;
}
