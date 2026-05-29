/**
 * Sprint 241 — Wood moisture content & dimensional shrinkage calculator.
 *
 * Below the fibre saturation point (~30% MC) wood shrinks as it dries.
 * The dimensional change is:
 *
 *   ΔD = D₀ × (ΔMC / 100) × coefficient
 *
 * where coefficient is the species shrinkage coefficient per 1% MC change
 * (tangential or radial), expressed as a decimal fraction.
 *
 * Coefficients are sourced from the USDA Forest Products Laboratory
 * Wood Handbook (Table 4-3).
 */

export type MoistureShrinkageSpecies =
  | 'oak'
  | 'maple'
  | 'cherry'
  | 'walnut'
  | 'pine'
  | 'douglas_fir'
  | 'cedar'
  | 'generic_hardwood'
  | 'generic_softwood';

export type WoodGrainDirection = 'tangential' | 'radial';

/** Shrinkage coefficients: fractional dimensional change per 1% MC change (below FSP). */
const SHRINKAGE_COEFF: Record<MoistureShrinkageSpecies, Record<WoodGrainDirection, number>> = {
  oak: { tangential: 0.00369, radial: 0.00183 },
  maple: { tangential: 0.00353, radial: 0.00193 },
  cherry: { tangential: 0.00343, radial: 0.00193 },
  walnut: { tangential: 0.00276, radial: 0.00189 },
  pine: { tangential: 0.00247, radial: 0.00122 },
  douglas_fir: { tangential: 0.00293, radial: 0.00149 },
  cedar: { tangential: 0.00231, radial: 0.0011 },
  generic_hardwood: { tangential: 0.0035, radial: 0.0019 },
  generic_softwood: { tangential: 0.0025, radial: 0.0013 },
};

/** Fibre saturation point — changes above this are free-water only (no shrinkage). */
const FSP_PCT = 30;

export interface MoistureShrinkageInput {
  /** Initial moisture content (%) */
  initialMCPct: number;
  /** Target moisture content (%) */
  targetMCPct: number;
  /** Wood species */
  species: MoistureShrinkageSpecies;
  /** Board dimension in this grain direction (mm) */
  dimensionMm: number;
  /** Grain direction of the dimension being calculated */
  grain: WoodGrainDirection;
}

export interface MoistureShrinkageResult {
  /** Effective MC range that causes shrinkage (capped at FSP) */
  effectiveMCChangePct: number;
  /** Dimensional change (positive = shrinkage when drying) in mm */
  changeAmountMm: number;
  /** Final dimension after drying (mm) */
  finalDimensionMm: number;
  /** Shrinkage coefficient used */
  shrinkageCoefficient: number;
}

export function calculateMoistureShrinkage(input: MoistureShrinkageInput): MoistureShrinkageResult {
  const { initialMCPct, targetMCPct, species, dimensionMm, grain } = input;

  if (initialMCPct < 0) {
    throw new RangeError('initialMCPct must be >= 0');
  }
  if (targetMCPct < 0) {
    throw new RangeError('targetMCPct must be >= 0');
  }
  if (dimensionMm <= 0) {
    throw new RangeError('dimensionMm must be greater than 0');
  }

  // Shrinkage only occurs below the fibre saturation point
  const effectiveInitial = Math.min(initialMCPct, FSP_PCT);
  const effectiveTarget = Math.min(targetMCPct, FSP_PCT);
  const effectiveMCChangePct = effectiveInitial - effectiveTarget;

  const shrinkageCoefficient = SHRINKAGE_COEFF[species][grain];
  const changeAmountMm = Math.round(dimensionMm * effectiveMCChangePct * shrinkageCoefficient * 100) / 100;
  const finalDimensionMm = Math.round((dimensionMm - changeAmountMm) * 100) / 100;

  return {
    effectiveMCChangePct,
    changeAmountMm,
    finalDimensionMm,
    shrinkageCoefficient,
  };
}
