/**
 * Cut-Optimizer Web Worker — Sprint 60 / Phase 17 Comlink RPC
 *
 * Exposes a typed `run()` method via Comlink; the main thread uses
 * `Comlink.wrap()` to call it as a transparent async function — no
 * manual postMessage / requestId bookkeeping required.
 *
 * The worker computes two OptimizationResults per call:
 *   - activeResult  – parts from the currently-selected cabinet only
 *   - combinedResult – parts from ALL cabinets (project-wide cut list)
 */

import * as Comlink from 'comlink';
import { optimizeCutSheetsResult, findCoNestCandidates, applyCoNesting } from '../engine/cut-optimizer';
import type { Part, OptimizationResult, OffcutEntry, DefectZone } from '../engine/types';

export interface CutOptimizerInput {
  activeParts: Part[];
  allParts: Part[];
  sawKerfMm: number;
  sheetSizeOverrides: Record<string, { width: number; length: number }>;
  /** Algorithm to use; defaults to 'freeform' (MaxRects). */
  cutMode?: 'guillotine' | 'freeform';
  /** Catalog offcuts used as starting sheets. */
  offcutCatalog?: OffcutEntry[];
  /** Per-material defect zones to pre-block on each new sheet. */
  defectZones?: Record<string, DefectZone[]>;
  /** Sprint 107 — automatically apply multi-material co-nesting. */
  autoCoNest?: boolean;
}

export interface CutOptimizerResult {
  activeResult: OptimizationResult;
  combinedResult: OptimizationResult;
}

export interface CutOptimizerWorkerApi {
  run(input: CutOptimizerInput): CutOptimizerResult;
}

const api: CutOptimizerWorkerApi = {
  run({
    activeParts,
    allParts,
    sawKerfMm,
    sheetSizeOverrides,
    cutMode = 'freeform',
    offcutCatalog = [],
    defectZones = {},
    autoCoNest = false,
  }: CutOptimizerInput): CutOptimizerResult {
    const activeRes = optimizeCutSheetsResult(
      activeParts,
      sawKerfMm,
      sheetSizeOverrides,
      cutMode,
      offcutCatalog,
      defectZones,
    );
    if (!activeRes.ok) throw new Error(activeRes.error);
    const combinedRes = optimizeCutSheetsResult(
      allParts,
      sawKerfMm,
      sheetSizeOverrides,
      cutMode,
      offcutCatalog,
      defectZones,
    );
    if (!combinedRes.ok) throw new Error(combinedRes.error);

    let activeResult: OptimizationResult = activeRes.value;
    let combinedResult: OptimizationResult = combinedRes.value;

    if (autoCoNest) {
      const activeCandidates = findCoNestCandidates(activeResult);
      if (activeCandidates.length > 0) {
        const keys = new Set(activeCandidates.map((c) => c.key));
        activeResult = applyCoNesting(activeResult, keys, sawKerfMm);
      }
      const combinedCandidates = findCoNestCandidates(combinedResult);
      if (combinedCandidates.length > 0) {
        const keys = new Set(combinedCandidates.map((c) => c.key));
        combinedResult = applyCoNesting(combinedResult, keys, sawKerfMm);
      }
    }

    return { activeResult, combinedResult };
  },
};

Comlink.expose(api);
