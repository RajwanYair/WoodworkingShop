/**
 * Wood Turning Speed Calculator — Sprint 228
 *
 * Calculates advisory lathe RPM estimates from blank diameter.
 * The model's diameter formulas are estimates, not verified safety limits.
 */

export type TurningOperation = 'roughing' | 'finishing' | 'sanding';

export interface WoodTurningInput {
  /** Blank diameter in mm */
  blankDiameterMm: number;
  /** Turning operation type */
  operation: TurningOperation;
}

export interface WoodTurningResult {
  /** Model minimum RPM estimate for this diameter */
  minRpm: number;
  /** Model maximum RPM estimate for this diameter */
  maxRpm: number;
  /** Recommended RPM for the operation */
  recommendedRpm: number;
  /** Surface speed at recommended RPM in m/min */
  surfaceSpeedMPerMin: number;
  /** Safety note key */
  safetyNoteKey: string;
}

const MM_TO_IN = 1 / 25.4;

/** RPM multipliers per operation (fraction of the model range) */
const OPERATION_FACTOR: Record<TurningOperation, number> = {
  roughing: 0.4,
  finishing: 0.75,
  sanding: 0.9,
};

/**
 * Calculate advisory and recommended lathe speeds for a blank.
 * @param input Blank diameter in millimetres and turning operation.
 * @returns Clamped RPM range, operation speed, and surface speed.
 * @throws {RangeError} When blank diameter is not positive and finite.
 */
export function calculateWoodTurning(input: WoodTurningInput): WoodTurningResult {
  const { blankDiameterMm, operation } = input;

  if (!Number.isFinite(blankDiameterMm) || blankDiameterMm <= 0) {
    throw new RangeError('blankDiameterMm must be positive and finite');
  }

  const diameterIn = blankDiameterMm * MM_TO_IN;

  const maxRpm = Math.floor(6000 / diameterIn);
  const minRpm = Math.floor(2000 / diameterIn);

  const recommendedRpm = Math.round(minRpm + (maxRpm - minRpm) * OPERATION_FACTOR[operation]);

  const boundedMaxRpm = Math.min(maxRpm, 4000);
  const boundedMinRpm = Math.min(Math.max(minRpm, 250), boundedMaxRpm);
  const boundedRecommendedRpm = Math.min(Math.max(recommendedRpm, boundedMinRpm), boundedMaxRpm);
  const surfaceSpeedMPerMin = Math.round(((Math.PI * blankDiameterMm * boundedRecommendedRpm) / 1000) * 10) / 10;

  return {
    minRpm: boundedMinRpm,
    maxRpm: boundedMaxRpm,
    recommendedRpm: boundedRecommendedRpm,
    surfaceSpeedMPerMin,
    safetyNoteKey: 'safetyNote',
  };
}
