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

export {
  MATERIALS,
  SAW_KERF,
  getMaterial,
  getMaterialResult,
  panelMaterials,
  backMaterials,
  DEFAULT_CONFIG,
  CONSTRAINTS,
} from './materials.ts';

export {
  computeDimensions,
  computeHingesPerDoor,
  computeHingePositions,
  computeEqualShelfPositions,
} from './dimensions';

export { generateParts, computeEdgeBandingTotal, computePartsWeight } from './parts';

export { optimizeCutSheets, optimizeCutSheetsResult } from './cut-optimizer';

export { findOptimizations } from './smart-optimizer';
export type { SmartOptimizerOptions } from './smart-optimizer';

export { estimateCost } from './cost-estimator';
export type { CostBreakdown, SheetCost, HardwareCost } from './cost-estimator';

export { validateConfig, registerRule, unregisterRule, getCustomRules } from './validation.ts';
export { findSubstitutions } from './substitution';
export type {
  ValidationIssue,
  ValidationSeverity,
  ValidationRule,
  ValidationContext,
  MaterialSubstitution,
  VendorHingeProfile,
} from './types';

export {
  generateHardware,
  VENDOR_HINGE_PROFILES,
  getHardwareCatalog,
  getHardwareCatalogByCategory,
  getHardwareCatalogEntry,
} from './hardware.ts';

export {
  registerPlugin,
  unregisterPlugin,
  getPlugins,
  applyPartsPlugins,
  applyConfigPlugins,
  applyValidationPlugins,
  getPluginContract,
  PLUGIN_CONTRACT,
} from './plugin.ts';
export type { CabinetPlannerPlugin, PluginContract, PluginHookContract, PluginStability } from './plugin.ts';

export { generateAssemblySteps, buildAssemblyDAG } from './assembly.ts';
export type { AssemblyStep, RawStep } from './assembly.ts';

export { calculateHingeBoreSpec, hingeCount, formatHingeBoreSpecSummary } from './hinge-bore';
export type { HingeBoreSpec, HingeBorePosition, HingeBoreError } from './hinge-bore';

export { validateDrawerRunner, getDrawerRunnerSpec, getAllDrawerRunnerSpecs } from './drawer-runner';
export type { DrawerRunnerSpec, DrawerRunnerValidation, DrawerRunnerError } from './drawer-runner';

export { assignPartLabels, buildPartLabelMap, formatPartLabelsAsCsv } from './part-labeling';
export type { LabeledPart, LabelingOptions } from './part-labeling';

export { generateCostVarianceReport, formatCostVarianceReportAsCsv } from './cost-variance';
export type { MaterialCostEntry, CostVarianceLine, CostVarianceReport } from './cost-variance';

export { calculateShelfSpacing, getShelfPresets, getShelfPreset, SHELF_PRESETS } from './shelf-spacing';
export type { ShelfPresetId, ShelfPreset, ShelfSpacingResult } from './shelf-spacing';

export { getJointSpec, validateJointCompatibility, getAllJointSpecs } from './joint-detail';
export type { JointSpec, JointDimensions, JointConstraints } from './joint-detail';

export {
  createNoteStore,
  addNote,
  updateNote,
  deleteNote,
  getNotesForCabinet,
  getNotesForPart,
  getProjectNotes,
  formatNotesForExport,
  MAX_NOTE_LENGTH,
} from './cabinet-notes';
export type { CabinetNote, NoteStore, NoteScope, NoteError } from './cabinet-notes';

export { analyseWaste, formatWasteReport, DEFAULT_WASTE_THRESHOLDS } from './waste-alert';
export type { SheetWasteInput, WasteThresholds, WasteAlert, WasteAnalysisReport, WasteAlertLevel } from './waste-alert';

export { buildCutPlanSummary, formatCutPlanSummary } from './cut-plan-summary';
export type { SheetPlanInput, MaterialSummary, CutPlanSummary } from './cut-plan-summary';

export { filterBomParts, getBomMaterials, getBomPartTypes, getBomZones, totalPartCount } from './bom-filter';
export type { BomFilterablePart, BomFilterCriteria } from './bom-filter';

export { resolveGrainConflicts, hasGrainConflicts } from './grain-conflict';
export type { GrainCheckPart, GrainConflict, GrainConflictCode, GrainConflictOptions } from './grain-conflict';

export { estimateStepTime, estimateAssemblyTime, getActionRate } from './assembly-timer';
export type { AssemblyActionType, TimerStep, TimedStep, AssemblyTimeEstimate } from './assembly-timer';

export {
  createStockStore,
  addStockItem,
  updateOnHand,
  checkAvailability,
  getShortfalls,
  formatAvailabilityReport,
} from './stock-tracker';
export type { StockItem, StockStore, StockUnit, DemandEntry, AvailabilityResult, StockStatus } from './stock-tracker';

export { sortParts, sortPartsByPreset, invertSortCriteria, SORT_PRESETS } from './part-sort';
export type { SortablePart, SortKey, SortDirection, SortCriterion, SortPreset } from './part-sort';

