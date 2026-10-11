/**
 * Sprint 243 — Router template offset (bushing offset) calculator.
 *
 * When routing with a guide bushing (template guide), the bushing's outside
 * diameter (OD) is larger than the router bit, causing the cut to be offset
 * from the template edge. The offset is:
 *
 *   offset = (bushingOD − bitDiameter) / 2
 *
 * For an INSIDE cut (template defines the outer boundary):
 *   - The template must be ENLARGED by the offset on each side.
 *   - Pattern adjustment (per side) = +offset
 *
 * For an OUTSIDE cut (template defines the inner boundary / island):
 *   - The template must be SHRUNK by the offset on each side.
 *   - Pattern adjustment (per side) = −offset
 *
 * The adjustedDimensionMm is a convenience value showing how a given
 * nominal feature dimension changes after template adjustment.
 */

import { assertFiniteNumber } from './invariant';

export type RouterTemplateCutType = 'inside' | 'outside';

export interface RouterTemplateInput {
  /** Guide bushing outside diameter (mm) */
  bushingODMm: number;
  /** Router bit cutting diameter (mm) */
  bitDiameterMm: number;
  /** Whether the cut is inside or outside the template */
  cutType: RouterTemplateCutType;
  /** Nominal dimension of the feature (mm) — used to compute adjusted size */
  nominalDimensionMm?: number;
}

export interface RouterTemplateResult {
  /** Offset between bushing edge and bit edge (mm) */
  offsetMm: number;
  /**
   * How much to adjust the TEMPLATE dimension per side (mm):
   *   positive  → enlarge template
   *   negative  → shrink template
   */
  templateAdjustmentPerSideMm: number;
  /**
   * Total template dimension adjustment (both sides combined) (mm):
   *   2 × templateAdjustmentPerSideMm
   */
  totalTemplateAdjustmentMm: number;
  /** Adjusted nominal dimension (only set when nominalDimensionMm is provided) */
  adjustedDimensionMm: number | null;
}

/**
 * Calculate guide-bushing offset and the corresponding template adjustment.
 * @param input Bushing/bit diameters, cut direction, and optional feature dimension in millimetres.
 * @returns Offset, per-side/total template adjustment, and optional adjusted dimension.
 * @throws {RangeError} When dimensions are non-finite/out of range or the adjusted feature is not positive.
 */
export function calculateRouterTemplate(input: RouterTemplateInput): RouterTemplateResult {
  const { bushingODMm, bitDiameterMm, cutType, nominalDimensionMm } = input;

  const fn = 'calculateRouterTemplate';
  assertFiniteNumber(fn, 'bushingODMm', bushingODMm);
  assertFiniteNumber(fn, 'bitDiameterMm', bitDiameterMm);
  if (nominalDimensionMm !== undefined) assertFiniteNumber(fn, 'nominalDimensionMm', nominalDimensionMm);

  if (bushingODMm <= 0) {
    throw new RangeError('bushingODMm must be greater than 0');
  }
  if (bitDiameterMm <= 0) {
    throw new RangeError('bitDiameterMm must be greater than 0');
  }
  if (bushingODMm <= bitDiameterMm) {
    throw new RangeError('bushingODMm must be greater than bitDiameterMm');
  }
  if (nominalDimensionMm !== undefined && nominalDimensionMm <= 0) {
    throw new RangeError('nominalDimensionMm must be greater than 0');
  }

  const offsetMm = Math.round(((bushingODMm - bitDiameterMm) / 2) * 1000) / 1000;
  assertFiniteNumber(fn, 'offsetMm', offsetMm);

  // Inside cut: template must grow by offset per side (pattern is inside the bushing path)
  // Outside cut: template must shrink by offset per side
  const templateAdjustmentPerSideMm = cutType === 'inside' ? offsetMm : -offsetMm;
  const totalTemplateAdjustmentMm = Math.round(templateAdjustmentPerSideMm * 2 * 1000) / 1000;
  assertFiniteNumber(fn, 'templateAdjustmentPerSideMm', templateAdjustmentPerSideMm);
  assertFiniteNumber(fn, 'totalTemplateAdjustmentMm', totalTemplateAdjustmentMm);

  let adjustedDimensionMm: number | null = null;
  if (nominalDimensionMm !== undefined) {
    // Template dimension = nominal + total adjustment (shrink or grow)
    adjustedDimensionMm = Math.round((nominalDimensionMm + totalTemplateAdjustmentMm) * 1000) / 1000;
    assertFiniteNumber(fn, 'adjustedDimensionMm', adjustedDimensionMm);
    if (adjustedDimensionMm <= 0) {
      throw new RangeError(`calculateRouterTemplate: adjustedDimensionMm must be positive, got ${adjustedDimensionMm}`);
    }
  }

  return {
    offsetMm,
    templateAdjustmentPerSideMm,
    totalTemplateAdjustmentMm,
    adjustedDimensionMm,
  };
}
