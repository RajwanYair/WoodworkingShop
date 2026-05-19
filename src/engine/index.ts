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

export { estimateCost } from './cost-estimator';
export type { CostBreakdown, SheetCost } from './cost-estimator';

export { validateConfig } from './validation';
export { findSubstitutions } from './substitution';
export type { ValidationIssue, ValidationSeverity, MaterialSubstitution, VendorHingeProfile } from './types';

export { generateHardware, VENDOR_HINGE_PROFILES } from './hardware';
