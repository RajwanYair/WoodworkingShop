/**
 * Cabinet Weight Estimator — Sprint 192
 *
 * Estimates total cabinet weight from panel materials, hardware,
 * and optional contents. Critical for wall-mounting load calculations,
 * selecting appropriate fasteners, and determining if structural
 * reinforcement is needed.
 */

/** Material density data (kg/m³). */
export const MATERIAL_DENSITIES = {
  particle_board: 650,
  mdf: 750,
  plywood_birch: 680,
  plywood_poplar: 420,
  solid_oak: 720,
  solid_maple: 705,
  solid_walnut: 610,
  solid_cherry: 560,
  solid_pine: 510,
  solid_ash: 670,
  melamine: 680,
  hdf: 900,
  osb: 600,
} as const;

/** Known panel material type. */
export type PanelMaterial = keyof typeof MATERIAL_DENSITIES;

/** A panel (part) with dimensions and material. */
export interface WeightPanel {
  readonly label: string;
  readonly widthMm: number;
  readonly heightMm: number;
  readonly thicknessMm: number;
  readonly material: PanelMaterial | number;
  readonly quantity: number;
}

/** Hardware item with known weight. */
export interface WeightHardware {
  readonly label: string;
  readonly weightGrams: number;
  readonly quantity: number;
}

/** Weight estimation result. */
export interface WeightEstimate {
  /** Total panel weight in kg. */
  readonly panelWeightKg: number;
  /** Total hardware weight in kg. */
  readonly hardwareWeightKg: number;
  /** Combined empty weight in kg. */
  readonly totalEmptyKg: number;
  /** Estimated loaded weight (with contents) in kg. */
  readonly totalLoadedKg: number;
  /** Per-panel weight breakdown. */
  readonly panelBreakdown: readonly PanelWeight[];
  /** Recommended wall fastener category. */
  readonly fastenerCategory: FastenerCategory;
  /** Whether structural reinforcement is recommended. */
  readonly reinforcementNeeded: boolean;
}

/** Individual panel weight info. */
export interface PanelWeight {
  readonly label: string;
  readonly weightKg: number;
  readonly quantity: number;
  readonly totalKg: number;
}

/** Fastener strength categories based on total loaded weight. */
export type FastenerCategory = 'light' | 'medium' | 'heavy' | 'structural';

/**
 * Estimate total cabinet weight from panels and hardware.
 *
 * @param panels - Array of panel parts with dimensions and material
 * @param hardware - Array of hardware items with weights
 * @param contentsKg - Estimated weight of cabinet contents (shelved items)
 * @returns Weight estimate with breakdown and fastener recommendation
 * @throws RangeError if panels is empty or any dimension ≤ 0
 */
export function estimateCabinetWeight(
  panels: readonly WeightPanel[],
  hardware: readonly WeightHardware[],
  contentsKg: number = 0,
): WeightEstimate {
  if (panels.length === 0) {
    throw new RangeError('estimateCabinetWeight: panels array must not be empty');
  }
  if (contentsKg < 0) {
    throw new RangeError(`estimateCabinetWeight: contentsKg must be ≥ 0, got ${contentsKg}`);
  }

  const panelBreakdown: PanelWeight[] = [];
  let panelWeightKg = 0;

  for (const panel of panels) {
    if (panel.widthMm <= 0 || panel.heightMm <= 0 || panel.thicknessMm <= 0) {
      throw new RangeError(`estimateCabinetWeight: panel "${panel.label}" has non-positive dimensions`);
    }
    if (panel.quantity < 1) {
      throw new RangeError(`estimateCabinetWeight: panel "${panel.label}" quantity must be ≥ 1, got ${panel.quantity}`);
    }

    const density = typeof panel.material === 'number' ? panel.material : MATERIAL_DENSITIES[panel.material];

    // Volume in m³
    const volumeM3 = (panel.widthMm / 1000) * (panel.heightMm / 1000) * (panel.thicknessMm / 1000);

    const singleKg = volumeM3 * density;
    const totalKg = singleKg * panel.quantity;

    panelBreakdown.push({
      label: panel.label,
      weightKg: Math.round(singleKg * 1000) / 1000,
      quantity: panel.quantity,
      totalKg: Math.round(totalKg * 1000) / 1000,
    });

    panelWeightKg += totalKg;
  }

  let hardwareWeightKg = 0;
  for (const item of hardware) {
    hardwareWeightKg += (item.weightGrams / 1000) * item.quantity;
  }

  const totalEmptyKg = panelWeightKg + hardwareWeightKg;
  const totalLoadedKg = totalEmptyKg + contentsKg;

  const fastenerCategory = categorizeFastener(totalLoadedKg);
  const reinforcementNeeded = totalLoadedKg > 50;

  return {
    panelWeightKg: Math.round(panelWeightKg * 100) / 100,
    hardwareWeightKg: Math.round(hardwareWeightKg * 100) / 100,
    totalEmptyKg: Math.round(totalEmptyKg * 100) / 100,
    totalLoadedKg: Math.round(totalLoadedKg * 100) / 100,
    panelBreakdown,
    fastenerCategory,
    reinforcementNeeded,
  };
}

/**
 * Categorize required fastener strength based on loaded weight.
 *
 * @param loadedKg - Total loaded weight in kg
 * @returns Fastener category recommendation
 */
export function categorizeFastener(loadedKg: number): FastenerCategory {
  if (loadedKg <= 15) return 'light';
  if (loadedKg <= 35) return 'medium';
  if (loadedKg <= 70) return 'heavy';
  return 'structural';
}

/**
 * Calculate the maximum safe shelf load based on span and material.
 *
 * @param spanMm - Unsupported span in mm
 * @param depthMm - Shelf depth in mm
 * @param thicknessMm - Shelf thickness in mm
 * @param material - Panel material (affects stiffness)
 * @returns Maximum recommended load in kg before visible deflection
 * @throws RangeError if any dimension ≤ 0
 */
export function maxShelfLoad(
  spanMm: number,
  depthMm: number,
  thicknessMm: number,
  material: PanelMaterial | number,
): number {
  if (spanMm <= 0) {
    throw new RangeError(`maxShelfLoad: spanMm must be > 0, got ${spanMm}`);
  }
  if (depthMm <= 0) {
    throw new RangeError(`maxShelfLoad: depthMm must be > 0, got ${depthMm}`);
  }
  if (thicknessMm <= 0) {
    throw new RangeError(`maxShelfLoad: thicknessMm must be > 0, got ${thicknessMm}`);
  }

  // Simplified beam deflection: max load ∝ (thickness³ × depth) / span³
  // Stiffness factors relative to plywood_birch (1.0)
  const stiffnessFactors: Record<PanelMaterial, number> = {
    particle_board: 0.5,
    mdf: 0.6,
    plywood_birch: 1.0,
    plywood_poplar: 0.75,
    solid_oak: 1.2,
    solid_maple: 1.15,
    solid_walnut: 1.0,
    solid_cherry: 0.95,
    solid_pine: 0.7,
    solid_ash: 1.1,
    melamine: 0.55,
    hdf: 0.65,
    osb: 0.45,
  };

  const stiffness = typeof material === 'number' ? material : stiffnessFactors[material];

  // Empirical formula calibrated so 18mm plywood at 800mm span ≈ 25kg
  const loadKg = (stiffness * thicknessMm ** 3 * depthMm) / (spanMm ** 2 * 0.035);

  return Math.round(loadKg * 10) / 10;
}
