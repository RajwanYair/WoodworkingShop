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
  BOOKSHELF_DEFAULTS,
  CABINET_DEFAULTS,
  DESK_DEFAULTS,
  WARDROBE_DEFAULTS,
  PANEL_DEFAULTS,
} from './materials.ts';

export {
  TEMPLATES,
  getConfiguratorTemplate as getTemplate,
  getConfiguratorTemplateDefaults as getTemplateDefaults,
} from '../project/templates/index';
export type { ConfiguratorCabinetTemplate as CabinetTemplate } from '../project/templates/index';

export { estimateCost, DEFAULT_LABOUR_RATE } from '../costing/index.ts';
export type { CostBreakdown, SheetCost, HardwareCost } from '../costing/index.ts';

export {
  MATERIAL_TEXTURES,
  MATERIAL_TEXTURE_IDS,
  getMaterialTexture,
  getMaterialTextureId,
  buildSvgPatternDefs,
} from './material-textures';

export type { MaterialTexture, MaterialTextureId, GrainLine } from './material-textures';

export { CATALOG_SCHEMA_VERSION, parseCommunityMaterial, validateCommunityCatalog } from './community-catalog';

export type { CommunityMaterial, CommunityCatalog, CatalogCurrencyCode } from './community-catalog';

export {
  MANUFACTURER_API_VERSION,
  validateManufacturerInfo,
  validateManufacturerMaterial,
  validateManufacturerCatalog,
  filterMaterials,
  mergeCatalogs,
} from './manufacturer-catalog';

export type {
  ManufacturerInfo,
  MaterialCategory as ManufacturerMaterialCategory,
  ManufacturerMaterial,
  ManufacturerCatalog,
  MaterialFilter,
} from './manufacturer-catalog';

export {
  hexToLinearRgb,
  lerpColor,
  blendPbrMaterials,
  getPbrMaterial,
  getAllPbrMaterials,
  getHardwarePbrMaterial,
  getAllHardwareFinishes,
  EDGE_BANDING_MATERIAL,
  FALLBACK_PBR_MATERIAL,
} from './pbr-materials';

export type { PbrColor, HardwareFinish, PbrMaterial } from './pbr-materials';

export {
  optimizeYield,
  groupByMaterial,
  calculateTotalArea,
  findCompatibleOffCuts,
  formatSavings,
  MAX_DEMANDS,
  MAX_OFFCUTS,
  DEFAULT_YIELD_CONFIG,
} from './material-yield';

export type { MaterialDemand, OffCut, YieldAllocation, YieldMetrics, YieldResult, YieldConfig } from './material-yield';
