/** Curated public exports for the project engine domain. */

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
  TEMPLATE_CATALOGUE,
  getLibraryTemplatesByCategory as getTemplatesByCategory,
  getLibraryTemplate as getTemplate,
  instantiateLibraryTemplate,
  listTemplateIds,
} from './templates/index';

export type {
  TemplateCategory,
  TemplateDimensions,
  LibraryCabinetTemplate as CabinetTemplate,
  LibraryTemplateInstance,
} from './templates/index';

export { batchReplaceMaterial, listMaterials, countByMaterial } from './batch-replace';

export type { BatchPart, BatchReplaceOptions, BatchReplaceResult } from './batch-replace';

export { EXAMPLE_PROJECTS } from './examples';

export type { ExampleCabinet, ExampleProject } from './examples';

export { DEFAULT_PROJECT_SETTINGS, mergeSettings, validateSettings, describeSettings } from './project-settings';

export type { LengthUnit, CurrencyCode, SheetSortPreference, ProjectSettings } from './project-settings';

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

export {
  createLibraryEntry,
  searchLibrary,
  filterByTags,
  sortLibrary,
  exportLibraryEntry,
  importLibraryEntry,
} from './project-library';

export type { LibraryTag, LibrarySortKey, LibraryEntry, LibrarySearchResult } from './project-library';

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

export {
  createAuditTrail,
  recordEvent,
  getAuditHistory,
  formatAuditEntry,
  summarizeAudit,
  diffConfigs,
} from './audit-trail';

export type { AuditEventKind, AuditEvent, AuditTrail, DiffEntry, ConfigDiff } from './audit-trail';

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

export {
  validateTemplate,
  instantiateParametricTemplate,
  getDefaultValues,
  getParamDependencies,
  evaluateExpression,
  MAX_PARAMS,
  MAX_RULES,
  MAX_COMPUTED,
  MAX_EXPRESSION_LENGTH,
} from './templates/index';

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
  ParametricTemplateInstance,
  TemplateValidationError,
  TemplateValidationResult,
} from './templates/index';

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

export {
  createSnapshot,
  compareDesigns,
  validateWeights,
  getCommonCriteria,
  DEFAULT_DESIGN_COMPARISON_WEIGHTS as DEFAULT_WEIGHTS,
  CRITERION_META,
} from './comparison/index';

export type {
  CriterionName,
  CriterionValue,
  DesignSnapshot,
  CriterionWeight,
  CriterionComparison,
  NormalizedScore,
  ComparisonResult,
} from './comparison/index';

export {
  getCabinetTemplate,
  getCabinetTemplatesByCategory,
  instantiateCabinetTemplate,
  BUILT_IN_TEMPLATES,
} from './templates/index';

export type {
  CabinetCategory,
  CabinetDimensionConstraint,
  BuiltInCabinetTemplate,
  CabinetValidationError,
  TemplateParams,
  CabinetTemplateInstance,
} from './templates/index';

export {
  compareProjects,
  bestForCriterion,
  percentDifference,
  DEFAULT_WEIGHTS as DEFAULT_PROJECT_COMPARISON_WEIGHTS,
} from './comparison/index';

export type {
  ProjectMetrics,
  ComparisonWeights,
  NormalisedScores,
  ProjectScore,
  ComparisonResult as ProjectComparisonResult,
} from './comparison/index';
