/**
 * Toolpath Feed Rate Calculator — Sprint 191
 *
 * Computes CNC feed rate, spindle speed, and chip load for
 * a given cutter geometry + material combination. Essential
 * for generating safe, efficient G-code without burning or
 * overloading the spindle.
 */

/** Material hardness categories for feed/speed lookup. */
export const MATERIAL_HARDNESS = {
  softwood: { chipLoadRange: [0.1, 0.2], speedFactor: 1.0 },
  hardwood: { chipLoadRange: [0.08, 0.15], speedFactor: 0.85 },
  plywood: { chipLoadRange: [0.12, 0.22], speedFactor: 0.95 },
  mdf: { chipLoadRange: [0.15, 0.25], speedFactor: 1.1 },
  melamine: { chipLoadRange: [0.08, 0.14], speedFactor: 0.8 },
  acrylic: { chipLoadRange: [0.05, 0.1], speedFactor: 0.6 },
  aluminium: { chipLoadRange: [0.03, 0.08], speedFactor: 0.4 },
} as const;

/** Material hardness type. */
export type MaterialHardness = keyof typeof MATERIAL_HARDNESS;

/** Cutter type affects recommended surface speed. */
export const CUTTER_TYPES = {
  straight: { surfaceSpeedMPerMin: 300 },
  spiral_upcut: { surfaceSpeedMPerMin: 350 },
  spiral_downcut: { surfaceSpeedMPerMin: 350 },
  compression: { surfaceSpeedMPerMin: 320 },
  ball_nose: { surfaceSpeedMPerMin: 280 },
  v_bit: { surfaceSpeedMPerMin: 250 },
} as const;

/** Cutter type name. */
export type CutterType = keyof typeof CUTTER_TYPES;

/** Input parameters for feed rate calculation. */
export interface FeedRateInput {
  /** Cutter diameter in mm. */
  readonly cutterDiameterMm: number;
  /** Number of flutes on the cutter. */
  readonly flutes: number;
  /** Material being cut. */
  readonly material: MaterialHardness;
  /** Cutter type. */
  readonly cutterType: CutterType;
  /** Depth of cut in mm. */
  readonly depthOfCutMm: number;
  /** Stepover (width of cut) in mm. Typically 40–80% of cutter diameter. */
  readonly stepoverMm: number;
  /** Maximum spindle RPM of the machine. */
  readonly maxSpindleRpm: number;
}

/** Calculated feed rate parameters. */
export interface FeedRateResult {
  /** Recommended spindle speed in RPM. */
  readonly spindleRpm: number;
  /** Calculated feed rate in mm/min. */
  readonly feedRateMmPerMin: number;
  /** Actual chip load per tooth in mm. */
  readonly chipLoadMm: number;
  /** Plunge feed rate in mm/min (typically 50% of lateral). */
  readonly plungeRateMmPerMin: number;
  /** Surface speed in m/min. */
  readonly surfaceSpeedMPerMin: number;
  /** Material removal rate in cm³/min. */
  readonly mrrCm3PerMin: number;
  /** Whether the spindle RPM was clamped to maxSpindleRpm. */
  readonly rpmClamped: boolean;
  /** Recommended chip load range [min, max] for the material. */
  readonly chipLoadRange: readonly [number, number];
}

/**
 * Calculate optimal CNC feed rate and spindle speed.
 *
 * @param input - Cutter geometry, material, and machine limits
 * @returns Calculated feed parameters with MRR and safety flags
 * @throws RangeError if cutter diameter ≤ 0, flutes < 1, depth/stepover ≤ 0, or maxRPM ≤ 0
 */
