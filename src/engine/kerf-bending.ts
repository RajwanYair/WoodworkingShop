/**
 * Kerf Bending Calculator — Sprint 225
 *
 * Calculates kerf spacing, depth, and count needed to bend a panel to a
 * target radius using repeated saw cuts on the back face.
 *
 * Idealized geometry: spacing = kerfWidth × outsideRadius / kerfDepth.
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
  /** Explicit remaining web thickness in mm; defaults to the material recommendation. */
  remainingThicknessMm?: number;
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

/**
 * Calculate kerf spacing and count for a quarter-circle bend.
 * @param input Stock dimensions, inside radius, kerf width, and optional remaining web thickness.
 * @returns Rounded spacing, depth, outside arc length, and feasibility data.
 * @throws RangeError when a required dimension or supplied remaining thickness is not positive and finite.
 */
export function calculateKerfBending(input: KerfBendingInput): KerfBendingResult {
  const {
    thicknessMm,
    bendRadiusMm,
    kerfWidthMm = 3.2,
    material = 'plywood',
    remainingThicknessMm = MIN_WALL_MM[material],
  } = input;

  if (!Number.isFinite(thicknessMm) || thicknessMm <= 0) throw new RangeError('thicknessMm must be positive');
  if (!Number.isFinite(bendRadiusMm) || bendRadiusMm <= 0) throw new RangeError('bendRadiusMm must be positive');
  if (!Number.isFinite(kerfWidthMm) || kerfWidthMm <= 0) throw new RangeError('kerfWidthMm must be positive');
  if (!Number.isFinite(remainingThicknessMm) || remainingThicknessMm <= 0) {
    throw new RangeError('remainingThicknessMm must be positive');
  }

  const kerfDepthMm = thicknessMm - remainingThicknessMm;

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

  const outsideRadiusMm = bendRadiusMm + thicknessMm;
  const kerfSpacingMm = (kerfWidthMm * outsideRadiusMm) / kerfDepthMm;

  // Full 90° arc (quarter circle) — common use case for curved panels
  const arcLengthMm = (Math.PI / 2) * outsideRadiusMm;
  const kerfCount = Math.ceil(arcLengthMm / kerfSpacingMm);

  const isFeasible = kerfCount >= 2 && kerfCount <= 200;

  return {
    kerfSpacingMm: Math.round(kerfSpacingMm * 10) / 10,
    kerfDepthMm: Math.round(kerfDepthMm * 10) / 10,
    remainingThicknessMm: Math.round(remainingThicknessMm * 10) / 10,
    kerfCount,
    arcLengthMm: Math.round(arcLengthMm * 10) / 10,
    isFeasible,
    warningKey: isFeasible ? undefined : 'tooFewKerfs',
  };
}
