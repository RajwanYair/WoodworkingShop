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
import type { Part, OptimizationResult } from '../engine/types';

export interface CutOptimizerWorkerInput {
  activeParts: Part[];
  allParts: Part[];
  sawKerfMm: number;
  sheetSizeOverrides: Record<string, { width: number; length: number }>;
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
  const { activeParts, allParts, sawKerfMm, sheetSizeOverrides, requestId } = e.data;
  const activeResult = optimizeCutSheetsResult(activeParts, sawKerfMm, sheetSizeOverrides);
  if (!activeResult.ok) {
    self.postMessage({ type: 'error', errorMessage: activeResult.error, requestId } satisfies CutOptimizerWorkerOutput);
    return;
  }
  const combinedResult = optimizeCutSheetsResult(allParts, sawKerfMm, sheetSizeOverrides);
  if (!combinedResult.ok) {
    self.postMessage({ type: 'error', errorMessage: combinedResult.error, requestId } satisfies CutOptimizerWorkerOutput);
    return;
  }
  self.postMessage({
    type: 'done',
    activeResult: activeResult.value,
    combinedResult: combinedResult.value,
    requestId,
  } satisfies CutOptimizerWorkerOutput);
};
