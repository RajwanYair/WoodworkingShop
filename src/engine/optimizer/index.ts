/**
 * Phase 12 / Sprint 8 — Engine optimizer sub-module barrel.
 * Covers: MaxRects BSSF + guillotine cut optimizer, smart heuristic optimizer.
 *
 * @example
 * ```ts
 * import { optimizeCutSheets, findOptimizations } from '../engine/optimizer';
 * ```
 */
export { optimizeCutSheets, optimizeCutSheetsResult } from './cut-optimizer.ts';

export { findOptimizations } from './smart-optimizer.ts';
export type { SmartOptimizerOptions } from './smart-optimizer.ts';

export { analyseWaste, formatWasteReport, DEFAULT_WASTE_THRESHOLDS } from './waste/index';

export type { SheetWasteInput, WasteThresholds, WasteAlert, WasteAnalysisReport, WasteAlertLevel } from './waste/index';

export { buildCutPlanSummary, formatCutPlanSummary } from './cut-plan-summary';

export type { SheetPlanInput, MaterialSummary, CutPlanSummary } from './cut-plan-summary';

export { resolveGrainConflicts, hasGrainConflicts } from './grain-conflict';

export type { GrainCheckPart, GrainConflict, GrainConflictCode, GrainConflictOptions } from './grain-conflict';

export { sortParts, sortPartsByPreset, invertSortCriteria, SORT_PRESETS } from './part-sort';

export type { SortablePart, SortKey, SortDirection, SortCriterion, SortPreset } from './part-sort';

export { optimizeWithMultiStock } from './multi-stock-optimizer';

export type { MultiStockOptimizationResult, MaterialStockSelection, StockCandidate } from './multi-stock-optimizer';

export { buildGrainReport, grainReportToCsv } from './grain-report';

export type { GrainReportPart, GrainMaterialGroup, GrainReport } from './grain-report';

export { generateSuggestions, scoreSuggestion, filterSuggestions, SUGGESTION_CATEGORIES } from './layout-suggestions';

export type { SuggestionCategory, LayoutSuggestion, SuggestionContext } from './layout-suggestions';

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

export {
  buildGroupKey,
  buildGroupLabel,
  groupParts,
  mergeGrainFlexible,
  estimateToolChanges,
} from './cut-list-grouping';

export type { GrainDirection, CutPart, GroupingCriterion, CutGroup, GroupingResult } from './cut-list-grouping';

export { predictWaste, computeTotalDemand, estimatePartsPerSheet } from './waste/index';

export type { PredictorPart, SheetSize, ConfidenceLevel, SheetPrediction, WastePredictionResult } from './waste/index';

export {
  buildDistanceMatrix,
  computeTotalDistance,
  suggestSwaps,
  computeEfficiencyScore,
  analyzeLayout,
} from './layout-optimizer';

export type { ToolPosition, WorkflowStep, SwapSuggestion, LayoutAnalysisResult } from './layout-optimizer';