export {
  createSnapshotStore,
  addSnapshot,
  removeSnapshot,
  renameSnapshot,
  findSnapshotByLabel,
  getSnapshotsSorted,
  snapshotDiffSummary,
  MAX_SNAPSHOT_LABEL_LENGTH,
} from './snapshot-tags';
export type { SnapshotTag, SnapshotStore, SnapshotError } from './snapshot-tags';

export {
  EXPORT_FORMATS,
  getFormatsByCategory,
  getAvailableFormats,
  getExportFormat,
  describeFormat,
} from './export-format';
export type { ExportFormatId, ExportCategory, ExportFormat } from './export-format';

export { HARDWARE_CATALOGUE, calculateHardwareBom, totalHardwarePieces } from './hardware-spec';
export type { HardwareCatalogueItem, HardwareCategory, HardwareQuantityInput, HardwareBomLine } from './hardware-spec';

export { EDGE_PROFILE_SPECS, calculateEdgeBandBom, totalEdgeBandMetres, getEdgeProfileSpec } from './edge-profile';
export type { EdgeProfile, EdgeProfileSpec, PanelEdges, EdgeBandPanel, EdgeBandBomLine } from './edge-profile';

export {
  KERF_PROFILES,
  compensateDimension,
  compensatePart,
  estimateKerfLoss,
  kerfLossPercent,
  getKerfProfile,
} from './kerf';
export type { KerfProfile, KerfPart, KerfCompensatedPart } from './kerf';

export { validateCabinetInZone, validateCabinetRowInZone, violationCodes } from './zone-validator';
export type {
  RoomZone as ZoneRoomZone,
  CabinetDimensions as ZoneCabinetDimensions,
  ZoneViolationCode,
  ZoneViolation,
  ZoneValidationResult,
} from './zone-validator';

export {
  STANDARD_CLEARANCES,
  getEffectiveClearance,
  validateApplianceClearance,
  validateAllApplianceClearances,
  getClearanceSummary,
} from './appliance-clearance';
export type {
  ApplianceType,
  ClearanceSpec,
  AppliancePlacement,
  Obstacle,
  ClearanceSide,
  ClearanceViolation,
  ClearanceValidationResult,
} from './appliance-clearance';

export {
  TEMPLATE_CATALOGUE,
  getTemplatesByCategory,
  getTemplate,
  instantiateTemplate as instantiateLibraryTemplate,
  listTemplateIds,
} from './template-library';
export type {
  TemplateCategory,
  TemplateDimensions,
  CabinetTemplate,
  TemplateInstance as LibraryTemplateInstance,
} from './template-library';

export { batchReplaceMaterial, listMaterials, countByMaterial } from './batch-replace';
export type { BatchPart, BatchReplaceOptions, BatchReplaceResult } from './batch-replace';

export { DEFAULT_PROJECT_SETTINGS, mergeSettings, validateSettings, describeSettings } from './project-settings';
export type { LengthUnit, CurrencyCode, SheetSortPreference, ProjectSettings } from './project-settings';

export { flattenLocale, auditLocale, auditAllLocales, formatAuditReport } from './i18n-audit';
export type { LocaleTree, FlatLocale, LocaleAuditResult, AuditReport } from './i18n-audit';

export { buildGrainReport, grainReportToCsv } from './grain-report';
export type { GrainReportPart, GrainMaterialGroup, GrainReport } from './grain-report';

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
  MATERIAL_TEXTURES,
  MATERIAL_TEXTURE_IDS,
  getMaterialTexture,
  getMaterialTextureId,
  buildSvgPatternDefs,
} from './material-textures';
export type { MaterialTexture, MaterialTextureId, GrainLine } from './material-textures';
export {
  isWebSerialAvailable,
  connectToMachine,
  streamGcodeLines,
  disconnectFromMachine,
  DEFAULT_SERIAL_PROFILE,
} from './webserial';
export type { WebSerialState, WebSerialProfile, SerialPortHandle } from './webserial';
export { MACHINE_PROFILES, MACHINE_PROFILE_IDS, getMachineProfile, getDefaultMachineProfile } from './machine-profiles';
export type { MachineProfile, MachineProfileId, ControllerFirmware, SpindleHint } from './machine-profiles';
export { extractToolSetup, generateMachiningJob, validateMachiningJob, resetIdCounter } from './machining-job';
export type {
  OperationType,
  MachiningOperation,
  ToolSetup,
  MachinablePart,
  DadoSpec,
  DrillHoleSpec,
  MachiningJob,
  JobOptions,
} from './machining-job';
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
  validateConstraints,
  applyConstraints,
  clampDimension,
  getDimensionRange,
  getDefaultConstraints,
} from './constraint-solver';
export type { DimensionField, ConstraintOp, DimensionConstraint, ConstraintViolation } from './constraint-solver';

// Sprint 112 — WebGPU renderer scaffold (Phase 26)
export {
  FALLBACK_CAPABILITIES,
  DEFAULT_LIGHT,
  DEFAULT_RENDER_OPTIONS,
  buildBoxMesh,
  buildCabinetScene,
  getMeshBounds,
  getSceneBounds,
  centerScene,
  applyExplodeFactor,
} from './webgpu-renderer';
export type {
  RendererTier,
  RendererCapabilities,
  Vec3,
  Bounds3,
  CabinetMesh,
  SceneLight,
  CabinetScene,
  RenderOptions,
} from './webgpu-renderer';

