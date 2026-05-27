/**
 * Veneer Calculator — Sprint 196
 *
 * Computes veneer sheet requirements, grain matching layout,
 * and adhesive coverage for veneering panels. Supports book-match,
 * slip-match, and random matching patterns.
 */

/** Veneer matching pattern. */
export type VeneerMatchPattern = 'book' | 'slip' | 'random';

/** Veneer thickness standard in mm. */
export const VENEER_THICKNESSES = [0.5, 0.6, 0.8, 1.0, 1.5, 2.0] as const;

/** Standard veneer sheet size. */
export interface VeneerSheetSize {
  /** Sheet width in mm. */
  readonly widthMm: number;
  /** Sheet length in mm. */
  readonly lengthMm: number;
}

/** Common commercial veneer sheet sizes. */
export const STANDARD_VENEER_SHEETS: readonly VeneerSheetSize[] = [
  { widthMm: 200, lengthMm: 2500 },
  { widthMm: 300, lengthMm: 2500 },
  { widthMm: 600, lengthMm: 2500 },
  { widthMm: 300, lengthMm: 3100 },
  { widthMm: 600, lengthMm: 3100 },
] as const;

/** Input for veneer calculation. */
export interface VeneerInput {
  /** Panel width to veneer in mm. */
  readonly panelWidthMm: number;
  /** Panel length to veneer in mm. */
  readonly panelLengthMm: number;
  /** Number of panels to veneer. */
  readonly panelCount: number;
  /** Whether to veneer both faces. */
  readonly bothFaces: boolean;
  /** Matching pattern. */
  readonly matchPattern: VeneerMatchPattern;
  /** Veneer sheet width in mm. */
  readonly sheetWidthMm: number;
  /** Veneer sheet length in mm. */
  readonly sheetLengthMm: number;
  /** Overlap/trim allowance per edge in mm (default: 10). */
  readonly trimAllowanceMm?: number;
}

/** Result for veneer calculation. */
export interface VeneerResult {
  /** Number of veneer sheets required. */
  readonly sheetsRequired: number;
  /** Number of strips per panel (for matched patterns). */
  readonly stripsPerPanel: number;
  /** Strip width in mm. */
  readonly stripWidthMm: number;
  /** Total veneer area needed in m². */
  readonly totalAreaM2: number;
  /** Waste percentage. */
  readonly wastePercent: number;
  /** Adhesive coverage area in m² (panel area × faces). */
  readonly adhesiveAreaM2: number;
  /** Adhesive volume in ml (assuming 150 g/m² spread rate). */
  readonly adhesiveMl: number;
  /** Press time in minutes (PVA contact cement). */
  readonly pressTimeMin: number;
}

/**
 * Calculate veneer requirements for a set of panels.
 *
 * @param input - Veneer job parameters
 * @returns Sheet count, strip layout, adhesive requirements
 * @throws RangeError for invalid dimensions or counts
 */
export function calculateVeneer(input: VeneerInput): VeneerResult {
  const {
    panelWidthMm,
    panelLengthMm,
    panelCount,
    bothFaces,
    matchPattern,
    sheetWidthMm,
    sheetLengthMm,
    trimAllowanceMm = 10,
  } = input;

  if (panelWidthMm <= 0) {
    throw new RangeError(`calculateVeneer: panelWidthMm must be > 0, got ${panelWidthMm}`);
  }
  if (panelLengthMm <= 0) {
    throw new RangeError(`calculateVeneer: panelLengthMm must be > 0, got ${panelLengthMm}`);
  }
  if (panelCount <= 0) {
    throw new RangeError(`calculateVeneer: panelCount must be > 0, got ${panelCount}`);
  }
  if (sheetWidthMm <= 0) {
    throw new RangeError(`calculateVeneer: sheetWidthMm must be > 0, got ${sheetWidthMm}`);
  }
  if (sheetLengthMm <= 0) {
    throw new RangeError(`calculateVeneer: sheetLengthMm must be > 0, got ${sheetLengthMm}`);
  }

  const faces = bothFaces ? 2 : 1;
  const totalPanelFaces = panelCount * faces;

  // Panel dimensions with trim allowance
  const panelW = panelWidthMm + 2 * trimAllowanceMm;
  const panelL = panelLengthMm + 2 * trimAllowanceMm;

  // Strips per panel (veneer runs along length, strips span width)
  const usableSheetWidth = sheetWidthMm;
  const stripsPerPanel = Math.ceil(panelW / usableSheetWidth);
  const stripWidthMm = matchPattern === 'random' ? usableSheetWidth : Math.round((panelW / stripsPerPanel) * 100) / 100;

  // How many panels fit lengthwise per sheet
  const panelsPerSheetLength = Math.floor(sheetLengthMm / panelL);
  const panelsPerSheet = Math.max(1, panelsPerSheetLength);

  // Total strips needed
  const totalStrips = stripsPerPanel * totalPanelFaces;

  // For book/slip match, consecutive strips come from same sheet
  const stripsPerSheet = matchPattern === 'book' ? 2 : 1;

  // Sheets required
  const sheetsForStrips = Math.ceil(totalStrips / (stripsPerSheet * panelsPerSheet));
  const sheetsRequired = Math.max(1, sheetsForStrips);

  // Area calculations
  const totalAreaNeeded = (panelW * panelL * totalPanelFaces) / 1000000;
  const sheetArea = (sheetWidthMm * sheetLengthMm) / 1000000;
  const totalSheetArea = sheetsRequired * sheetArea;
  const wastePercent =
    totalSheetArea > 0 ? Math.round(((totalSheetArea - totalAreaNeeded) / totalSheetArea) * 10000) / 100 : 0;

  // Adhesive: based on actual panel area (no trim)
  const adhesiveAreaM2 = Math.round(((panelWidthMm * panelLengthMm * totalPanelFaces) / 1000000) * 1000) / 1000;
  // 150 g/m² spread rate, density ~1.05 g/ml
  const adhesiveMl = Math.round((adhesiveAreaM2 * 150) / 1.05);

  // Press time: 45 min for vacuum press, 30 for caul/clamp
  const pressTimeMin = 45;

  return {
    sheetsRequired,
    stripsPerPanel,
    stripWidthMm,
    totalAreaM2: Math.round(totalAreaNeeded * 1000) / 1000,
    wastePercent: Math.max(0, wastePercent),
    adhesiveAreaM2,
    adhesiveMl,
    pressTimeMin,
  };
}

/**
 * Find the best standard veneer sheet size for a given panel dimension.
 * Selects the smallest sheet that can cover the panel length.
 *
 * @param panelLengthMm - Panel length in mm
 * @returns Best matching standard sheet, or undefined if none fit
 */
export function bestSheetForPanel(panelLengthMm: number): VeneerSheetSize | undefined {
  if (panelLengthMm <= 0) {
    throw new RangeError(`bestSheetForPanel: panelLengthMm must be > 0, got ${panelLengthMm}`);
  }
  return STANDARD_VENEER_SHEETS.find((s) => s.lengthMm >= panelLengthMm);
}
