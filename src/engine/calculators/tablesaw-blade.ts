/**
 * Tablesaw Blade Height Calculator — Sprint 214
 *
 * Determines optimal blade height above the workpiece, kerf waste,
 * and maximum cut depth for dado/groove operations.
 */

/** Type of tablesaw cut. */
export type TablesawCutType = 'through' | 'dado' | 'rabbet' | 'groove';

/** Input for tablesaw blade height calculation. */
export interface TablesawBladeInput {
  /** Blade diameter (mm). */
  readonly bladeDiameterMm: number;
  /** Blade kerf width (mm). */
  readonly kerfMm: number;
  /** Workpiece thickness (mm). */
  readonly workpieceThicknessMm: number;
  /** Type of cut. */
  readonly cutType: TablesawCutType;
  /** For dado/rabbet/groove: desired depth of cut (mm). */
  readonly dadoDepthMm?: number;
  /** Arbor-to-table distance (mm, default blade radius). */
  readonly arborHeightMm?: number;
}

/** Tablesaw blade height result. */
export interface TablesawBladeResult {
  /** Recommended blade height above table surface (mm). */
  readonly bladeHeightMm: number;
  /** Maximum possible cut depth with this blade (mm). */
  readonly maxCutDepthMm: number;
  /** Amount of blade exposed above workpiece (mm). */
  readonly bladeExposureMm: number;
  /** Kerf waste width (mm). */
  readonly kerfWasteMm: number;
  /** Whether the cut is achievable with this blade. */
  readonly isFeasible: boolean;
  /** Safety margin — blade above workpiece for through cuts (mm). */
  readonly safetyMarginMm: number;
}

/**
 * Calculate optimal tablesaw blade height.
 *
 * For through cuts: blade height = workpiece thickness + safety margin (≈6 mm / ¼").
 * For dado/rabbet/groove: blade height = dado depth exactly.
 *
 * @param input - Blade and workpiece parameters
 * @returns Height recommendation and feasibility
 * @throws RangeError for invalid inputs
 */
export function calculateTablesawBladeHeight(input: TablesawBladeInput): TablesawBladeResult {
  const { bladeDiameterMm, kerfMm, workpieceThicknessMm, cutType, dadoDepthMm } = input;

  if (bladeDiameterMm <= 0) {
    throw new RangeError(`calculateTablesawBladeHeight: bladeDiameterMm must be > 0, got ${bladeDiameterMm}`);
  }
  if (kerfMm <= 0) {
    throw new RangeError(`calculateTablesawBladeHeight: kerfMm must be > 0, got ${kerfMm}`);
  }
  if (workpieceThicknessMm <= 0) {
    throw new RangeError(`calculateTablesawBladeHeight: workpieceThicknessMm must be > 0, got ${workpieceThicknessMm}`);
  }

  const bladeRadius = bladeDiameterMm / 2;
  // Default arbor height = blade radius (standard tablesaw geometry)
  const arborHeightMm = input.arborHeightMm ?? bladeRadius;
  // Max cut depth = how far above table the top of the blade reaches minus table level
  const maxCutDepthMm = round2(arborHeightMm);

  const SAFETY_MARGIN_MM = 6; // ~¼ inch above workpiece

  let bladeHeightMm: number;
  let bladeExposureMm: number;
  let safetyMarginMm: number;

  if (cutType === 'through') {
    bladeHeightMm = round2(workpieceThicknessMm + SAFETY_MARGIN_MM);
    bladeExposureMm = SAFETY_MARGIN_MM;
    safetyMarginMm = SAFETY_MARGIN_MM;
  } else {
    // dado, rabbet, groove
    const depth = dadoDepthMm ?? workpieceThicknessMm / 2;
    if (depth <= 0) {
      throw new RangeError(`calculateTablesawBladeHeight: dadoDepthMm must be > 0, got ${depth}`);
    }
    if (depth >= workpieceThicknessMm) {
      throw new RangeError(`calculateTablesawBladeHeight: dadoDepthMm must be < workpieceThicknessMm`);
    }
    bladeHeightMm = round2(depth);
    bladeExposureMm = 0; // blade doesn't go through
    safetyMarginMm = 0;
  }

  const isFeasible = bladeHeightMm <= maxCutDepthMm;

  return {
    bladeHeightMm,
    maxCutDepthMm,
    bladeExposureMm,
    kerfWasteMm: kerfMm,
    isFeasible,
    safetyMarginMm,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