// Sprint 113 — PBR material system (Phase 26)
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

export { computeArPlacements, validatePlacement, snapToGrid } from './webxr-placement';
export type {
  AabbMetres,
  RoomSurface,
  CabinetFootprint,
  PlacementCandidate,
  ArPlacementResult,
  PlacementObstacle,
} from './webxr-placement';

export {
  createCollabState,
  incrementClock,
  createOperation,
  applyOperation,
  mergeStates,
  readValues,
  evictStalePeers,
} from './crdt-sync';
export type { LamportStamp, CrdtOperation, LwwRegister, CrdtState, PresencePeer, CollabState } from './crdt-sync';

export {
  createSyncEntry,
  createSyncQueue,
  enqueueSyncEntry,
  dequeueSyncEntry,
  markSyncError,
  getSyncStatus,
  computeSyncDelta,
  mergeSyncQueues,
} from './project-sync';
export type { SyncStatus, SyncMeta, SyncEntry, SyncQueue, SyncDelta } from './project-sync';

export { generateSuggestions, scoreSuggestion, filterSuggestions, SUGGESTION_CATEGORIES } from './layout-suggestions';
export type { SuggestionCategory, LayoutSuggestion, SuggestionContext } from './layout-suggestions';

export {
  createLibraryEntry,
  searchLibrary,
  filterByTags,
  sortLibrary,
  exportLibraryEntry,
  importLibraryEntry,
} from './project-library';
export type { LibraryTag, LibrarySortKey, LibraryEntry, LibrarySearchResult } from './project-library';

// Sprint 122 — ERP/MRP export engine (Phase 28)
export {
  buildErpLineItems,
  formatAsSap,
  formatAsOracle,
  formatAsWebhook,
  validateErpPayload,
  exportErp,
  ERP_SCHEMA_VERSION,
} from './erp-export';
export type { ErpSystem, ErpFindingSeverity, ErpLineItem, ErpHeader, ErpExportResult, ErpFinding } from './erp-export';

// Sprint 123 — ISO 7171 compliance validation (Phase 28)
export {
  validateIso7171,
  formatIso7171Report,
  filterViolations,
  ISO7171_MODULE_WIDTHS,
  ISO7171_MODULE_TOLERANCE,
  ISO7171_BASE_HEIGHT,
  ISO7171_WALL_HEIGHT,
  ISO7171_BASE_DEPTH,
  ISO7171_WALL_DEPTH,
  ISO7171_TOE_KICK,
  ISO7171_MIN_SHELF_GAP,
  ISO7171_MAX_SHELVES_TALL,
  ISO7171_MAX_SHELVES_BASE,
  ISO7171_DRAWER_HEIGHT,
  ISO7171_MAX_WIDTH_HEIGHT_RATIO,
} from './iso7171';
export type { Iso7171RuleId, Iso7171ComplianceLevel, Iso7171Violation, Iso7171Report } from './iso7171';

// Sprint 124 — Multi-project workspace (Phase 28)
export {
  createWorkspace,
  addProject,
  removeProject,
  activateTab,
  getActiveProject,
  shareWorkspaceMaterial,
  resolveSharedMaterials,
  exportWorkspace,
  importWorkspace,
  updateProjectConfig,
} from './workspace';
export type { WorkspaceProject, WorkspaceTab, SharedMaterial, Workspace } from './workspace';

// Sprint 125 — Audit trail and version diffing (Phase 28)
export {
  createAuditTrail,
  recordEvent,
  getAuditHistory,
  formatAuditEntry,
  summarizeAudit,
  diffConfigs,
} from './audit-trail';
export type { AuditEventKind, AuditEvent, AuditTrail, DiffEntry, ConfigDiff } from './audit-trail';

// Sprint 127 — Plugin marketplace foundation (Phase 29)
export {
  createRegistry,
  registerPlugin as registerMarketplacePlugin,
  installPlugin,
  uninstallPlugin,
  enablePlugin as enableMarketplacePlugin,
  disablePlugin as disableMarketplacePlugin,
  markPluginError,
  searchPlugins,
  getInstalledPlugins,
  getEnabledPlugins,
  filterByCategory,
  getTopPlugins,
} from './plugin-marketplace';
export type {
  MarketplacePluginState,
  PluginSource,
  PluginCategory,
  MarketplaceEntry,
  InstalledPlugin,
  PluginRegistry,
} from './plugin-marketplace';

// Sprint 128 — Mobile offline sync engine (Phase 29)
export {
  createMobileSyncState,
  enqueuePendingChange,
  dequeueChanges,
  markSynced,
  detectConflicts,
  resolveConflict,
  applyConflictResolution,
  addConflicts,
  getMobileSyncSummary,
  serializeSnapshot,
  deserializeSnapshot,
  setOnlineStatus,
} from './mobile-sync';
export type {
  MobilePlatform,
  SyncConflictStrategy,
  ProjectSnapshot,
  OfflineQueueEntry,
  SyncConflict,
  MobileSyncState,
  MobileSyncSummary,
} from './mobile-sync';

