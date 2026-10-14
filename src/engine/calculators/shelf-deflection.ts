/**
 * Shelf Sag / Deflection Calculator — Sprint 206
 *
 * Calculates shelf deflection (sag) under load using beam theory.
 * Supports uniform distributed load, center point load, and combined.
 * Uses material elastic modulus and cross-section moment of inertia.
 */

/** Load distribution type. */
export type LoadType = 'uniform' | 'center' | 'combined';

/** Common shelf material with elastic modulus. */
export type ShelfMaterial = 'solidWood' | 'plywood' | 'mdf' | 'particleboard' | 'melamine' | 'custom';

/** Elastic modulus values (MPa) for common materials. */
const ELASTIC_MODULUS: Record<Exclude<ShelfMaterial, 'custom'>, number> = {
  solidWood: 11000,
  plywood: 8300,
  mdf: 3500,
  particleboard: 2500,
  melamine: 2800,
} as const;

/** Input for deflection calculation. */
export interface DeflectionInput {
  /** Shelf span / unsupported length (mm). */
  readonly spanMm: number;
  /** Shelf width / depth front-to-back (mm). */
  readonly widthMm: number;
  /** Shelf thickness (mm). */
  readonly thicknessMm: number;
  /** Material type. */
  readonly material: ShelfMaterial;
  /** Custom elastic modulus (MPa) — required when material is 'custom'. */
  readonly customModulusMPa?: number;
  /** Load type. */
  readonly loadType: LoadType;
  /** Total load on shelf (N). Use kg×9.81 to convert from kg. */
  readonly loadN: number;
  /** Support type: simple (both ends) or fixed (built-in). */
  readonly support: 'simple' | 'fixed';
}

/** Result of deflection calculation. */
export interface DeflectionResult {
  /** Maximum deflection at center (mm). */
  readonly maxDeflectionMm: number;
  /** Moment of inertia (mm⁴). */
  readonly momentOfInertiaMm4: number;
  /** Elastic modulus used (MPa). */
  readonly modulusMPa: number;
  /** Whether deflection exceeds L/200 recommended limit. */
  readonly exceedsLimit: boolean;
  /** Recommended maximum span for this load (mm). */
  readonly recommendedMaxSpanMm: number;
  /** Deflection ratio (span / deflection). Higher is better. */
  readonly deflectionRatio: number;
  /** Span-to-thickness ratio (informational). */
  readonly spanThicknessRatio: number;
}

/**
 * Calculate shelf deflection under load.
 *
 * Uses Euler-Bernoulli beam theory:
 * - Uniform load, simple supports: δ = 5·w·L⁴ / (384·E·I)
 * - Center point load, simple supports: δ = P·L³ / (48·E·I)
 * - Fixed supports reduce deflection by factor of 5 (uniform) or 4 (center)
 *
 * @param input - Shelf dimensions, material, and loading
 * @returns Deflection result with recommendations
 * @throws RangeError for invalid inputs
 */
