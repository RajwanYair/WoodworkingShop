/**
 * Wood Glue Coverage Calculator — Sprint 233
 *
 * Estimates the volume of glue needed for a wood joint based on the
 * glue surface area and the selected glue type.
 *
 * Coverage rates (spread rate, single-face application):
 *   PVA (white/yellow)  : 180 m²/L  (≈ 5.5 mL/m²)
 *   Polyurethane        : 250 m²/L  (≈ 4.0 mL/m²)
 *   Epoxy               : 120 m²/L  (≈ 8.3 mL/m²)
 *   Hide glue           : 160 m²/L  (≈ 6.25 mL/m²)
 *   CA (cyanoacrylate)  : 400 m²/L  (thin bead; minimal spread)
 *
 * Glue is applied to ONE face of each joint pair (single-face spread).
 * Open time and clamping time are per-product reference values.
 *
 * glueVolumeMl = (surfaceAreaMm2 / 1_000_000) × (1_000_000 / spreadRateMm2PerL) × 1000
 *              = surfaceAreaMm2 / spreadRateMm2PerL    (result in mL)
 * Add 15% waste allowance.
 */

import { assertBetweenInclusive, assertFiniteNumber } from './invariant';

export type WoodGlueType = 'pva' | 'polyurethane' | 'epoxy' | 'hide' | 'ca';

export const GLUE_COVERAGE_LIMITS = {
  surfaceAreaMm2: { min: 100, max: 10_000_000 },
  jointCount: { min: 1, max: 100 },
} as const;

export interface GlueCoverageInput {
  /** Total glue surface area in mm² */
  surfaceAreaMm2: number;
  /** Glue type */
  glueType: WoodGlueType;
  /** Number of joints (panels / boards being glued) — default 1 */
  jointCount?: number;
}

export interface GlueCoverageResult {
  /** Net glue volume (no waste) in mL */
  netVolumeMl: number;
  /** Recommended volume with 15% waste in mL */
  recommendedVolumeMl: number;
  /** Open time in minutes (working time before glue sets) */
  openTimeMin: number;
  /** Clamping time in minutes */
  clampingTimeMin: number;
  /** Full cure time in hours */
  cureTimeHours: number;
  /** Spread rate used in m²/L */
  spreadRateM2PerL: number;
  /** Glue type echoed back */
  glueType: WoodGlueType;
}

interface GlueSpec {
  spreadRateM2PerL: number;
  openTimeMin: number;
  clampingTimeMin: number;
  cureTimeHours: number;
}

const GLUE_SPECS: Record<WoodGlueType, GlueSpec> = {
  pva: { spreadRateM2PerL: 180, openTimeMin: 10, clampingTimeMin: 30, cureTimeHours: 24 },
  polyurethane: { spreadRateM2PerL: 250, openTimeMin: 15, clampingTimeMin: 60, cureTimeHours: 4 },
  epoxy: { spreadRateM2PerL: 120, openTimeMin: 20, clampingTimeMin: 60, cureTimeHours: 8 },
  hide: { spreadRateM2PerL: 160, openTimeMin: 5, clampingTimeMin: 45, cureTimeHours: 12 },
  ca: { spreadRateM2PerL: 400, openTimeMin: 1, clampingTimeMin: 5, cureTimeHours: 1 },
};

/**
 * Estimate glue volume and working/cure times for a joint surface.
 * @param input Surface area in square millimetres, glue type, and optional joint count.
 * @returns Net/recommended volume in millilitres and glue timing/coverage specifications.
 * @throws {RangeError} When inputs are outside the declared calculator limits or calculations overflow.
 */
export function calculateGlueCoverage(input: GlueCoverageInput): GlueCoverageResult {
  const fn = 'calculateGlueCoverage';
  const { surfaceAreaMm2, glueType, jointCount = 1 } = input;

  assertBetweenInclusive(
    fn,
    'surfaceAreaMm2',
    surfaceAreaMm2,
    GLUE_COVERAGE_LIMITS.surfaceAreaMm2.min,
    GLUE_COVERAGE_LIMITS.surfaceAreaMm2.max,
  );
  if (!Number.isInteger(jointCount)) {
    throw new RangeError(`${fn}: jointCount must be an integer, got ${jointCount}`);
  }
  assertBetweenInclusive(
    fn,
    'jointCount',
    jointCount,
    GLUE_COVERAGE_LIMITS.jointCount.min,
    GLUE_COVERAGE_LIMITS.jointCount.max,
  );

  const spec = GLUE_SPECS[glueType];
  const totalAreaMm2 = surfaceAreaMm2 * jointCount;
  assertFiniteNumber(fn, 'totalAreaMm2', totalAreaMm2);
  // Convert mm² → m²: divide by 1_000_000; spreadRate in m²/L → mL = (area_m² / rate_m²perL) * 1000
  const netVolumeMl = Math.round((totalAreaMm2 / 1_000_000 / spec.spreadRateM2PerL) * 1000 * 100) / 100;
  const recommendedVolumeMl = Math.round(netVolumeMl * 115) / 100;
  assertFiniteNumber(fn, 'netVolumeMl', netVolumeMl);
  assertFiniteNumber(fn, 'recommendedVolumeMl', recommendedVolumeMl);

  return {
    netVolumeMl,
    recommendedVolumeMl,
    openTimeMin: spec.openTimeMin,
    clampingTimeMin: spec.clampingTimeMin,
    cureTimeHours: spec.cureTimeHours,
    spreadRateM2PerL: spec.spreadRateM2PerL,
    glueType,
  };
}
