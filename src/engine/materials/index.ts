/**
 * Phase 12 / Sprint 8 — Engine materials sub-module barrel.
 * Covers: material catalog, cabinet templates, cost estimation.
 *
 * @example
 * ```ts
 * import { getMaterial, DEFAULT_CONFIG, estimateCost } from '../engine/materials';
 * ```
 */
export {
  MATERIALS,
  SAW_KERF,
  getMaterial,
  getMaterialResult,
  panelMaterials,
  backMaterials,
  DEFAULT_CONFIG,
  CONSTRAINTS,
  HARD_LIMITS,
  computePartWeightKg,
} from '../materials.ts';

export { TEMPLATES, getTemplate, getTemplateDefaults } from '../templates.ts';
export type { CabinetTemplate } from '../templates.ts';

export { estimateCost, DEFAULT_LABOUR_RATE } from '../cost-estimator.ts';
export type { CostBreakdown, SheetCost, HardwareCost } from '../cost-estimator.ts';
