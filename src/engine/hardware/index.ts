/**
 * Phase 12 / Sprint 8 — Engine hardware sub-module barrel.
 * Covers: hardware item generation, material substitution recommendations.
 *
 * @example
 * ```ts
 * import { generateHardware, findSubstitutions } from '../engine/hardware';
 * ```
 */
export { generateHardware, VENDOR_HINGE_PROFILES } from './hardware.ts';

export { findSubstitutions } from './substitution.ts';

export { getHardwareCatalog, getHardwareCatalogByCategory, getHardwareCatalogEntry } from './hardware.ts';

export { calculateHingeBoreSpec, hingeCount, formatHingeBoreSpecSummary } from './hinge-bore';

export type { HingeBoreSpec, HingeBorePosition, HingeBoreError } from './hinge-bore';

export { validateDrawerRunner, getDrawerRunnerSpec, getAllDrawerRunnerSpecs } from './drawer-runner';

export type { DrawerRunnerSpec, DrawerRunnerValidation, DrawerRunnerError } from './drawer-runner';

export { HARDWARE_CATALOGUE, calculateHardwareBom, totalHardwarePieces } from './hardware-spec';

export type { HardwareCatalogueItem, HardwareCategory, HardwareQuantityInput, HardwareBomLine } from './hardware-spec';

export { EDGE_PROFILE_SPECS, calculateEdgeBandBom, totalEdgeBandMetres, getEdgeProfileSpec } from './edge-profile';

export type { EdgeProfile, EdgeProfileSpec, PanelEdges, EdgeBandPanel, EdgeBandBomLine } from './edge-profile';

export {
  filterHardware,
  sortHardware,
  calculateHardwareCost,
  getManufacturers,
  getCategories as getHardwareCategories,
  validateHardwareItem,
} from './hardware-catalog';

export type {
  HardwareCategory as HardwareCatalogCategory,
  HardwareItem as HardwareCatalogItem,
  HardwareAssignment,
  HardwareFilter,
  HardwareSortField,
  SortDirection as HardwareCatalogSortDirection,
  HardwareCostLine,
  HardwareCostSummary,
} from './hardware-catalog';

export { calculateDrawerSlide, findRecommendedSlideLength, STANDARD_SLIDE_LENGTHS } from './drawer-slide';

export type {
  SlideMountStyle,
  SlideExtension,
  SlideLengthMm,
  DrawerSlideInput,
  DrawerSlideResult,
} from './drawer-slide';
