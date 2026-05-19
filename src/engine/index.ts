/**
 * @packageDocumentation
 * Cabinet Planner engine public API.
 *
 * This barrel module re-exports every public symbol from the engine layer.
 * Third-party plugins should import exclusively from this module — never from
 * the individual engine files — to benefit from the versioned stability contract.
 *
 * @example
 * ```ts
 * import { registerPlugin, getPluginContract } from './engine';
 * import type { CabinetPlannerPlugin } from './engine';
 *
 * const myPlugin: CabinetPlannerPlugin = {
 *   id: 'com.example.my-plugin',
 *   name: 'My Plugin',
 *   version: '1.0.0',
 *   onPartsGenerated: (parts) => parts,
 * };
 * registerPlugin(myPlugin);
 * ```
 */
// Barrel export for the engine module
export type {
  Lang,
  Material,
  MaterialCategory,
  CabinetConfig,
  DerivedDimensions,
  DoorStyle,
  EdgeBanding,
  ShelfSpacing,
  HandleStyle,
  Part,
  HardwareItem,
  CutRect,
  CutSheet,
  OptimizationResult,
  SmartStrategy,
  OptimizationSuggestion,
  FurnitureType,
  DrawerSlideType,
  PanelMaterialSource,
  QuantitativeRationale,
} from './types';

export {
  MATERIALS,
  SAW_KERF,
  getMaterial,
  panelMaterials,
  backMaterials,
  DEFAULT_CONFIG,
  CONSTRAINTS,
} from './materials';

export {
  computeDimensions,
  computeHingesPerDoor,
  computeHingePositions,
  computeEqualShelfPositions,
} from './dimensions';

export { generateParts, computeEdgeBandingTotal } from './parts';

export { optimizeCutSheets } from './cut-optimizer';

export { findOptimizations } from './smart-optimizer';
export type { SmartOptimizerOptions } from './smart-optimizer';

export { estimateCost } from './cost-estimator';
export type { CostBreakdown, SheetCost, HardwareCost } from './cost-estimator';

export { validateConfig } from './validation';
export { findSubstitutions } from './substitution';
export type { ValidationIssue, ValidationSeverity, MaterialSubstitution, VendorHingeProfile } from './types';

export { generateHardware, VENDOR_HINGE_PROFILES } from './hardware';

export {
  registerPlugin,
  unregisterPlugin,
  getPlugins,
  applyPartsPlugins,
  applyConfigPlugins,
  getPluginContract,
  PLUGIN_CONTRACT,
} from './plugin';
export type { CabinetPlannerPlugin, PluginContract, PluginHookContract, PluginStability } from './plugin';