export function calculateFeedRate(input: FeedRateInput): FeedRateResult {
  const { cutterDiameterMm, flutes, material, cutterType, depthOfCutMm, stepoverMm, maxSpindleRpm } = input;

  if (cutterDiameterMm <= 0) {
    throw new RangeError(`calculateFeedRate: cutterDiameterMm must be > 0, got ${cutterDiameterMm}`);
  }
  if (flutes < 1 || !Number.isInteger(flutes)) {
    throw new RangeError(`calculateFeedRate: flutes must be integer ≥ 1, got ${flutes}`);
  }
  if (depthOfCutMm <= 0) {
    throw new RangeError(`calculateFeedRate: depthOfCutMm must be > 0, got ${depthOfCutMm}`);
  }
  if (stepoverMm <= 0) {
    throw new RangeError(`calculateFeedRate: stepoverMm must be > 0, got ${stepoverMm}`);
  }
  if (maxSpindleRpm <= 0) {
    throw new RangeError(`calculateFeedRate: maxSpindleRpm must be > 0, got ${maxSpindleRpm}`);
  }

  const materialData = MATERIAL_HARDNESS[material];
  const cutterData = CUTTER_TYPES[cutterType];

  // Surface speed adjusted for material
  const adjustedSurfaceSpeed = cutterData.surfaceSpeedMPerMin * materialData.speedFactor;

  // RPM = (Surface Speed × 1000) / (π × diameter)
  const idealRpm = (adjustedSurfaceSpeed * 1000) / (Math.PI * cutterDiameterMm);
  const rpmClamped = idealRpm > maxSpindleRpm;
  const spindleRpm = Math.min(Math.round(idealRpm), maxSpindleRpm);

  // Chip load — use middle of range for the material
  const [clMin, clMax] = materialData.chipLoadRange;
  const chipLoadMm = (clMin + clMax) / 2;

  // Feed rate = RPM × flutes × chip load
  const feedRateMmPerMin = Math.round(spindleRpm * flutes * chipLoadMm);

  // Plunge rate = 50% of feed rate
  const plungeRateMmPerMin = Math.round(feedRateMmPerMin * 0.5);

  // Actual surface speed at the clamped RPM
  const surfaceSpeedMPerMin = (Math.PI * cutterDiameterMm * spindleRpm) / 1000;

  // Material removal rate (cm³/min) = feed × depth × stepover / 1000
  const mrrCm3PerMin = (feedRateMmPerMin * depthOfCutMm * stepoverMm) / 1000;

  return {
    spindleRpm,
    feedRateMmPerMin,
    chipLoadMm,
    plungeRateMmPerMin,
    surfaceSpeedMPerMin: Math.round(surfaceSpeedMPerMin * 10) / 10,
    mrrCm3PerMin: Math.round(mrrCm3PerMin * 100) / 100,
    rpmClamped,
    chipLoadRange: materialData.chipLoadRange,
  };
}

/** Depth of cut recommendation input. */
export interface DepthRecommendationInput {
  /** Cutter diameter in mm. */
  readonly cutterDiameterMm: number;
  /** Material being cut. */
  readonly material: MaterialHardness;
  /** Total desired depth in mm. */
  readonly totalDepthMm: number;
}

/** Depth of cut recommendation result. */
export interface DepthRecommendation {
  /** Recommended depth per pass in mm. */
  readonly depthPerPassMm: number;
  /** Number of passes required. */
  readonly numberOfPasses: number;
  /** Final pass depth (may be smaller). */
  readonly finalPassDepthMm: number;
}

/**
 * Recommend depth per pass and number of passes.
 *
 * @param input - Cutter diameter, material, and total depth
 * @returns Depth per pass recommendation
 * @throws RangeError if cutterDiameter ≤ 0 or totalDepth ≤ 0
 */
export function recommendDepthPerPass(input: DepthRecommendationInput): DepthRecommendation {
  const { cutterDiameterMm, material, totalDepthMm } = input;

  if (cutterDiameterMm <= 0) {
    throw new RangeError(`recommendDepthPerPass: cutterDiameterMm must be > 0, got ${cutterDiameterMm}`);
  }
  if (totalDepthMm <= 0) {
    throw new RangeError(`recommendDepthPerPass: totalDepthMm must be > 0, got ${totalDepthMm}`);
  }

  // Max depth factor by material (proportion of cutter diameter)
  const depthFactors: Record<MaterialHardness, number> = {
    softwood: 1.0,
    hardwood: 0.5,
    plywood: 0.75,
    mdf: 0.8,
    melamine: 0.5,
    acrylic: 0.3,
    aluminium: 0.2,
  };

  const factor = depthFactors[material];
  const maxDepthPerPass = cutterDiameterMm * factor;
  const depthPerPassMm = Math.min(maxDepthPerPass, totalDepthMm);
  const numberOfPasses = Math.ceil(totalDepthMm / depthPerPassMm);
  const finalPassDepthMm = totalDepthMm - depthPerPassMm * (numberOfPasses - 1);

  return {
    depthPerPassMm: Math.round(depthPerPassMm * 100) / 100,
    numberOfPasses,
    finalPassDepthMm: Math.round(finalPassDepthMm * 100) / 100,
  };
}

/**
 * Calculate recommended stepover as a percentage of cutter diameter.
 *
 * @param cutterDiameterMm - Cutter diameter in mm
 * @param isFinishPass - Whether this is a finishing pass (smaller stepover)
 * @returns Recommended stepover in mm
 * @throws RangeError if cutterDiameter ≤ 0
 */
export function recommendStepover(cutterDiameterMm: number, isFinishPass: boolean): number {
  if (cutterDiameterMm <= 0) {
    throw new RangeError(`recommendStepover: cutterDiameterMm must be > 0, got ${cutterDiameterMm}`);
  }

  const factor = isFinishPass ? 0.1 : 0.45;
  return Math.round(cutterDiameterMm * factor * 100) / 100;
}
