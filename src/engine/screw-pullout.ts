import { assertBetweenInclusive } from './invariant';

/**
 * Screw Pull-Out Strength Estimator — Sprint 224
 *
 * Uses USDA Wood Handbook equation 8-10a for seasoned side-grain wood screws:
 *   P = 108.25 × G² × D × L  (P in N, D and L in mm, G = specific gravity).
 *
 * Safety rating thresholds: adequate ≥ 300 N, marginal ≥ 100 N, insufficient < 100 N.
 */

export type WoodDensityClass = 'low' | 'medium' | 'high' | 'sheet';

export type SafetyRating = 'adequate' | 'marginal' | 'insufficient';

export const SCREW_PULLOUT_LIMITS = {
  screwDiameterMm: { min: 1, max: 12 },
  threadLengthMm: { min: 5, max: 100 },
} as const;

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

const LBF_TO_N = 4.448_221_6;

export function calculateScrewPullout(input: ScrewPulloutInput): ScrewPulloutResult {
  const { screwDiameterMm, threadLengthMm, densityClass } = input;

  const fn = 'calculateScrewPullout';
  assertBetweenInclusive(
    fn,
    'screwDiameterMm',
    screwDiameterMm,
    SCREW_PULLOUT_LIMITS.screwDiameterMm.min,
    SCREW_PULLOUT_LIMITS.screwDiameterMm.max,
  );
  assertBetweenInclusive(
    fn,
    'threadLengthMm',
    threadLengthMm,
    SCREW_PULLOUT_LIMITS.threadLengthMm.min,
    SCREW_PULLOUT_LIMITS.threadLengthMm.max,
  );

  const G = SPECIFIC_GRAVITY[densityClass];
  const D = screwDiameterMm; // mm
  const L = threadLengthMm; // mm

  const pulloutForceN = 108.25 * G * G * D * L;
  const pulloutForceLbf = pulloutForceN / LBF_TO_N;

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
