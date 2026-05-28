/**
 * Kerf Bending Calculator — Sprint 225
 *
 * Calculates kerf spacing, depth, and count needed to bend a panel to a
 * target radius using repeated saw cuts on the back face.
 *
 * Formula (Hoadley): kerfSpacing ≈ kerfWidth × (t - kerfDepth) / (t - kerfDepth - 1)
 * Practical approximation: spacing = kerfWidth × R / (t - wallThickness)
 * where wallThickness = t - kerfDepth (minimum ~3 mm for structural integrity).
 */

export type KerfMaterial = 'plywood' | 'mdf' | 'softwood' | 'hardwood';

export interface KerfBendingInput {
  /** Panel thickness in mm */
  thicknessMm: number;
  /** Target inner bend radius in mm */
  bendRadiusMm: number;
  /** Saw blade kerf width in mm (default 3.2 mm — standard table saw) */
  kerfWidthMm?: number;
  /** Material type — affects minimum wall thickness recommendation */
  material?: KerfMaterial;
}

export interface KerfBendingResult {
  /** Spacing between kerf centres in mm */
  kerfSpacingMm: number;
  /** Kerf cut depth in mm */
  kerfDepthMm: number;
  /** Remaining wall thickness after cut in mm */
  remainingThicknessMm: number;
  /** Number of kerfs required to complete the bend */
  kerfCount: number;
  /** Total arc length of the bend (quarter turn = π/2 × R) */
  arcLengthMm: number;
  /** True when the bend is achievable with reasonable kerf count */
  isFeasible: boolean;
  /** i18n key for infeasibility warning (undefined when feasible) */
  warningKey?: string;
}

/** Minimum wall thickness by material to prevent tear-through */
const MIN_WALL_MM: Record<KerfMaterial, number> = {
  plywood: 3,
  mdf: 2.5,
  softwood: 3,
  hardwood: 4,
};

export function calculateKerfBending(input: KerfBendingInput): KerfBendingResult {
  const { thicknessMm, bendRadiusMm, kerfWidthMm = 3.2, material = 'plywood' } = input;

  if (thicknessMm <= 0) throw new RangeError('thicknessMm must be positive');
  if (bendRadiusMm <= 0) throw new RangeError('bendRadiusMm must be positive');
  if (kerfWidthMm <= 0) throw new RangeError('kerfWidthMm must be positive');

  const minWall = MIN_WALL_MM[material];
  const kerfDepthMm = thicknessMm - minWall;

  if (kerfDepthMm <= 0) {
    // Panel too thin to kerf-bend — return infeasible result
    return {
      kerfSpacingMm: 0,
      kerfDepthMm: 0,
      remainingThicknessMm: thicknessMm,
      kerfCount: 0,
      arcLengthMm: 0,
      isFeasible: false,
      warningKey: 'tooFewKerfs',
    };
  }

  // Kerf spacing: spacing = kerfWidth × bendRadius / kerfDepth
  const kerfSpacingMm = (kerfWidthMm * bendRadiusMm) / kerfDepthMm;

  // Full 90° arc (quarter circle) — common use case for curved panels
  const arcLengthMm = (Math.PI / 2) * bendRadiusMm;
  const kerfCount = Math.ceil(arcLengthMm / kerfSpacingMm);

  const isFeasible = kerfCount >= 2 && kerfCount <= 200;

  return {
    kerfSpacingMm: Math.round(kerfSpacingMm * 10) / 10,
    kerfDepthMm: Math.round(kerfDepthMm * 10) / 10,
    remainingThicknessMm: minWall,
    kerfCount,
    arcLengthMm: Math.round(arcLengthMm * 10) / 10,
    isFeasible,
    warningKey: isFeasible ? undefined : 'tooFewKerfs',
  };
}
