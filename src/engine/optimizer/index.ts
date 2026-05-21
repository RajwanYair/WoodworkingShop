/**
 * Phase 12 / Sprint 8 — Engine optimizer sub-module barrel.
 * Covers: MaxRects BSSF + guillotine cut optimizer, smart heuristic optimizer.
 *
 * @example
 * ```ts
 * import { optimizeCutSheets, findOptimizations } from '../engine/optimizer';
 * ```
 */
export { optimizeCutSheets, optimizeCutSheetsResult } from '../cut-optimizer.ts';

export { findOptimizations } from '../smart-optimizer.ts';
export type { SmartOptimizerOptions } from '../smart-optimizer.ts';