// Sprint 129 — Advanced analytics dashboard engine (Phase 29)
export {
  createSession,
  recordUsageEvent,
  closeSession,
  summarizeSession,
  computeMaterialTrends,
  getTopMaterials,
  computeCostTrends,
  exportAnalytics,
} from './analytics';
export type { UsageEventKind, UsageEvent, AnalyticsSession, MaterialTrend, CostTrend, UsageSummary } from './analytics';

// Sprint 130 — Bundle performance: lazy feature registry (Phase 29)
export {
  createFeatureRegistry,
  registerFeature as registerLazyFeature,
  isFeatureEnabled,
  setFeatureEnabled,
  getFeatureChunks,
  resolveLoadOrder,
  estimateBundleImpact,
  getFeaturesByPriority,
} from './lazy-features';
export type { FeatureFlag, FeaturePriority, LazyFeature, LazyFeatureRegistry } from './lazy-features';

// Sprint 132 — AI design assistant engine (Phase 30)
export {
  validateLayoutConstraints,
  suggestLayouts,
  rankSuggestions,
  applyLayoutSuggestion,
  createDesignBrief,
  formatConstraintReport,
  DEFAULT_SUGGESTION_WEIGHTS,
} from './ai-assistant';
export type {
  ConstraintKind,
  ConstraintPriority,
  LayoutConstraint,
  SuggestionKind,
  AiLayoutSuggestion,
  SuggestionWeights,
  RankedSuggestion,
  ConstraintCheckResult,
  DesignBrief,
} from './ai-assistant';

// Sprint 133 — glTF 2.0 / IFC 4.3 export
export {
  buildGltfScene,
  serializeGltf,
  estimateGltfSize,
  buildIfcScene,
  serializeIfc,
  GLTF_SCHEMA_VERSION,
  IFC_SCHEMA_VERSION,
  GLTF_GENERATOR,
} from './gltf-export';
export type {
  GltfComponentType,
  GltfAccessorType,
  GltfVec3,
  GltfPbrMaterial,
  GltfBoxMesh,
  GltfNode,
  GltfScene,
  GltfExportResult,
  IfcEntity,
  IfcRelationship,
  IfcScene,
  IfcExportResult,
} from './gltf-export';

// Sprint 134 — WebSerial CNC streaming v2
export {
  createStreamSession,
  startSession,
  pauseSession,
  resumeSession,
  cancelSession,
  markLinesSent,
  acknowledgeLines,
  markLineError,
  retryLine,
  getStreamProgress,
  getErrorLines,
  formatStreamReport,
  DEFAULT_MAX_RETRIES,
  SESSION_ID_PREFIX,
} from './webserial-v2';
export type {
  StreamLineState,
  StreamLine,
  StreamSessionState,
  StreamSession,
  StreamProgress,
  StreamError,
} from './webserial-v2';

// Sprint 135 — Advanced stock management
export {
  createStockLedger,
  addMaterial,
  createPurchaseOrder,
  submitPurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
  computeReorderAlerts,
  recordWaste,
  getStockSummary,
  formatStockReport,
  DEFAULT_REORDER_MULTIPLIER,
} from './stock-management';
export type {
  PurchaseOrderStatus,
  PurchaseOrderLine,
  PurchaseOrder,
  AlertSeverity,
  ReorderAlert,
  WasteEntry,
  StockRecord,
  StockLedger,
  StockSummary,
} from './stock-management';

// Sprint 137 — WCAG 2.2 AA accessibility audit engine
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

// Sprint 138 — Dark mode design tokens
export {
  resolveTheme,
  getToken,
  getTokenRgb,
  generateThemeCss,
  tokenToCssProperty,
  computeThemeClassDiff,
  isDarkMode,
  colorSchemeValue,
  systemPreferenceToMode,
  checkContrastPair,
  validateThemeContrast,
  getContrastFailures,
  buildThemeSummary,
  LIGHT_THEME,
  DARK_THEME,
  HIGH_CONTRAST_THEME,
  HIGH_CONTRAST_DARK_THEME,
  ALL_THEMES,
  THEME_MODES,
  STANDARD_CONTRAST_PAIRS,
} from './dark-mode-tokens';
export type {
  ThemeMode,
  TokenName,
  RgbTuple,
  DesignToken,
  ThemeDefinition,
  ContrastPair,
  ContrastCheckResult,
  ThemeClassDiff,
  ThemeSummary,
} from './dark-mode-tokens';

// Sprint 140 — Bundle chunk strategy descriptors and validation helpers
export {
  resolveChunkName,
  exceedsPerFileBudget,
  exceedsTotalJsBudget,
  getMissingChunks,
  CHUNK_NAMES,
  MODULE_CHUNK_DESCRIPTORS,
  BUNDLE_BUDGET,
} from './bundle-strategy';
export type { ChunkName, ModuleChunkDescriptor, BundleBudget } from './bundle-strategy';

