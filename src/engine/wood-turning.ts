/**
 * Wood Turning Speed Calculator — Sprint 228
 *
 * Calculates safe lathe RPM ranges from blank diameter.
 * Based on the Woodturners Association formula:
 *   maxRPM = 6000 / diameterInches  (safe guideline)
 *   minRPM = 2000 / diameterInches  (roughing minimum)
 *
 * Surface speed target: 600–900 m/min for finishing passes.
 */

export type TurningOperation = 'roughing' | 'finishing' | 'sanding';

export interface WoodTurningInput {
  /** Blank diameter in mm */
  blankDiameterMm: number;
  /** Turning operation type */
  operation: TurningOperation;
}

export interface WoodTurningResult {
  /** Minimum safe RPM for this diameter */
  minRpm: number;
  /** Maximum safe RPM for this diameter */
  maxRpm: number;
  /** Recommended RPM for the operation */
  recommendedRpm: number;
  /** Surface speed at recommended RPM in m/min */
  surfaceSpeedMPerMin: number;
  /** Safety note key */
  safetyNoteKey: string;
}

const MM_TO_IN = 1 / 25.4;

/** RPM multipliers per operation (fraction of max safe RPM) */
const OPERATION_FACTOR: Record<TurningOperation, number> = {
  roughing: 0.4,
  finishing: 0.75,
  sanding: 0.9,
};

export function calculateWoodTurning(input: WoodTurningInput): WoodTurningResult {
  const { blankDiameterMm, operation } = input;

  if (blankDiameterMm <= 0) throw new RangeError('blankDiameterMm must be positive');

  const diameterIn = blankDiameterMm * MM_TO_IN;

  // Woodturners Association safe speed formula
  const maxRpm = Math.floor(6000 / diameterIn);
  const minRpm = Math.floor(2000 / diameterIn);

  const recommendedRpm = Math.round(minRpm + (maxRpm - minRpm) * OPERATION_FACTOR[operation]);

  // Surface speed = π × D × N / 1000 (m/min, D in mm)
  const surfaceSpeedMPerMin = Math.round(((Math.PI * blankDiameterMm * recommendedRpm) / 1000) * 10) / 10;

  return {
    minRpm: Math.max(minRpm, 250),
    maxRpm: Math.min(maxRpm, 4000),
    recommendedRpm: Math.max(Math.min(recommendedRpm, 4000), 250),
    surfaceSpeedMPerMin,
    safetyNoteKey: 'safetyNote',
  };
}