export function calculateDeflection(input: DeflectionInput): DeflectionResult {
  const { spanMm, widthMm, thicknessMm, material, loadType, loadN, support } = input;

  if (spanMm <= 0) {
    throw new RangeError(`calculateDeflection: spanMm must be > 0, got ${spanMm}`);
  }
  if (widthMm <= 0) {
    throw new RangeError(`calculateDeflection: widthMm must be > 0, got ${widthMm}`);
  }
  if (thicknessMm <= 0) {
    throw new RangeError(`calculateDeflection: thicknessMm must be > 0, got ${thicknessMm}`);
  }
  if (loadN < 0) {
    throw new RangeError(`calculateDeflection: loadN must be >= 0, got ${loadN}`);
  }

  const modulusMPa = getModulus(material, input.customModulusMPa);

  // Moment of inertia for rectangular cross-section: I = b·h³/12
  const momentOfInertiaMm4 = (widthMm * Math.pow(thicknessMm, 3)) / 12;

  // EI product (N·mm²)
  const EI = modulusMPa * momentOfInertiaMm4;

  // Deflection calculation
  let maxDeflectionMm: number;

  if (loadType === 'uniform' || loadType === 'combined') {
    // w = load per unit length (N/mm)
    const w = loadN / spanMm;
    const uniformDeflection = (5 * w * Math.pow(spanMm, 4)) / (384 * EI);

    if (loadType === 'combined') {
      // Combined = 70% uniform + 30% center point
      const centerDeflection = (loadN * 0.3 * Math.pow(spanMm, 3)) / (48 * EI);
      const uniformPortion = (5 * ((loadN * 0.7) / spanMm) * Math.pow(spanMm, 4)) / (384 * EI);
      maxDeflectionMm = uniformPortion + centerDeflection;
    } else {
      maxDeflectionMm = uniformDeflection;
    }
  } else {
    // Center point load: δ = P·L³ / (48·E·I)
    maxDeflectionMm = (loadN * Math.pow(spanMm, 3)) / (48 * EI);
  }

  // Fixed supports reduce deflection
  if (support === 'fixed') {
    maxDeflectionMm = loadType === 'center' ? maxDeflectionMm / 4 : maxDeflectionMm / 5;
  }

  maxDeflectionMm = round2(maxDeflectionMm);

  // L/200 is a common serviceability limit for shelves
  const exceedsLimit = maxDeflectionMm > spanMm / 200;

  // Deflection ratio
  const deflectionRatio = maxDeflectionMm > 0 ? Math.round(spanMm / maxDeflectionMm) : Infinity;

  // Recommended max span: solve for L where δ = L/200
  const recommendedMaxSpanMm = calculateMaxSpan(widthMm, thicknessMm, modulusMPa, loadN, loadType, support);

  const spanThicknessRatio = round2(spanMm / thicknessMm);

  return {
    maxDeflectionMm,
    momentOfInertiaMm4: round2(momentOfInertiaMm4),
    modulusMPa,
    exceedsLimit,
    recommendedMaxSpanMm,
    deflectionRatio,
    spanThicknessRatio,
  };
}

/**
 * Get the elastic modulus for a material.
 *
 * @param material - Material type
 * @param customMPa - Custom modulus (required if material = 'custom')
 * @returns Elastic modulus in MPa
 * @throws RangeError if custom material has no modulus
 */
export function getModulus(material: ShelfMaterial, customMPa?: number): number {
  if (material === 'custom') {
    if (customMPa === undefined || customMPa <= 0) {
      throw new RangeError(`getModulus: customModulusMPa must be > 0 for custom material, got ${customMPa}`);
    }
    return customMPa;
  }
  return ELASTIC_MODULUS[material];
}

/** Calculate max span where deflection = L/200. Uses iterative approach. */
function calculateMaxSpan(
  widthMm: number,
  thicknessMm: number,
  modulusMPa: number,
  loadN: number,
  loadType: LoadType,
  support: 'simple' | 'fixed',
): number {
  if (loadN === 0) return Infinity;

  const I = (widthMm * Math.pow(thicknessMm, 3)) / 12;
  const EI = modulusMPa * I;
  const fixedDiv = support === 'fixed' ? (loadType === 'center' ? 4 : 5) : 1;

  // For uniform: δ = 5wL⁴/(384·EI), set δ = L/200
  // → L/200 = 5·(F/L)·L⁴ / (384·EI) → L³ = 384·EI / (1000·F) × fixedDiv
  if (loadType === 'uniform') {
    const L3 = (384 * EI * fixedDiv) / (1000 * loadN);
    return Math.round(Math.pow(L3, 1 / 3));
  }

  // For center: δ = P·L³/(48·EI), set δ = L/200
  // → L² = 48·EI·fixedDiv / (200·P)
  if (loadType === 'center') {
    const L2 = (48 * EI * fixedDiv) / (200 * loadN);
    return Math.round(Math.sqrt(L2));
  }

  // Combined: approximate with uniform formula (conservative)
  const L3 = (384 * EI * fixedDiv) / (1000 * loadN);
  return Math.round(Math.pow(L3, 1 / 3));
}

/** Round to 2 decimal places. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