// Sprint 157 — CNC job queue (Phase 35)
export {
  createJobQueue,
  enqueueJob,
  cancelJob,
  promoteNextJobs,
  completeJob,
  failJob,
  reprioritiseJob,
  getQueueStats,
  getJobsByMachine,
  purgeFinishedJobs,
  DEFAULT_QUEUE_CONFIG,
} from './cnc-job-queue';
export type { JobPriority, JobState, QueuedJob, QueueStats, QueueConfig, EnqueueResult } from './cnc-job-queue';

// Sprint 158 — Cloud sync with E2E encryption (Phase 35)
export {
  createVectorClock,
  incrementClock as incrementSyncClock,
  mergeClocks,
  compareClocks,
  createEnvelope,
  decryptEnvelope,
  detectConflict,
  validateEnvelope,
  shouldAcceptRemote,
  ENVELOPE_VERSION,
  DEFAULT_CLOUD_SYNC_CONFIG,
  MIN_KDF_ITERATIONS,
  IV_LENGTH_BYTES,
  SALT_LENGTH_BYTES,
} from './cloud-sync';
export type {
  EncryptionAlgorithm,
  KeyDerivationParams,
  SyncEnvelope,
  ClockComparison,
  SyncConflict as CloudSyncConflict,
  EnvelopeValidation,
  CloudSyncConfig,
  CryptoPort,
} from './cloud-sync';

// Sprint 159 — Multi-machine workflow (Phase 35)
export {
  isCapable,
  findCapableMachines,
  selectMachine,
  distributeJobs,
  markDispatched,
  markComplete as markWorkflowComplete,
  markFailed as markWorkflowFailed,
  getWorkflowProgress,
  computeMachineLoads,
  DEFAULT_WORKFLOW_CONFIG,
} from './multi-machine';
export type {
  MachineCapabilities,
  WorkshopMachine,
  JobAssignment,
  WorkflowDistribution,
  MachineLoad,
  DistributionStrategy,
  WorkflowConfig,
} from './multi-machine';

// Sprint 160 — Project sharing links (Phase 35)
export {
  createShareLink,
  validateAccess,
  recordAccess,
  revokeLink,
  renewLink,
  getLinksByProject,
  expireLinks,
  getShareSummary,
  defaultTokenGenerator,
  DEFAULT_TOKEN_LENGTH,
  MAX_LABEL_LENGTH,
  DEFAULT_EXPIRATION,
} from './project-sharing';
export type {
  SharePermission,
  ShareState,
  ExpirationPolicy,
  ShareLink,
  CreateShareOptions,
  AccessValidation,
  ShareSummary,
  TokenGenerator,
} from './project-sharing';

// Sprint 162 — Parametric Template Engine (Phase 36)
export {
  validateTemplate,
  instantiateTemplate as instantiateParametricTemplate,
  getDefaultValues,
  getParamDependencies,
  evaluateExpression,
  MAX_PARAMS,
  MAX_RULES,
  MAX_COMPUTED,
  MAX_EXPRESSION_LENGTH,
} from './parametric-template';
export type {
  ParamType,
  NumberConstraint,
  ParamDefBase,
  NumberParamDef,
  BooleanParamDef,
  ChoiceParamDef,
  ParamDef,
  ConditionalRule,
  ComputedField,
  ParametricTemplate,
  ParamValues,
  TemplateInstance as ParametricTemplateInstance,
  TemplateValidationError,
  TemplateValidationResult,
} from './parametric-template';

// Sprint 163 — Batch Export Pipeline (Phase 36)
export {
  createBatchJob,
  startNextItem,
  recordSuccess,
  recordFailure,
  cancelBatch,
  getBatchProgress,
  generateManifest,
  getItemsByFormat,
  generateFileName,
  MAX_BATCH_ITEMS,
  MAX_CONCURRENT,
} from './batch-export';
export type {
  ExportFormat as BatchExportFormat,
  ExportPriority,
  ExportItemStatus,
  BatchStatus,
  ExportItemConfig,
  ExportOptions,
  ExportItemResult,
  BatchExportJob,
  BatchProgress,
  ExportManifest,
  IdGenerator as BatchIdGenerator,
} from './batch-export';

// Sprint 164 — Material Yield Optimizer (Phase 36)
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

// Sprint 165 — Version History & Branching (Phase 36)
export {
  createHistory,
  commit,
  createBranch,
  switchBranch,
  getLog,
  tagVersion,
  diffVersions,
  mergeBranches,
  listBranches,
  DEFAULT_BRANCH_NAME,
  MAX_BRANCHES,
  MAX_VERSIONS,
} from './version-history';
export type {
  VersionSnapshot,
  VersionBranch,
  VersionHistory,
  VersionDiff,
  DiffEntry as VersionDiffEntry,
  MergeResult,
  MergeConflict,
} from './version-history';

