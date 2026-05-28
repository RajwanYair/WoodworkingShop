/**
 * Screw Pull-Out Strength Estimator — Sprint 224
 *
 * Uses the Wood Handbook / NDS-based withdrawal resistance formula:
 *   W = 1800 × G² × D^0.6 × L  (W in lbf, D and L in inches, G = oven-dry specific gravity)
 * then converted to Newtons (1 lbf ≈ 4.448 N).
 *
 * Safety rating thresholds: adequate ≥ 300 N, marginal ≥ 100 N, insufficient < 100 N.
 */

export type WoodDensityClass = 'low' | 'medium' | 'high' | 'sheet';

export type SafetyRating = 'adequate' | 'marginal' | 'insufficient';

export interface ScrewPulloutInput {
  /** Screw shank diameter in mm */
  screwDiameterMm: number;
  /** Thread engagement length in wood, in mm */
  threadLengthMm: number;
  /** Wood density classification */
  densityClass: WoodDensityClass;
}

export interface ScrewPulloutResult {
  /** Estimated pull-out force in Newtons */
  pulloutForceN: number;
  /** Estimated pull-out force in pounds-force */
  pulloutForceLbf: number;
  /** Withdrawal resistance in MPa */
  withdrawalResistanceMPa: number;
  /** Qualitative safety rating */
  safetyRating: SafetyRating;
  /** i18n key for the density class label */
  densityLabelKey: WoodDensityClass;
}

/** Approximate oven-dry specific gravity per density class */
const SPECIFIC_GRAVITY: Record<WoodDensityClass, number> = {
  low: 0.38, // pine / cedar
  medium: 0.63, // maple / oak
  high: 0.76, // hickory / teak
  sheet: 0.55, // plywood / MDF
};

const MM_TO_IN = 1 / 25.4;
const LBF_TO_N = 4.448_221_6;

export function calculateScrewPullout(input: ScrewPulloutInput): ScrewPulloutResult {
  const { screwDiameterMm, threadLengthMm, densityClass } = input;

  if (screwDiameterMm <= 0) throw new RangeError('screwDiameterMm must be positive');
  if (threadLengthMm <= 0) throw new RangeError('threadLengthMm must be positive');

  const G = SPECIFIC_GRAVITY[densityClass];
  const D = screwDiameterMm * MM_TO_IN; // inches
  const L = threadLengthMm * MM_TO_IN; // inches

  // NDS-based formula: F (lbf) = 1800 × G² × D^0.6 × L
  const pulloutForceLbf = 1800 * G * G * Math.pow(D, 0.6) * L;
  const pulloutForceN = pulloutForceLbf * LBF_TO_N;

  // Withdrawal resistance: force per unit contact area (MPa = N/mm²)
  const contactAreaMm2 = Math.PI * screwDiameterMm * threadLengthMm;
  const withdrawalResistanceMPa = pulloutForceN / contactAreaMm2;

  const safetyRating: SafetyRating =
    pulloutForceN >= 300 ? 'adequate' : pulloutForceN >= 100 ? 'marginal' : 'insufficient';

  return {
    pulloutForceN: Math.round(pulloutForceN * 10) / 10,
    pulloutForceLbf: Math.round(pulloutForceLbf * 10) / 10,
    withdrawalResistanceMPa: Math.round(withdrawalResistanceMPa * 1000) / 1000,
    safetyRating,
    densityLabelKey: densityClass,
  };
}
