/**
 * Clamp Pressure Calculator — Sprint 197
 *
 * Determines number of clamps needed for a glue-up based on
 * joint area, required PSI, clamp capacity, and spacing rules.
 * Covers face gluing, edge gluing, and panel lamination.
 */

/** Glue type with recommended PSI range. */
export type GlueType = 'pva' | 'polyurethane' | 'epoxy' | 'hide' | 'contact';

/** Clamp type with rated force. */
export type ClampType = 'bar' | 'pipe' | 'parallel' | 'spring' | 'toggle' | 'vacuum';

/** Recommended pressure ranges in PSI per glue type. */
export const GLUE_PRESSURE_PSI: Record<GlueType, { min: number; max: number }> = {
  pva: { min: 100, max: 200 },
  polyurethane: { min: 50, max: 100 },
  epoxy: { min: 25, max: 75 },
  hide: { min: 100, max: 150 },
  contact: { min: 25, max: 50 },
} as const;

/** Typical clamp force in lbs per type. */
export const CLAMP_FORCE_LBS: Record<ClampType, number> = {
  bar: 600,
  pipe: 750,
  parallel: 900,
  spring: 30,
  toggle: 450,
  vacuum: 1800, // per sq ft at ~12 PSI vacuum
} as const;

/** Input for clamp pressure calculation. */
export interface ClampPressureInput {
  /** Glue area width in mm. */
  readonly areaWidthMm: number;
  /** Glue area length in mm. */
  readonly areaLengthMm: number;
  /** Glue type. */
  readonly glueType: GlueType;
  /** Clamp type being used. */
  readonly clampType: ClampType;
  /** Maximum clamp spacing in mm (default: 150 for face, 200 for edge). */
  readonly maxSpacingMm?: number;
  /** Custom clamp force in lbs (overrides default for clamp type). */
  readonly clampForceLbs?: number;
}

/** Clamp pressure calculation result. */
export interface ClampPressureResult {
  /** Number of clamps required. */
  readonly clampCount: number;
  /** Total force needed in lbs. */
  readonly totalForceLbs: number;
  /** Force per clamp in lbs. */
  readonly forcePerClampLbs: number;
  /** Actual pressure achieved in PSI. */
  readonly achievedPsi: number;
  /** Recommended spacing between clamps in mm. */
  readonly spacingMm: number;
  /** Target pressure in PSI (midpoint of glue range). */
  readonly targetPsi: number;
  /** Glue area in square inches. */
  readonly areaSqIn: number;
  /** Open time before clamping in minutes. */
  readonly openTimeMin: number;
  /** Minimum clamp time in minutes. */
  readonly clampTimeMin: number;
}

const MM2_TO_SQIN = 1 / 645.16;

/**
 * Calculate clamp requirements for a glue-up.
 *
 * @param input - Glue joint parameters
 * @returns Clamp count, spacing, pressure achieved
 * @throws RangeError for invalid dimensions
 */
export function calculateClampPressure(input: ClampPressureInput): ClampPressureResult {
  const { areaWidthMm, areaLengthMm, glueType, clampType, maxSpacingMm = 150 } = input;

  if (areaWidthMm <= 0) {
    throw new RangeError(`calculateClampPressure: areaWidthMm must be > 0, got ${areaWidthMm}`);
  }
  if (areaLengthMm <= 0) {
    throw new RangeError(`calculateClampPressure: areaLengthMm must be > 0, got ${areaLengthMm}`);
  }

  const areaSqIn = areaWidthMm * areaLengthMm * MM2_TO_SQIN;
  const pressureRange = GLUE_PRESSURE_PSI[glueType];
  const targetPsi = (pressureRange.min + pressureRange.max) / 2;
  const totalForceLbs = Math.round(areaSqIn * targetPsi);

  const forcePerClampLbs = input.clampForceLbs ?? CLAMP_FORCE_LBS[clampType];

  // Clamps needed by force
  const clampsByForce = Math.ceil(totalForceLbs / forcePerClampLbs);

  // Clamps needed by spacing (along longest dimension)
  const longestMm = Math.max(areaWidthMm, areaLengthMm);
  const clampsBySpacing = Math.max(2, Math.ceil(longestMm / maxSpacingMm) + 1);

  // Use the larger requirement
  const clampCount = Math.max(clampsByForce, clampsBySpacing);

  const spacingMm = clampCount > 1 ? Math.round((longestMm / (clampCount - 1)) * 10) / 10 : 0;

  const achievedPsi = areaSqIn > 0 ? Math.round(((clampCount * forcePerClampLbs) / areaSqIn) * 10) / 10 : 0;

  // Open time and clamp time by glue type
  const openTimes: Record<GlueType, number> = {
    pva: 8,
    polyurethane: 15,
    epoxy: 30,
    hide: 3,
    contact: 0,
  };

  const clampTimes: Record<GlueType, number> = {
    pva: 30,
    polyurethane: 60,
    epoxy: 120,
    hide: 45,
    contact: 0,
  };

  return {
    clampCount,
    totalForceLbs,
    forcePerClampLbs,
    achievedPsi,
    spacingMm,
    targetPsi,
    areaSqIn: Math.round(areaSqIn * 100) / 100,
    openTimeMin: openTimes[glueType],
    clampTimeMin: clampTimes[glueType],
  };
}

/**
 * Check if achieved pressure is within acceptable range for glue type.
 *
 * @param achievedPsi - Actual pressure in PSI
 * @param glueType - Glue type
 * @returns true if pressure is within acceptable range
 */
export function isPressureAdequate(achievedPsi: number, glueType: GlueType): boolean {
  const range = GLUE_PRESSURE_PSI[glueType];
  return achievedPsi >= range.min && achievedPsi <= range.max * 1.5;
}
