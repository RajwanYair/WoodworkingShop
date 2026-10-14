/**
 * Glue-up Time Calculator — Sprint 212
 *
 * Estimates open time, clamp time, and full cure time based on
 * glue type, temperature, humidity, and joint area.
 */

/** Supported adhesive types. */
export type GlueType = 'pva' | 'polyurethane' | 'epoxy' | 'hide' | 'ca';

/** Input for glue-up time estimation. */
export interface GlueUpInput {
  /** Adhesive type. */
  readonly glueType: GlueType;
  /** Ambient temperature (°C). */
  readonly temperatureC: number;
  /** Relative humidity (0–100%). */
  readonly humidityPercent: number;
  /** Joint area (mm²) — affects total clamping force needed. */
  readonly jointAreaMm2: number;
  /** Number of joints in the assembly (default 1). */
  readonly jointCount?: number;
}

/** Glue-up timing result. */
export interface GlueUpResult {
  /** Open / assembly time before clamping (minutes). */
  readonly openTimeMin: number;
  /** Minimum clamp time (minutes). */
  readonly clampTimeMin: number;
  /** Full cure time (hours). */
  readonly cureTimeHours: number;
  /** Recommended clamping pressure (PSI). */
  readonly recommendedPsi: number;
  /** Number of clamps recommended (assuming 150 lb per clamp). */
  readonly clampsNeeded: number;
}

/**
 * Base timing data per glue type at 20°C / 50% RH.
 * { openTimeMin, clampTimeMin, cureTimeHours, psi }
 */
const BASE_TIMING: Record<GlueType, { open: number; clamp: number; cure: number; psi: number }> = {
  pva: { open: 10, clamp: 60, cure: 24, psi: 150 },
  polyurethane: { open: 15, clamp: 240, cure: 24, psi: 100 },
  epoxy: { open: 30, clamp: 360, cure: 72, psi: 50 },
  hide: { open: 5, clamp: 60, cure: 24, psi: 150 },
  ca: { open: 1, clamp: 5, cure: 2, psi: 0 },
};

const REFERENCE_TEMP_C = 20;
const REFERENCE_HUMIDITY = 50;
const CLAMP_FORCE_LB = 150;

/**
 * Estimate glue-up timing and clamping requirements.
 *
 * @param input - Environmental and joint parameters
 * @returns Timing and clamping recommendations
 * @throws RangeError for invalid inputs
 */
export function calculateGlueUpTime(input: GlueUpInput): GlueUpResult {
  const { glueType, temperatureC, humidityPercent, jointAreaMm2, jointCount = 1 } = input;

  if (temperatureC < 0 || temperatureC > 50) {
    throw new RangeError(`calculateGlueUpTime: temperatureC must be 0–50, got ${temperatureC}`);
  }
  if (humidityPercent < 0 || humidityPercent > 100) {
    throw new RangeError(`calculateGlueUpTime: humidityPercent must be 0–100, got ${humidityPercent}`);
  }
  if (jointAreaMm2 <= 0) {
    throw new RangeError(`calculateGlueUpTime: jointAreaMm2 must be > 0, got ${jointAreaMm2}`);
  }
  if (jointCount < 1) {
    throw new RangeError(`calculateGlueUpTime: jointCount must be >= 1, got ${jointCount}`);
  }

  const base = BASE_TIMING[glueType];

  // Temperature factor: every 5°C below reference adds 25% to cure/clamp;
  // every 5°C above subtracts 15%
  const tempDelta = temperatureC - REFERENCE_TEMP_C;
  const tempFactor = tempDelta < 0 ? 1 + (Math.abs(tempDelta) / 5) * 0.25 : 1 - Math.min((tempDelta / 5) * 0.15, 0.6);

  // Humidity factor: polyurethane cures faster with humidity;
  // PVA/hide slower with high humidity
  const humDelta = humidityPercent - REFERENCE_HUMIDITY;
  let humFactor = 1;
  if (glueType === 'polyurethane') {
    humFactor = humDelta > 0 ? 1 - (humDelta / 100) * 0.3 : 1 + (Math.abs(humDelta) / 100) * 0.3;
  } else if (glueType === 'pva' || glueType === 'hide') {
    humFactor = humDelta > 0 ? 1 + (humDelta / 100) * 0.2 : 1;
  }

  const factor = Math.max(tempFactor * humFactor, 0.4);

  const openTimeMin = Math.round(base.open * factor);
  const clampTimeMin = Math.round(base.clamp * factor);
  const cureTimeHours = round1(base.cure * factor);
  const recommendedPsi = base.psi;

  // Clamps needed: (totalArea × psi) / clampForce
  // Convert mm² to in² (1 in² = 645.16 mm²)
  const totalAreaIn2 = (jointAreaMm2 * jointCount) / 645.16;
  const totalForceNeeded = totalAreaIn2 * recommendedPsi;
  const clampsNeeded = Math.max(Math.ceil(totalForceNeeded / CLAMP_FORCE_LB), 1);

  return {
    openTimeMin,
    clampTimeMin,
    cureTimeHours,
    recommendedPsi,
    clampsNeeded,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
