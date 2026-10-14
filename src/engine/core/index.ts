/** Curated public exports for the core engine domain. */

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
  Result,
  Ok,
  Err,
  HardwareCatalogEntry,
  Mm,
  Kg,
  Percent,
  JoineryType,
  OffcutEntry,
  DefectZone,
} from './types';

export { ok, err } from './types';

export { validateConfig, registerRule, unregisterRule, getCustomRules } from './validation.ts';

export type {
  ValidationIssue,
  ValidationSeverity,
  ValidationRule,
  ValidationContext,
  MaterialSubstitution,
  VendorHingeProfile,
} from './types';

export {
  registerPlugin,
  unregisterPlugin,
  getPlugins,
  applyPartsPlugins,
  applyConfigPlugins,
  applyValidationPlugins,
  getPluginContract,
  comparePluginApiVersions,
  getPluginApiCompatibility,
  PLUGIN_API_VERSION,
  PLUGIN_CONTRACT,
} from './plugin.ts';

export type {
  CabinetPlannerPlugin,
  PluginContract,
  PluginHookContract,
  PluginStability,
  PluginApiCompatibility,
} from './plugin.ts';

export { validateCabinetInZone, validateCabinetRowInZone, violationCodes } from './zone-validator';

export type {
  RoomZone as ZoneRoomZone,
  CabinetDimensions as ZoneCabinetDimensions,
  ZoneViolationCode,
  ZoneViolation,
  ZoneValidationResult,
} from './zone-validator';

export {
  extractExpressionDependencies,
  buildParameterDependencyGraph,
  parameterDependencyGraphToMermaid,
  evaluateNamedParameters,
} from './parameter-expressions';

export type { ParameterDependencyGraph, ParameterGraphEdge, ParameterEvaluationResult } from './parameter-expressions';

export { flattenLocale, auditLocale, auditAllLocales, formatAuditReport } from './i18n-audit';

export type { LocaleTree, FlatLocale, LocaleAuditResult, AuditReport } from './i18n-audit';

export { pluginEventBus, PluginEventBus } from './plugin.ts';

export type { PluginEventMap, PluginEventName, PluginEventHandler } from './plugin.ts';

export {
  PLUGIN_API_V2_VERSION,
  PLUGIN_LIFECYCLE_STATES,
  createPluginContext,
  isPluginV2,
  registerPluginV2,
  deactivatePlugin,
  activatePlugin,
  unregisterPluginV2,
  getRegistryEntries,
  getRegistryEntry,
  getActivePlugins,
  clearRegistryV2,
} from './plugin-v2';

export type {
  PluginLifecycleState,
  PluginContext,
  CabinetPlannerPluginV2,
  PluginRegistryEntry,
  RegistryResult,
} from './plugin-v2';

export {
  validateConstraints,
  applyConstraints,
  clampDimension,
  getDimensionRange,
  getDefaultConstraints,
} from './constraint-solver';

export type { DimensionField, ConstraintOp, DimensionConstraint, ConstraintViolation } from './constraint-solver';

export {
  relativeLuminance,
  contrastRatio,
  meetsContrastRequirement,
  meetsTargetSize,
  createAuditResult,
  addViolation,
  addPass,
  addIncomplete,
  buildAuditReport as buildA11yReport,
  formatAuditReport as formatA11yReport,
  getCriterion,
  getNewIn22Criteria,
  getRulesByCategory,
  getCriticalAndSeriousRules,
  WCAG_22_CRITERIA,
  AUDIT_RULES,
  MIN_TARGET_SIZE_PX,
} from './a11y-audit';

export type {
  WcagLevel,
  WcagCriterionId,
  AuditCategory,
  ViolationSeverity,
  AuditRule,
  AuditViolation,
  AuditPass,
  AuditIncomplete,
  AuditResult,
  AuditReport as A11yAuditReport,
  WcagCriterion,
} from './a11y-audit';
