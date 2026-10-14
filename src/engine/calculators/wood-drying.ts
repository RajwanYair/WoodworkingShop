/**
 * Wood Drying Time Estimator — Sprint 203
 *
 * Estimates air-drying and kiln-drying times for green lumber based on
 * thickness, species density, initial/target moisture content, and
 * environmental conditions.
 */

/** Drying method type. */
export type DryingMethod = 'air_dry' | 'kiln_dry';

/** Wood species density category affecting drying rate. */
export type SpeciesDensityClass = 'softwood' | 'medium_hardwood' | 'dense_hardwood';

/** Drying rate multipliers by species density class (days per mm per %MC for air drying). */
const SPECIES_RATE: Record<SpeciesDensityClass, number> = {
  softwood: 0.15,
  medium_hardwood: 0.25,
  dense_hardwood: 0.4,
};

/** Input for wood drying time estimation. */
export interface WoodDryingInput {
  /** Board thickness (mm). */
  readonly thicknessMm: number;
  /** Species density class. */
  readonly speciesClass: SpeciesDensityClass;
  /** Initial moisture content (%). */
  readonly initialMoisturePercent: number;
  /** Target moisture content (%). */
  readonly targetMoisturePercent: number;
  /** Drying method. */
  readonly method: DryingMethod;
  /** Average ambient temperature during drying (°C). Air dry only. */
  readonly ambientTempC?: number;
  /** Kiln temperature (°C). Kiln dry only. */
  readonly kilnTempC?: number;
}

/** Result of wood drying time estimation. */
export interface WoodDryingResult {
  /** Estimated drying time in days. */
  readonly estimatedDays: number;
  /** Estimated drying time in weeks (rounded). */
  readonly estimatedWeeks: number;
  /** Moisture content reduction (%). */
  readonly moistureReductionPercent: number;
  /** Drying method used. */
  readonly method: DryingMethod;
  /** Risk of defects at this drying rate. */
  readonly defectRisk: 'low' | 'moderate' | 'high';
  /** Recommended final equalization days. */
  readonly equalizationDays: number;
}

/**
 * Estimate wood drying time.
 *
 * Air drying rule of thumb: ~1 year per 25mm thickness for hardwoods at
 * moderate climate. This calculator refines with species, temperature, and
 * actual moisture delta.
 *
 * Kiln drying is typically 6–10× faster than air drying depending on
 * kiln temperature and species.
 *
 * @param input - Lumber and drying parameters
 * @returns Estimated drying time and risk assessment
 * @throws RangeError for invalid parameters
 */
export function estimateWoodDryingTime(input: WoodDryingInput): WoodDryingResult {
  const {
    thicknessMm,
    speciesClass,
    initialMoisturePercent,
    targetMoisturePercent,
    method,
    ambientTempC = 20,
    kilnTempC = 60,
  } = input;

  if (thicknessMm <= 0) {
    throw new RangeError(`estimateWoodDryingTime: thicknessMm must be > 0, got ${thicknessMm}`);
  }
  if (initialMoisturePercent <= 0 || initialMoisturePercent > 200) {
    throw new RangeError(`estimateWoodDryingTime: initialMoisturePercent must be 0–200, got ${initialMoisturePercent}`);
  }
  if (targetMoisturePercent < 0 || targetMoisturePercent >= initialMoisturePercent) {
    throw new RangeError(
      `estimateWoodDryingTime: targetMoisturePercent must be >= 0 and < initialMoisturePercent, got ${targetMoisturePercent}`,
    );
  }
  if (method === 'air_dry' && ambientTempC <= 0) {
    throw new RangeError(`estimateWoodDryingTime: ambientTempC must be > 0 for air drying, got ${ambientTempC}`);
  }
  if (method === 'kiln_dry' && kilnTempC <= 0) {
    throw new RangeError(`estimateWoodDryingTime: kilnTempC must be > 0 for kiln drying, got ${kilnTempC}`);
  }

  const moistureReductionPercent = initialMoisturePercent - targetMoisturePercent;
  const baseRate = SPECIES_RATE[speciesClass];

  let estimatedDays: number;

  if (method === 'air_dry') {
    // Base formula: rate × thickness × moisture delta
    // Adjusted by temperature factor (reference = 20°C)
    const tempFactor = 20 / ambientTempC;
    estimatedDays = baseRate * thicknessMm * moistureReductionPercent * tempFactor;
  } else {
    // Kiln drying is significantly faster
    // Higher kiln temp = faster drying (reference = 60°C)
    const kilnFactor = 60 / kilnTempC;
    const kilnSpeedMultiplier = 8; // Kiln is ~8x faster than air on average
    estimatedDays = (baseRate * thicknessMm * moistureReductionPercent * kilnFactor) / kilnSpeedMultiplier;
  }

  estimatedDays = Math.round(estimatedDays * 10) / 10;
  const estimatedWeeks = Math.ceil(estimatedDays / 7);

  // Defect risk assessment
  const daysPerMm = estimatedDays / thicknessMm;
  const defectRisk = assessDefectRisk(method, daysPerMm, speciesClass);

  // Equalization: 1 day per 25mm for kiln, 0 for air (already equalized)
  const equalizationDays = method === 'kiln_dry' ? Math.ceil(thicknessMm / 25) : 0;

  return {
    estimatedDays,
    estimatedWeeks,
    moistureReductionPercent,
    method,
    defectRisk,
    equalizationDays,
  };
}

/**
 * Assess defect risk based on drying speed.
 * Fast drying (low days/mm) increases risk of checking, splitting, and warping.
 */
function assessDefectRisk(
  method: DryingMethod,
  daysPerMm: number,
  speciesClass: SpeciesDensityClass,
): 'low' | 'moderate' | 'high' {
  if (method === 'air_dry') {
    // Air drying is generally safe if slow enough
    return daysPerMm >= 2 ? 'low' : daysPerMm >= 1 ? 'moderate' : 'high';
  }

  // Kiln drying thresholds depend on species
  const threshold = speciesClass === 'dense_hardwood' ? 0.5 : 0.3;
  if (daysPerMm >= threshold) return 'low';
  if (daysPerMm >= threshold * 0.5) return 'moderate';
  return 'high';
}

/**
 * Calculate equilibrium moisture content (EMC) for given temperature and humidity.
 *
 * Uses simplified Hailwood-Horrobin equation approximation.
 *
 * @param temperatureC - Ambient temperature (°C)
 * @param relativeHumidityPercent - Relative humidity (0–100%)
 * @returns EMC as a percentage
 */
export function calculateEMC(temperatureC: number, relativeHumidityPercent: number): number {
  if (temperatureC < -20 || temperatureC > 100) {
    throw new RangeError(`calculateEMC: temperatureC must be -20 to 100, got ${temperatureC}`);
  }
  if (relativeHumidityPercent < 0 || relativeHumidityPercent > 100) {
    throw new RangeError(`calculateEMC: relativeHumidityPercent must be 0–100, got ${relativeHumidityPercent}`);
  }

  const h = relativeHumidityPercent / 100;
  if (h === 0) return 0;
  // Simpson's approximation for EMC (valid 5–95% RH, 5–50°C)
  // EMC ≈ k × h / (1 - h) adjusted for temperature
  const tempK = temperatureC + 273.15;
  const k = 330 / tempK; // ~1.12 at 20°C
  const raw = k * (h / (1 - h + 0.01));
  // Typical EMC ranges from ~3% (low RH) to ~28% (very high RH)
  const emc = Math.min(raw * 6.5, 30);
  return Math.round(emc * 10) / 10;
}
