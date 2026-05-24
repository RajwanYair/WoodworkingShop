/**
 * Cut-Optimizer Web Worker (v3.21.0)
 *
 * Accepts: CutOptimizerWorkerInput
 * Responds: CutOptimizerWorkerOutput
 *
 * Running MaxRects bin-packing off the main thread keeps the configurator
 * responsive during large multi-cabinet projects (5+ sheets per material).
 *
 * The worker computes two OptimizationResults per request:
 *   - activeResult  – parts from the currently-selected cabinet only
 *   - combinedResult – parts from ALL cabinets (project-wide cut list)
 *
 * Request IDs let the store discard stale responses from superseded runs.
 */

import { optimizeCutSheetsResult } from '../engine/cut-optimizer';
import type { Part, OptimizationResult, OffcutEntry, DefectZone } from '../engine/types';

export interface CutOptimizerWorkerInput {
  activeParts: Part[];
  allParts: Part[];
  sawKerfMm: number;
  sheetSizeOverrides: Record<string, { width: number; length: number }>;
  /** Phase 11 / Sprint 5 — algorithm to use; defaults to 'freeform' (MaxRects). */
  cutMode?: 'guillotine' | 'freeform';
  /** Phase 12 / Sprint 12 — catalog offcuts used as starting sheets. */
  offcutCatalog?: OffcutEntry[];
  /** Phase 12 / Sprint 13 — per-material defect zones to pre-block on each new sheet. */
  defectZones?: Record<string, DefectZone[]>;
  requestId: string;
}

export interface CutOptimizerWorkerOutput {
  type: 'done' | 'error';
  activeResult?: OptimizationResult;
  combinedResult?: OptimizationResult;
  errorMessage?: string;
  requestId: string;
}

self.onmessage = (e: MessageEvent<CutOptimizerWorkerInput>) => {
  const {
    activeParts,
    allParts,
    sawKerfMm,
    sheetSizeOverrides,
    cutMode = 'freeform',
    offcutCatalog = [],
    defectZones = {},
    requestId,
  } = e.data;
  const activeResult = optimizeCutSheetsResult(
    activeParts,
    sawKerfMm,
    sheetSizeOverrides,
    cutMode,
    offcutCatalog,
    defectZones,
  );
  if (!activeResult.ok) {
    self.postMessage({ type: 'error', errorMessage: activeResult.error, requestId } satisfies CutOptimizerWorkerOutput);
    return;
  }
  const combinedResult = optimizeCutSheetsResult(
    allParts,
    sawKerfMm,
    sheetSizeOverrides,
    cutMode,
    offcutCatalog,
    defectZones,
  );
  if (!combinedResult.ok) {
    self.postMessage({
      type: 'error',
      errorMessage: combinedResult.error,
      requestId,
    } satisfies CutOptimizerWorkerOutput);
    return;
  }
  self.postMessage({
    type: 'done',
    activeResult: activeResult.value,
    combinedResult: combinedResult.value,
    requestId,
  } satisfies CutOptimizerWorkerOutput);
};
