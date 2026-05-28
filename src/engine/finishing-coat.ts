/**
 * Finishing Coat Calculator — Sprint 227
 *
 * Estimates product volume and drying schedule for common wood finishes.
 * Coverage rates are industry-standard figures per finish type.
 */

export type FinishType = 'polyurethane' | 'lacquer' | 'shellac' | 'waterbased' | 'oil';

export interface FinishingCoatInput {
  /** Total surface area to finish in square metres */
  surfaceAreaM2: number;
  /** Number of coats to apply */
  coatCount: number;
  /** Finish product type */
  finishType: FinishType;
}

export interface FinishingCoatResult {
  /** Total product volume needed in litres (includes 10% waste allowance) */
  volumeLitres: number;
  /** Dry time between coats in minutes */
  dryTimeBetweenCoatsMin: number;
  /** Full cure / final coat dry time in hours */
  totalDryTimeHours: number;
  /** Theoretical coverage per litre in m² */
  coveragePerLitreM2: number;
  /** Finish type used */
  finishType: FinishType;
}

interface FinishSpec {
  /** m² per litre at recommended wet film thickness */
  coverageM2PerL: number;
  /** Recoat time in minutes */
  recoatMin: number;
  /** Full cure time in hours after final coat */
  cureHours: number;
}

const FINISH_SPECS: Record<FinishType, FinishSpec> = {
  polyurethane: { coverageM2PerL: 10, recoatMin: 240, cureHours: 72 },
  lacquer: { coverageM2PerL: 12, recoatMin: 30, cureHours: 24 },
  shellac: { coverageM2PerL: 14, recoatMin: 45, cureHours: 12 },
  waterbased: { coverageM2PerL: 11, recoatMin: 120, cureHours: 48 },
  oil: { coverageM2PerL: 8, recoatMin: 480, cureHours: 168 },
};

const WASTE_FACTOR = 1.1; // 10% overage

export function calculateFinishingCoat(input: FinishingCoatInput): FinishingCoatResult {
  const { surfaceAreaM2, coatCount, finishType } = input;

  if (surfaceAreaM2 <= 0) throw new RangeError('surfaceAreaM2 must be positive');
  if (coatCount < 1) throw new RangeError('coatCount must be at least 1');

  const spec = FINISH_SPECS[finishType];

  const volumeLitres = Math.ceil(((surfaceAreaM2 * coatCount * WASTE_FACTOR) / spec.coverageM2PerL) * 100) / 100;

  // Total dry time: (coatCount - 1) recoat gaps + final cure
  const totalDryTimeHours = ((coatCount - 1) * spec.recoatMin) / 60 + spec.cureHours;

  return {
    volumeLitres,
    dryTimeBetweenCoatsMin: spec.recoatMin,
    totalDryTimeHours: Math.round(totalDryTimeHours * 10) / 10,
    coveragePerLitreM2: spec.coverageM2PerL,
    finishType,
  };
}
