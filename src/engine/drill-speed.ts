/**
 * Drill Press Speed Calculator — Sprint 198
 *
 * Computes optimal drill press RPM for various bit types, diameters,
 * and materials. Based on surface feet per minute (SFM) charts
 * for woodworking applications.
 */

/** Drill bit type. */
export type DrillBitType = 'twist' | 'brad_point' | 'forstner' | 'spade' | 'hole_saw' | 'countersink';

/** Material being drilled. */
export type DrillMaterial = 'softwood' | 'hardwood' | 'plywood' | 'mdf' | 'acrylic' | 'aluminum';

/**
 * Recommended surface feet per minute (SFM) by material.
 * Conservative values for woodworking drill presses.
 */
export const MATERIAL_SFM: Record<DrillMaterial, number> = {
  softwood: 400,
  hardwood: 250,
  plywood: 300,
  mdf: 350,
  acrylic: 150,
  aluminum: 200,
} as const;

/**
 * Speed reduction factor by bit type.
 * Larger/more aggressive bits need slower speeds.
 */
export const BIT_TYPE_FACTOR: Record<DrillBitType, number> = {
  twist: 1.0,
  brad_point: 1.0,
  forstner: 0.6,
  spade: 0.7,
  hole_saw: 0.4,
  countersink: 0.9,
} as const;

/** Input for drill press speed calculation. */
export interface DrillSpeedInput {
  /** Bit diameter in mm. */
  readonly bitDiameterMm: number;
  /** Bit type. */
  readonly bitType: DrillBitType;
  /** Material being drilled. */
  readonly material: DrillMaterial;
  /** Drill depth in mm (for feed rate calculation). */
  readonly depthMm?: number;
}

/** Drill press speed calculation result. */
export interface DrillSpeedResult {
  /** Recommended RPM. */
  readonly rpm: number;
  /** Surface feet per minute used. */
  readonly sfm: number;
  /** Feed rate in mm per revolution (if depth provided). */
  readonly feedMmPerRev: number;
  /** Estimated drilling time in seconds (if depth provided). */
  readonly drillTimeSec: number;
  /** Speed setting label (low/medium/high). */
  readonly speedSetting: 'low' | 'medium' | 'high';
  /** Minimum RPM for quality cut. */
  readonly minRpm: number;
  /** Maximum RPM before burning. */
  readonly maxRpm: number;
}

/**
 * Calculate optimal drill press RPM.
 *
 * Formula: RPM = (SFM × 12) / (π × diameter_inches) × bit_factor
 *
 * @param input - Drill parameters
 * @returns Optimal RPM and related settings
 * @throws RangeError for invalid bit diameter
 */
export function calculateDrillSpeed(input: DrillSpeedInput): DrillSpeedResult {
  const { bitDiameterMm, bitType, material, depthMm } = input;

  if (bitDiameterMm <= 0) {
    throw new RangeError(`calculateDrillSpeed: bitDiameterMm must be > 0, got ${bitDiameterMm}`);
  }
  if (depthMm !== undefined && depthMm <= 0) {
    throw new RangeError(`calculateDrillSpeed: depthMm must be > 0, got ${depthMm}`);
  }

  const diameterInches = bitDiameterMm / 25.4;
  const sfm = MATERIAL_SFM[material];
  const bitFactor = BIT_TYPE_FACTOR[bitType];

  // RPM = (SFM × 12) / (π × D) × factor
  const rawRpm = ((sfm * 12) / (Math.PI * diameterInches)) * bitFactor;
  const rpm = Math.round(rawRpm / 50) * 50; // Round to nearest 50

  // Speed range: ±30%
  const minRpm = Math.round((rpm * 0.7) / 50) * 50;
  const maxRpm = Math.round((rpm * 1.3) / 50) * 50;

  // Feed rate: depends on material and diameter
  const baseFeed = material === 'hardwood' || material === 'acrylic' ? 0.05 : 0.1;
  const feedMmPerRev = Math.round(baseFeed * Math.sqrt(bitDiameterMm) * 100) / 100;

  // Drill time estimate
  let drillTimeSec = 0;
  if (depthMm !== undefined && rpm > 0) {
    const feedMmPerMin = feedMmPerRev * rpm;
    drillTimeSec = Math.round((depthMm / feedMmPerMin) * 60 * 10) / 10;
  }

  // Speed setting label
  let speedSetting: 'low' | 'medium' | 'high';
  if (rpm <= 1000) {
    speedSetting = 'low';
  } else if (rpm <= 2500) {
    speedSetting = 'medium';
  } else {
    speedSetting = 'high';
  }

  return {
    rpm,
    sfm,
    feedMmPerRev,
    drillTimeSec,
    speedSetting,
    minRpm,
    maxRpm,
  };
}

/**
 * Get recommended maximum bit diameter for a given RPM.
 * Useful when drill press has fixed speed settings.
 *
 * @param rpm - Available RPM setting
 * @param material - Material being drilled
 * @param bitType - Bit type
 * @returns Maximum recommended bit diameter in mm
 */
export function maxBitDiameter(rpm: number, material: DrillMaterial, bitType: DrillBitType): number {
  if (rpm <= 0) {
    throw new RangeError(`maxBitDiameter: rpm must be > 0, got ${rpm}`);
  }

  const sfm = MATERIAL_SFM[material];
  const bitFactor = BIT_TYPE_FACTOR[bitType];

  // Solve for D: D_inches = (SFM × 12 × factor) / (π × RPM)
  const diameterInches = (sfm * 12 * bitFactor) / (Math.PI * rpm);
  return Math.round(diameterInches * 25.4 * 10) / 10;
}
