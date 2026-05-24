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
export type { AssemblyStep } from './assembly.ts';

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
