/**
 * Router Bit Depth-of-Cut Calculator — Sprint 207
 *
 * Calculates safe depth-of-cut per pass for router operations based on
 * bit diameter, material hardness, router power, and operation type.
 * Provides multi-pass schedule to reach target depth.
 */

/** Router operation type. */
export type RouterOperation = 'dado' | 'rabbet' | 'groove' | 'profile' | 'mortise' | 'template' | 'freehand';

/** Material hardness category. */
export type MaterialHardness = 'softwood' | 'hardwood' | 'plywood' | 'mdf' | 'hardPlastic';

/** Input for router depth calculation. */
export interface RouterDepthInput {
  /** Bit diameter (mm). */
  readonly bitDiameterMm: number;
  /** Target total depth of cut (mm). */
  readonly targetDepthMm: number;
  /** Material hardness. */
  readonly material: MaterialHardness;
  /** Router power (W, typical: 750–2400). */
  readonly routerPowerW: number;
  /** Operation type. */
  readonly operation: RouterOperation;
  /** Feed rate (mm/s, optional — for chip load calculation). */
  readonly feedRateMmPerSec?: number;
  /** Number of flutes on the bit (default 2). */
  readonly flutes?: number;
  /** RPM of the router (default based on bit diameter). */
  readonly rpm?: number;
}

/** A single pass in the depth schedule. */
export interface RouterPass {
  /** Pass number (1-based). */
  readonly passNumber: number;
  /** Depth of this pass (mm). */
  readonly depthMm: number;
  /** Cumulative depth after this pass (mm). */
  readonly cumulativeDepthMm: number;
}

/** Result of router depth calculation. */
export interface RouterDepthResult {
  /** Maximum safe depth per pass (mm). */
  readonly maxDepthPerPassMm: number;
  /** Total number of passes required. */
  readonly totalPasses: number;
  /** Detailed pass schedule. */
  readonly passes: readonly RouterPass[];
  /** Recommended RPM for this bit diameter. */
  readonly recommendedRpm: number;
  /** Chip load per tooth (mm, if feed rate provided). */
  readonly chipLoadMm: number | null;
  /** Whether chip load is in safe range. */
  readonly chipLoadSafe: boolean | null;
  /** Material factor used. */
  readonly materialFactor: number;
}

/**
 * Material hardness factors (multiplier for max depth).
 * Softer materials allow deeper cuts.
 */
const MATERIAL_FACTORS: Record<MaterialHardness, number> = {
  softwood: 1.0,
  hardwood: 0.6,
  plywood: 0.8,
  mdf: 0.9,
  hardPlastic: 0.5,
} as const;

/**
 * Operation aggressiveness factors.
 * Some operations allow deeper cuts than others.
 */
const OPERATION_FACTORS: Record<RouterOperation, number> = {
  dado: 0.8,
  rabbet: 0.9,
  groove: 0.8,
  profile: 0.7,
  mortise: 0.6,
  template: 0.75,
  freehand: 0.5,
} as const;

/**
 * Recommended RPM by bit diameter range.
 * Larger bits need slower speeds.
 */
const RPM_TABLE: readonly { readonly maxDiameter: number; readonly rpm: number }[] = [
  { maxDiameter: 6, rpm: 24000 },
  { maxDiameter: 12, rpm: 22000 },
  { maxDiameter: 16, rpm: 18000 },
  { maxDiameter: 22, rpm: 16000 },
  { maxDiameter: 32, rpm: 14000 },
  { maxDiameter: 50, rpm: 12000 },
  { maxDiameter: 65, rpm: 10000 },
  { maxDiameter: Infinity, rpm: 8000 },
] as const;

/**
 * Calculate safe router depth-of-cut and pass schedule.
 *
 * Rule of thumb: max depth per pass ≈ half the bit diameter,
 * adjusted for material, operation, and router power.
 *
 * @param input - Bit size, material, power, and target depth
 * @returns Pass schedule and recommendations
 * @throws RangeError for invalid inputs
 */
export function calculateRouterDepth(input: RouterDepthInput): RouterDepthResult {
  const { bitDiameterMm, targetDepthMm, material, routerPowerW, operation, feedRateMmPerSec, flutes = 2 } = input;

  if (bitDiameterMm <= 0) {
    throw new RangeError(`calculateRouterDepth: bitDiameterMm must be > 0, got ${bitDiameterMm}`);
  }
  if (targetDepthMm <= 0) {
    throw new RangeError(`calculateRouterDepth: targetDepthMm must be > 0, got ${targetDepthMm}`);
  }
  if (routerPowerW <= 0) {
    throw new RangeError(`calculateRouterDepth: routerPowerW must be > 0, got ${routerPowerW}`);
  }
  if (flutes < 1) {
    throw new RangeError(`calculateRouterDepth: flutes must be >= 1, got ${flutes}`);
  }

  const materialFactor = MATERIAL_FACTORS[material];
  const operationFactor = OPERATION_FACTORS[operation];

  // Power factor: normalized around 1500W (a mid-range router)
  const powerFactor = Math.min(routerPowerW / 1500, 1.3);

  // Base max depth = half bit diameter
  const baseDepth = bitDiameterMm / 2;

  // Adjusted max depth per pass
  const maxDepthPerPassMm = round2(baseDepth * materialFactor * operationFactor * powerFactor);

  // Generate pass schedule
  const passes: RouterPass[] = [];
  let remaining = targetDepthMm;
  let cumulative = 0;
  let passNum = 0;

  while (remaining > 0.01) {
    passNum++;
    const depth = round2(Math.min(maxDepthPerPassMm, remaining));
    cumulative = round2(cumulative + depth);
    passes.push({ passNumber: passNum, depthMm: depth, cumulativeDepthMm: cumulative });
    remaining = round2(remaining - depth);
  }

  // RPM recommendation
  const recommendedRpm = input.rpm ?? getRecommendedRpm(bitDiameterMm);

  // Chip load calculation
  let chipLoadMm: number | null = null;
  let chipLoadSafe: boolean | null = null;
  if (feedRateMmPerSec !== undefined && feedRateMmPerSec > 0) {
    const rpmUsed = input.rpm ?? recommendedRpm;
    chipLoadMm = round4((feedRateMmPerSec * 60) / (rpmUsed * flutes));
    // Safe chip load range: 0.1–0.5 mm for wood
    chipLoadSafe = chipLoadMm >= 0.05 && chipLoadMm <= 0.6;
  }

  return {
    maxDepthPerPassMm,
    totalPasses: passes.length,
    passes,
    recommendedRpm,
    chipLoadMm,
    chipLoadSafe,
    materialFactor,
  };
}

/**
 * Get recommended RPM for a given bit diameter.
 *
 * @param diameterMm - Bit diameter in mm
 * @returns Recommended RPM
 */
export function getRecommendedRpm(diameterMm: number): number {
  if (diameterMm <= 0) {
    throw new RangeError(`getRecommendedRpm: diameterMm must be > 0, got ${diameterMm}`);
  }
  for (const entry of RPM_TABLE) {
    if (diameterMm <= entry.maxDiameter) {
      return entry.rpm;
    }
  }
  return 8000;
}

/** Round to 2 decimal places. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Round to 4 decimal places. */
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