// Sprint 167 — Production schedule planner (Phase 37)
export {
  createSchedule,
  addTask,
  computeSchedule,
  detectConflicts as detectScheduleConflicts,
  getScheduleMetrics,
  crashTask,
  MAX_TASKS,
  MAX_RESOURCES,
  DEFAULT_HOURS_PER_DAY,
} from './production-schedule';
export type {
  TaskStatus,
  ResourceKind,
  WorkshopResource,
  ScheduleTask,
  ScheduledSlot,
  ProductionSchedule,
  ResourceConflict,
  ScheduleMetrics,
  IdGenerator as ScheduleIdGenerator,
} from './production-schedule';

// Sprint 168 — Nesting pattern library (Phase 37)
export {
  createLibrary,
  createPattern,
  addPattern,
  removePattern,
  findBySheet,
  findByCategory,
  findByTag,
  scorePatterns,
  getCategories,
  getTags,
  getLibraryStats,
  MAX_PATTERNS,
  MAX_PLACEMENTS,
  LIBRARY_VERSION,
} from './nesting-patterns';
export type {
  PatternPlacement,
  NestingPattern,
  DemandItem,
  PatternMatchScore,
  PatternLibrary,
} from './nesting-patterns';

// Sprint 169 — Tool wear tracker (Phase 37)
export {
  createInventory,
  addTool,
  removeTool,
  logUsage,
  getToolStatus,
  getAllToolStatuses,
  getMaintenanceAlerts,
  estimateRemainingForMaterial,
  MAX_TOOLS,
  MAX_USAGE_ENTRIES,
  CONDITION_THRESHOLDS,
  HARDNESS_FACTORS,
} from './tool-wear';
export type {
  ToolType,
  WearModel,
  ToolCondition,
  Tool,
  UsageEntry,
  ToolStatus,
  MaintenanceAlert,
  ToolInventory,
} from './tool-wear';

// Sprint 170 — Design comparison engine (Phase 37)
export {
  createSnapshot,
  compareDesigns,
  validateWeights,
  getCommonCriteria,
  DEFAULT_WEIGHTS,
  CRITERION_META,
} from './design-comparison';
export type {
  CriterionName,
  CriterionValue,
  DesignSnapshot,
  CriterionWeight,
  CriterionComparison,
  NormalizedScore,
  ComparisonResult,
} from './design-comparison';

// Sprint 172 — Dust collection estimator
export {
  machineCfm,
  machineStaticPressure,
  recommendTrunkDiameter,
  recommendHp,
  calculateSystem,
  validateCollector,
  BASE_CFM,
} from './dust-collection';
export type {
  MachineType,
  DuctShape,
  DustMachine,
  DuctSegment,
  DustCollectionResult,
  MachineAirflow,
  CollectorSpec,
} from './dust-collection';

// Sprint 173 — Cut-list grouping engine
export {
  buildGroupKey,
  buildGroupLabel,
  groupParts,
  mergeGrainFlexible,
  estimateToolChanges,
} from './cut-list-grouping';
export type { GrainDirection, CutPart, GroupingCriterion, CutGroup, GroupingResult } from './cut-list-grouping';

export { resolveAssemblyDeps, hasCycle, maxParallelism } from './assembly-dependency';
export type {
  StepId,
  AssemblyStep as DependencyAssemblyStep,
  ScheduledStep,
  DependencyResult,
} from './assembly-dependency';

export {
  checkWorkshopSafety,
  getToolClearance,
  getNoiseLevel,
  recommendPpe,
  computeSafetyScore,
} from './workshop-safety';
export type {
  ToolType as WorkshopSafetyToolType,
  PpeCategory,
  WorkshopTool,
  SafetyViolation,
  PpeRecommendation,
  SafetyResult,
} from './workshop-safety';

export { predictWaste, computeTotalDemand, estimatePartsPerSheet } from './waste-predictor';
export type {
  PredictorPart,
  SheetSize,
  ConfidenceLevel,
  SheetPrediction,
  WastePredictionResult,
} from './waste-predictor';

export { generateMaintenanceSchedule, computeHealthScore, getMostUrgentPerTool } from './maintenance-scheduler';
export type {
  IntervalUnit,
  MaintenancePriority,
  MaintenanceStatus,
  MaintenanceRule,
  ToolUsageState,
  MaintenanceEvent,
  MaintenanceScheduleResult,
} from './maintenance-scheduler';

export {
  buildDistanceMatrix,
  computeTotalDistance,
  suggestSwaps,
  computeEfficiencyScore,
  analyzeLayout,
} from './layout-optimizer';
export type { ToolPosition, WorkflowStep, SwapSuggestion, LayoutAnalysisResult } from './layout-optimizer';

export { getSkillMultiplier, getBaseMinutes, estimateTaskTime, estimateProjectTime } from './time-estimator';
export type {
  SkillLevel,
  OperationType as TimeEstimationOperationType,
  ProjectTask,
  TaskEstimate,
  TimeEstimationResult,
} from './time-estimator';

export { findBestPrice, computePriceTrend, estimateProjectCost, detectPriceAnomalies } from './material-cost-tracker';
export type {
  PriceEntry,
  MaterialDemand as CostTrackerMaterialDemand,
  MaterialCostLine,
  TrendDirection,
  PriceTrend,
  ProjectCostResult,
} from './material-cost-tracker';

