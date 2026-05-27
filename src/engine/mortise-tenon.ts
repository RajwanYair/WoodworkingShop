/**
 * Mortise & Tenon Joint Calculator — Sprint 205
 *
 * Computes mortise and tenon dimensions based on stock dimensions,
 * rule-of-thumb proportions, and joint type. Supports through, blind,
 * and wedged tenon configurations.
 */

/** Mortise & tenon joint type. */
export type MortiseTenonType = 'through' | 'blind' | 'wedged' | 'stub';

/** Input for mortise & tenon calculation. */
export interface MortiseTenonInput {
  /** Stock thickness at the joint (mm). */
  readonly stockThicknessMm: number;
  /** Stock width / rail height (mm). */
  readonly stockWidthMm: number;
  /** Joint type. */
  readonly jointType: MortiseTenonType;
  /** Tenon thickness as fraction of stock thickness (0.25–0.5, default 1/3). */
  readonly tenonThicknessRatio?: number;
  /** Tenon length as fraction of mortise piece width (default depends on type). */
  readonly tenonLengthRatio?: number;
  /** Shoulder setback from edges (mm, default 3). */
  readonly shoulderSetbackMm?: number;
  /** Haunch depth for haunched tenons (mm, 0 = no haunch). */
  readonly haunchDepthMm?: number;
}

/** Result of mortise & tenon calculation. */
export interface MortiseTenonResult {
  /** Tenon thickness (mm). */
  readonly tenonThicknessMm: number;
  /** Tenon width (mm). */
  readonly tenonWidthMm: number;
  /** Tenon length / depth (mm). */
  readonly tenonLengthMm: number;
  /** Mortise width (same as tenon thickness, mm). */
  readonly mortiseWidthMm: number;
  /** Mortise height (same as tenon width, mm). */
  readonly mortiseHeightMm: number;
  /** Mortise depth (same as tenon length, mm). */
  readonly mortiseDepthMm: number;
  /** Offset of mortise from face (mm). */
  readonly mortiseOffsetMm: number;
  /** Joint type. */
  readonly jointType: MortiseTenonType;
  /** Whether a haunch is included. */
  readonly hasHaunch: boolean;
  /** Haunch depth (mm). */
  readonly haunchDepthMm: number;
  /** Recommended chisel width for mortise (nearest standard, mm). */
  readonly recommendedChiselMm: number;
  /** Glue surface area (mm²). */
  readonly glueSurfaceAreaMm2: number;
}

/** Standard chisel widths (mm). */
const STANDARD_CHISELS = [3, 4, 5, 6, 8, 10, 12, 15, 18, 20, 22, 25, 30, 32, 38] as const;

/**
 * Calculate mortise & tenon joint dimensions.
 *
 * @param input - Stock dimensions and joint parameters
 * @returns Complete joint dimensions and recommendations
 * @throws RangeError for invalid parameters
 */
export function calculateMortiseTenon(input: MortiseTenonInput): MortiseTenonResult {
  const {
    stockThicknessMm,
    stockWidthMm,
    jointType,
    tenonThicknessRatio = 1 / 3,
    shoulderSetbackMm = 3,
    haunchDepthMm = 0,
  } = input;

  if (stockThicknessMm <= 0) {
    throw new RangeError(`calculateMortiseTenon: stockThicknessMm must be > 0, got ${stockThicknessMm}`);
  }
  if (stockWidthMm <= 0) {
    throw new RangeError(`calculateMortiseTenon: stockWidthMm must be > 0, got ${stockWidthMm}`);
  }
  if (tenonThicknessRatio < 0.2 || tenonThicknessRatio > 0.6) {
    throw new RangeError(`calculateMortiseTenon: tenonThicknessRatio must be 0.2–0.6, got ${tenonThicknessRatio}`);
  }
  if (shoulderSetbackMm < 0) {
    throw new RangeError(`calculateMortiseTenon: shoulderSetbackMm must be >= 0, got ${shoulderSetbackMm}`);
  }
  if (haunchDepthMm < 0) {
    throw new RangeError(`calculateMortiseTenon: haunchDepthMm must be >= 0, got ${haunchDepthMm}`);
  }

  // Tenon thickness = fraction of stock thickness
  const tenonThicknessMm = round1(stockThicknessMm * tenonThicknessRatio);

  // Tenon width = stock width minus shoulder setbacks (top and bottom)
  const tenonWidthMm = round1(stockWidthMm - 2 * shoulderSetbackMm);
  if (tenonWidthMm <= 0) {
    throw new RangeError(`calculateMortiseTenon: tenon width is <= 0 (stock too narrow for shoulder setback)`);
  }

  // Tenon length depends on joint type and optional ratio
  const defaultLengthRatio = getDefaultLengthRatio(jointType);
  const tenonLengthRatio = input.tenonLengthRatio ?? defaultLengthRatio;
  if (tenonLengthRatio <= 0 || tenonLengthRatio > 1) {
    throw new RangeError(`calculateMortiseTenon: tenonLengthRatio must be 0–1, got ${tenonLengthRatio}`);
  }

  // For through/wedged tenons, length = full mortise piece thickness
  // For blind/stub, length = ratio × stock width
  const tenonLengthMm =
    jointType === 'through' || jointType === 'wedged'
      ? round1(stockThicknessMm)
      : round1(stockWidthMm * tenonLengthRatio);

  // Mortise offset — center the tenon in the stock thickness
  const mortiseOffsetMm = round1((stockThicknessMm - tenonThicknessMm) / 2);

  // Recommended chisel
  const recommendedChiselMm = findNearestChisel(tenonThicknessMm);

  // Glue surface area: 2 × (tenonLength × tenonWidth) + (tenonLength × tenonThickness × 2)
  // = cheeks + edges
  const glueSurfaceAreaMm2 = round1(2 * tenonLengthMm * tenonWidthMm + 2 * tenonLengthMm * tenonThicknessMm);

  return {
    tenonThicknessMm,
    tenonWidthMm,
    tenonLengthMm,
    mortiseWidthMm: tenonThicknessMm,
    mortiseHeightMm: tenonWidthMm,
    mortiseDepthMm: tenonLengthMm,
    mortiseOffsetMm,
    jointType,
    hasHaunch: haunchDepthMm > 0,
    haunchDepthMm,
    recommendedChiselMm,
    glueSurfaceAreaMm2,
  };
}

/**
 * Find the nearest standard chisel width that matches or is slightly smaller.
 *
 * @param targetMm - Target width (mm)
 * @returns Nearest standard chisel width
 */
export function findNearestChisel(targetMm: number): number {
  if (targetMm <= 0) {
    throw new RangeError(`findNearestChisel: targetMm must be > 0, got ${targetMm}`);
  }
  let best = STANDARD_CHISELS[0];
  for (const w of STANDARD_CHISELS) {
    if (w <= targetMm) {
      best = w;
    } else {
      break;
    }
  }
  return best;
}

/** Default tenon length ratio by joint type. */
function getDefaultLengthRatio(type: MortiseTenonType): number {
  switch (type) {
    case 'through':
      return 1;
    case 'blind':
      return 0.6;
    case 'wedged':
      return 1;
    case 'stub':
      return 0.33;
  }
}

/** Round to 1 decimal place. */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
