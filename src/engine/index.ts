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

export {
  generateParts,
  computeEdgeBandingTotal,
} from './parts';

export { generateHardware } from './hardware';

export { optimizeCutSheets } from './cut-optimizer';

export { findOptimizations } from './smart-optimizer';