export { checkStock, analyzeInventory, projectUsage, generateReorderList } from './shop-inventory';
export type {
  InventoryItem,
  StockStatus as InventoryStockStatus,
  StockCheck,
  ProjectUsage,
  UsageProjection,
  InventoryAnalysisResult,
} from './shop-inventory';

export {
  getTemplate as getCabinetTemplate,
  getTemplatesByCategory as getCabinetTemplatesByCategory,
  instantiateTemplate as instantiateCabinetTemplate,
  BUILT_IN_TEMPLATES,
} from './cabinet-templates';

export type {
  CabinetCategory,
  DimensionConstraint as CabinetDimensionConstraint,
  CabinetTemplate as BuiltInCabinetTemplate,
  ValidationError as CabinetValidationError,
  TemplateParams,
  TemplateInstance as CabinetTemplateInstance,
} from './cabinet-templates';

export { calculateEdgeBanding, detectExposedEdges, allEdgesExposed, frontEdgesOnly } from './edge-banding-calc';

export type {
  EdgePosition,
  EdgeExposure,
  BandingSpec,
  BandingPart,
  EdgeBandingLine,
  BandingGroup,
  EdgeBandingResult,
} from './edge-banding-calc';

export {
  generateUsageReport,
  costPerSquareMetre,
  mostWastefulMaterial,
  mostExpensiveMaterial,
} from './material-usage-report';

export type { UsagePart, SheetStock, MaterialUsage, UsageReport } from './material-usage-report';

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

export {
  compareProjects,
  bestForCriterion,
  percentDifference,
  DEFAULT_WEIGHTS as DEFAULT_PROJECT_COMPARISON_WEIGHTS,
} from './project-comparison';

export type {
  ProjectMetrics,
  ComparisonWeights,
  NormalisedScores,
  ProjectScore,
  ComparisonResult as ProjectComparisonResult,
} from './project-comparison';

// Sprint 190 — Wood Movement Calculator
export {
  calculateWoodMovement,
  calculatePanelMovement,
  seasonalMovement,
  SPECIES_COEFFICIENTS,
  SEASONAL_PRESETS,
} from './wood-movement';

export type { WoodSpecies, WoodMovementInput, WoodMovementResult, SeasonalPreset } from './wood-movement';

// Sprint 191 — Toolpath Feed Rate Calculator
export {
  calculateFeedRate,
  recommendDepthPerPass,
  recommendStepover,
  MATERIAL_HARDNESS,
  CUTTER_TYPES,
} from './feed-rate';

export type {
  MaterialHardness,
  CutterType,
  FeedRateInput,
  FeedRateResult,
  DepthRecommendationInput,
  DepthRecommendation,
} from './feed-rate';

// Sprint 192 — Cabinet Weight Estimator
export { estimateCabinetWeight, categorizeFastener, maxShelfLoad, MATERIAL_DENSITIES } from './cabinet-weight';

export type {
  PanelMaterial,
  WeightPanel,
  WeightHardware,
  WeightEstimate,
  PanelWeight,
  FastenerCategory,
} from './cabinet-weight';

// Sprint 193 — Dowel Joint Calculator
export { calculateDowelJoint, selectDowelDiameter, minDowelsForLoad, STANDARD_DOWEL_DIAMETERS } from './dowel-joint';
export type { DowelDiameter, JointOrientation, DowelJointInput, DowelPosition, DowelJointResult } from './dowel-joint';

// Sprint 194 — Panel Layout Label Generator
export { generatePanelLabel, generateLabelBatch, formatLabelText } from './panel-label';
export type { BandedEdge, PanelLabelInput, PanelLabel, PanelLabelBatch } from './panel-label';

// Sprint 195 — Pocket Hole Joinery Calculator
export { calculatePocketHole, selectScrewLength, selectThreadType, POCKET_SCREW_LENGTHS } from './pocket-hole';
export type { ScrewHeadType, JointType, PocketHoleInput, PocketHoleResult } from './pocket-hole';

// Sprint 196 — Veneer Calculator
export { calculateVeneer, bestSheetForPanel, VENEER_THICKNESSES, STANDARD_VENEER_SHEETS } from './veneer-calc';
export type { VeneerMatchPattern, VeneerSheetSize, VeneerInput, VeneerResult } from './veneer-calc';

// Sprint 197 — Clamp Pressure Calculator
export { calculateClampPressure, isPressureAdequate, GLUE_PRESSURE_PSI, CLAMP_FORCE_LBS } from './clamp-pressure';
export type { GlueType, ClampType, ClampPressureInput, ClampPressureResult } from './clamp-pressure';

// Sprint 198 — Drill Press Speed Calculator
export { calculateDrillSpeed, maxBitDiameter, MATERIAL_SFM, BIT_TYPE_FACTOR } from './drill-speed';
export type { DrillBitType, DrillMaterial, DrillSpeedInput, DrillSpeedResult } from './drill-speed';

// Sprint 199 — Board-Feet Calculator
export { calculateBoardFeet, linearFeetToBoardFeet, NOMINAL_TO_ACTUAL, SPECIES_COST_PER_BF } from './board-feet';
export type { BoardFeetInput, BoardFeetResult } from './board-feet';

