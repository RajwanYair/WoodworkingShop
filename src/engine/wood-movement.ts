/**
 * Wood Movement Calculator — Sprint 190
 *
 * Computes seasonal expansion/contraction of solid wood panels
 * based on species coefficient, width, and moisture content change.
 * Essential for designing floating panels, frame-and-panel doors,
 * and tabletops that need seasonal clearance.
 */

/** Shrinkage coefficients (tangential % per 1% MC change) for common species. */
export const SPECIES_COEFFICIENTS = {
  oak: 0.00369,
  maple: 0.00353,
  walnut: 0.00274,
  cherry: 0.00301,
  pine: 0.00261,
  birch: 0.00338,
  ash: 0.00283,
  poplar: 0.00289,
  mahogany: 0.00217,
  beech: 0.00453,
  hickory: 0.00411,
  cedar: 0.00198,
  teak: 0.00181,
  douglas_fir: 0.00278,
} as const;

/** Known wood species with pre-defined shrinkage coefficients. */
export type WoodSpecies = keyof typeof SPECIES_COEFFICIENTS;

/** Input parameters for wood movement calculation. */
export interface WoodMovementInput {
  /** Width of the board in mm (across the grain — tangential). */
  readonly widthMm: number;
  /** Species name or custom tangential shrinkage coefficient. */
  readonly species: WoodSpecies | number;
  /** Initial moisture content (%). */
  readonly mcStart: number;
  /** Final moisture content (%). */
  readonly mcEnd: number;
}

/** Result of a wood movement calculation. */
export interface WoodMovementResult {
  /** Dimensional change in mm (positive = expansion, negative = shrinkage). */
  readonly changeMm: number;
  /** Absolute dimensional change in mm. */
  readonly absoluteChangeMm: number;
  /** The final width after movement in mm. */
  readonly finalWidthMm: number;
  /** Percentage change relative to original width. */
  readonly changePercent: number;
  /** Whether the wood expands or contracts. */
  readonly direction: 'expansion' | 'contraction' | 'none';
  /** Recommended gap allowance (per side) for floating panels in mm. */
  readonly gapPerSideMm: number;
}

/** Seasonal humidity presets for common environments. */
export const SEASONAL_PRESETS = {
  /** Heated indoor winter → humid summer (temperate climate). */
  temperate_indoor: { mcStart: 6, mcEnd: 12 },
  /** Air-conditioned indoor (year-round stable). */
  controlled_indoor: { mcStart: 7, mcEnd: 9 },
  /** Unheated workshop / garage (wide swing). */
  unheated_workshop: { mcStart: 5, mcEnd: 14 },
  /** Outdoor covered (porch, pergola). */
  outdoor_covered: { mcStart: 8, mcEnd: 18 },
} as const;

/** Preset name type. */
export type SeasonalPreset = keyof typeof SEASONAL_PRESETS;

/**
 * Compute wood movement (expansion or contraction) for a given board width.
 *
 * @param input - Board width, species/coefficient, start and end moisture content
 * @returns Movement result with dimensional change and gap recommendation
 * @throws RangeError if width ≤ 0, MC values < 0 or > 30, or coefficient ≤ 0
 */
export function calculateWoodMovement(input: WoodMovementInput): WoodMovementResult {
  const { widthMm, species, mcStart, mcEnd } = input;

  if (widthMm <= 0) {
    throw new RangeError(`calculateWoodMovement: widthMm must be > 0, got ${widthMm}`);
  }
  if (mcStart < 0 || mcStart > 30) {
    throw new RangeError(`calculateWoodMovement: mcStart must be 0–30, got ${mcStart}`);
  }
  if (mcEnd < 0 || mcEnd > 30) {
    throw new RangeError(`calculateWoodMovement: mcEnd must be 0–30, got ${mcEnd}`);
  }

  const coefficient = typeof species === 'number' ? species : SPECIES_COEFFICIENTS[species];

  if (coefficient <= 0) {
    throw new RangeError(`calculateWoodMovement: coefficient must be > 0, got ${coefficient}`);
  }

  const mcDelta = mcEnd - mcStart;
  const changeMm = widthMm * coefficient * mcDelta;
  const absoluteChangeMm = Math.abs(changeMm);
  const finalWidthMm = widthMm + changeMm;
  const changePercent = (changeMm / widthMm) * 100;

  let direction: WoodMovementResult['direction'];
  if (mcDelta > 0) {
    direction = 'expansion';
  } else if (mcDelta < 0) {
    direction = 'contraction';
  } else {
    direction = 'none';
  }

  // Gap recommendation: half the absolute change per side, with 0.5mm minimum if any movement
  const gapPerSideMm = absoluteChangeMm > 0 ? Math.max(0.5, Math.round((absoluteChangeMm / 2) * 100) / 100) : 0;

  return {
    changeMm: Math.round(changeMm * 1000) / 1000,
    absoluteChangeMm: Math.round(absoluteChangeMm * 1000) / 1000,
    finalWidthMm: Math.round(finalWidthMm * 1000) / 1000,
    changePercent: Math.round(changePercent * 1000) / 1000,
    direction,
    gapPerSideMm,
  };
}

/**
 * Calculate movement for multiple boards (e.g., a glued-up panel).
 *
 * @param boards - Array of board widths in mm
 * @param species - Species name or custom coefficient
 * @param mcStart - Initial moisture content %
 * @param mcEnd - Final moisture content %
 * @returns Movement result for the total panel width
 * @throws RangeError if boards array is empty
 */
export function calculatePanelMovement(
  boards: readonly number[],
  species: WoodSpecies | number,
  mcStart: number,
  mcEnd: number,
): WoodMovementResult {
  if (boards.length === 0) {
    throw new RangeError('calculatePanelMovement: boards array must not be empty');
  }

  const totalWidth = boards.reduce((sum, w) => sum + w, 0);
  return calculateWoodMovement({
    widthMm: totalWidth,
    species,
    mcStart,
    mcEnd,
  });
}

/**
 * Get the movement for a seasonal preset.
 *
 * @param widthMm - Board width in mm
 * @param species - Species name or custom coefficient
 * @param preset - Seasonal environment preset name
 * @returns Movement result for the seasonal swing
 */
export function seasonalMovement(
  widthMm: number,
  species: WoodSpecies | number,
  preset: SeasonalPreset,
): WoodMovementResult {
  const { mcStart, mcEnd } = SEASONAL_PRESETS[preset];
  return calculateWoodMovement({ widthMm, species, mcStart, mcEnd });
}
