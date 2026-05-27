/**
 * Bandsaw Blade Speed Calculator — Sprint 213
 *
 * Computes optimal blade velocity (SFPM), feed rate, and tooth
 * selection for a given material and blade/wheel configuration.
 */

/** Workpiece material categories affecting recommended SFPM. */
export type BandsawMaterial = 'softwood' | 'hardwood' | 'plywood' | 'aluminum' | 'plastic';

/** Bandsaw blade tooth type. */
export type BladeToothType = 'regular' | 'skip' | 'hook';

/** Input for bandsaw blade speed calculation. */
export interface BandsawSpeedInput {
  /** Wheel diameter (mm). */
  readonly wheelDiameterMm: number;
  /** Motor / wheel RPM. */
  readonly wheelRpm: number;
  /** Workpiece material. */
  readonly material: BandsawMaterial;
  /** Workpiece thickness at the cut (mm). */
  readonly cutThicknessMm: number;
  /** Blade width (mm, default 12). */
  readonly bladeWidthMm?: number;
  /** Blade tooth type (default 'regular'). */
  readonly toothType?: BladeToothType;
}

/** Bandsaw speed calculation result. */
export interface BandsawSpeedResult {
  /** Blade speed in surface feet per minute (SFPM). */
  readonly bladeSfpm: number;
  /** Blade speed in meters per minute (m/min). */
  readonly bladeMetersPerMin: number;
  /** Recommended SFPM range for the material [min, max]. */
  readonly recommendedSfpmRange: readonly [number, number];
  /** Whether current speed is within recommended range. */
  readonly isOptimal: boolean;
  /** Recommended teeth per inch (TPI) for the cut thickness. */
  readonly recommendedTpi: number;
  /** Suggested feed rate (mm/s). */
  readonly feedRateMmPerSec: number;
}

/**
 * Recommended SFPM ranges by material.
 */
const SFPM_RANGES: Record<BandsawMaterial, readonly [number, number]> = {
  softwood: [3000, 5000],
  hardwood: [2500, 4000],
  plywood: [2500, 4000],
  aluminum: [800, 1500],
  plastic: [1500, 3000],
} as const;

/**
 * Feed rate factor (mm/s per 1000 SFPM) by material.
 */
const FEED_FACTOR: Record<BandsawMaterial, number> = {
  softwood: 8,
  hardwood: 5,
  plywood: 6,
  aluminum: 2,
  plastic: 6,
} as const;

/**
 * Calculate bandsaw blade speed and recommendations.
 *
 * @param input - Wheel, blade, and material parameters
 * @returns Speed metrics and recommendations
 * @throws RangeError for invalid inputs
 */
export function calculateBandsawSpeed(input: BandsawSpeedInput): BandsawSpeedResult {
  const { wheelDiameterMm, wheelRpm, material, cutThicknessMm } = input;

  if (wheelDiameterMm <= 0) {
    throw new RangeError(`calculateBandsawSpeed: wheelDiameterMm must be > 0, got ${wheelDiameterMm}`);
  }
  if (wheelRpm <= 0) {
    throw new RangeError(`calculateBandsawSpeed: wheelRpm must be > 0, got ${wheelRpm}`);
  }
  if (cutThicknessMm <= 0) {
    throw new RangeError(`calculateBandsawSpeed: cutThicknessMm must be > 0, got ${cutThicknessMm}`);
  }

  // Blade speed = π × wheel diameter × RPM
  const circumferenceMm = Math.PI * wheelDiameterMm;
  const bladeMetersPerMin = round2((circumferenceMm * wheelRpm) / 1000);

  // Convert to SFPM (1 m = 3.28084 ft)
  const bladeSfpm = Math.round(bladeMetersPerMin * 3.28084);

  const recommendedSfpmRange = SFPM_RANGES[material];
  const isOptimal = bladeSfpm >= recommendedSfpmRange[0] && bladeSfpm <= recommendedSfpmRange[1];

  // TPI recommendation: 3-in-the-cut rule → cutThickness(inches) / 3
  // But minimum 3 teeth in the material: TPI = 3 / (cutThickness in inches)
  const cutThicknessInches = cutThicknessMm / 25.4;
  let recommendedTpi: number;
  if (cutThicknessInches <= 0.5) {
    recommendedTpi = 14;
  } else if (cutThicknessInches <= 1) {
    recommendedTpi = 10;
  } else if (cutThicknessInches <= 2) {
    recommendedTpi = 6;
  } else if (cutThicknessInches <= 4) {
    recommendedTpi = 4;
  } else {
    recommendedTpi = 3;
  }

  // Feed rate
  const feedFactor = FEED_FACTOR[material];
  const feedRateMmPerSec = round2((bladeSfpm / 1000) * feedFactor);

  return {
    bladeSfpm,
    bladeMetersPerMin,
    recommendedSfpmRange,
    isOptimal,
    recommendedTpi,
    feedRateMmPerSec,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