// Sprint 200 — Miter & Compound Angle Calculator
export { calculatePolygonMiter, calculateCompoundMiter, calculateCrownMolding } from './miter-angle';
export type {
  PolygonMiterInput,
  PolygonMiterResult,
  CompoundMiterInput,
  CompoundMiterResult,
  CrownMoldingInput,
  CrownMoldingResult,
} from './miter-angle';

// Sprint 201 — Shelf Pin Spacing Calculator
export { calculateShelfPins, totalPinsNeeded, SHELF_PIN_DIAMETERS } from './shelf-pin';
export type { ShelfPinDiameter, PinPatternStyle, ShelfPinInput, PinHole, ShelfPinResult } from './shelf-pin';

// Sprint 202 — Drawer Slide Calculator
export { calculateDrawerSlide, findRecommendedSlideLength, STANDARD_SLIDE_LENGTHS } from './drawer-slide';
export type {
  SlideMountStyle,
  SlideExtension,
  SlideLengthMm,
  DrawerSlideInput,
  DrawerSlideResult,
} from './drawer-slide';

// Sprint 203 — Wood Drying Time Estimator
export { estimateWoodDryingTime, calculateEMC } from './wood-drying';
export type { DryingMethod, SpeciesDensityClass, WoodDryingInput, WoodDryingResult } from './wood-drying';

// Sprint 204 — Dovetail Layout Calculator
export { calculateDovetailLayout, recommendedDovetailAngle } from './dovetail-layout';
export type {
  DovetailType,
  DovetailStyle,
  DovetailInput,
  DovetailTail,
  DovetailPin,
  DovetailResult,
} from './dovetail-layout';

// Sprint 205 — Mortise & Tenon Calculator
export { calculateMortiseTenon, findNearestChisel } from './mortise-tenon';
export type { MortiseTenonType, MortiseTenonInput, MortiseTenonResult } from './mortise-tenon';

// Sprint 206 — Shelf Deflection Calculator
export { calculateDeflection, getModulus } from './shelf-deflection';
export type { LoadType, ShelfMaterial, DeflectionInput, DeflectionResult } from './shelf-deflection';

// Sprint 207 — Router Bit Depth-of-Cut Calculator
export { calculateRouterDepth, getRecommendedRpm } from './router-depth';
export type {
  RouterOperation,
  MaterialHardness as RouterMaterialHardness,
  RouterDepthInput,
  RouterPass,
  RouterDepthResult,
} from './router-depth';

// Sprint 208 — Biscuit Joinery Calculator
export { calculateBiscuitLayout, recommendBiscuitSize } from './biscuit-joint';
export type {
  BiscuitSize,
  BiscuitJointType,
  BiscuitJointInput,
  BiscuitPosition,
  BiscuitJointResult,
} from './biscuit-joint';

// Sprint 209 — Sanding Progression Planner
export { planSandingProgression, SANDING_GRITS } from './sanding-progression';
export type {
  SandingMaterial,
  FinishTarget,
  SandingProgressionInput,
  SandingProgressionResult,
} from './sanding-progression';

// Sprint 210 — Finger Joint Calculator
export { calculateFingerJoint } from './finger-joint';
export type { FingerJointInput, FingerPosition, FingerJointResult } from './finger-joint';

// Sprint 211 — Wood Screw Pilot Hole Calculator
export { calculatePilotHole } from './pilot-hole';
export type { WoodHardness, ScrewGauge, PilotHoleInput, PilotHoleResult } from './pilot-hole';

// Sprint 212 — Glue-up Time Calculator
export { calculateGlueUpTime } from './glue-up-time';
export type { GlueType as GlueUpGlueType, GlueUpInput, GlueUpResult } from './glue-up-time';

// Sprint 213 — Bandsaw Blade Speed Calculator
export { calculateBandsawSpeed } from './bandsaw-speed';
export type { BandsawMaterial, BladeToothType, BandsawSpeedInput, BandsawSpeedResult } from './bandsaw-speed';

// Sprint 214 — Tablesaw Blade Height Calculator
export { calculateTablesawBladeHeight } from './tablesaw-blade';
export type { TablesawCutType, TablesawBladeInput, TablesawBladeResult } from './tablesaw-blade';

// Sprint 220 — Cabinet Door Sizing Calculator
export { calculateCabinetDoor, recommendDoorCount } from './cabinet-door';
export type { DoorOverlay, CabinetDoorInput, DoorLeafResult, CabinetDoorResult } from './cabinet-door';

// Sprint 221 — Face Frame Calculator
export { calculateFaceFrame } from './face-frame';
export type { FaceFrameInput, FaceFramePart, FaceFrameResult } from './face-frame';

// Sprint 223 — Drawer Box Sizing Calculator
export { calculateDrawerBox } from './drawer-box';
export type { DrawerBoxInput, DrawerBoxResult } from './drawer-box';

// Sprint 224 — Screw Pull-Out Strength Estimator
export { calculateScrewPullout } from './screw-pullout';
export type { WoodDensityClass, SafetyRating, ScrewPulloutInput, ScrewPulloutResult } from './screw-pullout';
