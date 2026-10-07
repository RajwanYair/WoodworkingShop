/**
 * worker-schedule.ts — Phase 17.3 / E5
 *
 * Extracted from cabinet-store.ts: Comlink worker proxies, latest-wins call
 * counters, module-level mirrors (_rotationLocks, _cutMode, _offcutCatalog,
 * _defectZones), and the four fire-and-forget schedule* functions.
 *
 * Initialised once at store creation via `initWorkerSchedule`.  All mutations
 * to the mirrored vars are done through the exported setters so that
 * cabinet-store.ts has no direct reference to the module-level vars here.
 */
import * as Comlink from 'comlink';
import type { CabinetConfig, Part, HardwareItem, OptimizationResult, OffcutEntry, DefectZone } from '../engine/types';
import { optimizeCutSheetsResult, findCoNestCandidates, applyCoNesting } from '../engine/cut-optimizer';
import { estimateCost } from '../engine/cost-estimator';
import { generateAssemblySteps } from '../engine/assembly';
import { pluginEventBus } from '../engine/plugin';
import CutOptimizerWorker from '../workers/cut-optimizer.worker?worker';
import type { CutOptimizerWorkerApi, CutOptimizerInput } from '../workers/cut-optimizer.worker';
import CostEstimatorWorker from '../workers/cost-estimator.worker?worker';
import type { CostEstimatorWorkerApi, CostEstimatorInput } from '../workers/cost-estimator.worker';
import AssemblyWorker from '../workers/assembly.worker?worker';
import type { AssemblyWorkerApi } from '../workers/assembly.worker';
// Type-only import — erased at runtime, so no circular dependency.
import type { CabinetState } from './cabinet-store';
import { getCustomMaterials } from './custom-materials-store';

// ── Worker proxies ────────────────────────────────────────────────────────────
// Kept module-level to avoid serialisation into Zustand state.
let _cutProxy: Comlink.Remote<CutOptimizerWorkerApi> | null = null;
let _costProxy: Comlink.Remote<CostEstimatorWorkerApi> | null = null;
let _assemblyProxy: Comlink.Remote<AssemblyWorkerApi> | null = null;
let _cutWorker: Worker | null = null;
let _costWorker: Worker | null = null;
let _assemblyWorker: Worker | null = null;
/** Injected by `initWorkerSchedule`; callbacks post state patches here. */
let _workerApplyFn: ((partial: Partial<CabinetState>) => void) | null = null;
/** Injected by `initWorkerSchedule`; reads the latest state without importing the store. */
let _getState: (() => CabinetState) | null = null;

export function getWorkerHealth(): { cutOptimizer: boolean; costEstimator: boolean; assembly: boolean } {
  return {
    cutOptimizer: _cutWorker !== null,
    costEstimator: _costWorker !== null,
    assembly: _assemblyWorker !== null,
  };
}

// Latest-wins counters: each scheduling call increments and captures its own
// id; the promise handler discards the result if a newer call has been issued.
let _cutCallId = 0;
let _latestCutId = 0;
let _costCallId = 0;
let _latestCostId = 0;
let _assemblyCallId = 0;
let _latestAssemblyId = 0;

const WORKER_REQUEST_TIMEOUT_MS = 30_000;

function withWorkerDeadline<T>(
  request: Promise<T>,
  signal: AbortSignal | undefined,
  isLatest: () => boolean,
  onTimeout: () => void,
  onAbort: () => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      clearTimeout(timeoutId);
      signal?.removeEventListener('abort', handleAbort);
    };
    const resolveOnce = (value: T) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };
    const rejectOnce = (reason: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(reason);
    };
    const handleAbort = () => {
      if (isLatest()) onAbort();
      rejectOnce(signal?.reason ?? new Error('Worker request aborted'));
    };

    const timeoutId = setTimeout(() => {
      onTimeout();
      rejectOnce(new Error('Worker request timed out'));
    }, WORKER_REQUEST_TIMEOUT_MS);
    signal?.addEventListener('abort', handleAbort, { once: true });

    if (signal?.aborted) {
      handleAbort();
      return;
    }
    request.then(resolveOnce, rejectOnce);
  });
}

// ── Module-level mirrors of Zustand state ────────────────────────────────────
// These mirror the corresponding fields in CabinetState so the worker
// callbacks can read the current values without calling get().
// Mutated exclusively through the exported setters below.

/**
 * Sprint 16 — Module-level rotation-lock map keyed by part ID.
 * Mutated by the `toggleRotationLock` store action; read by `applyLocks`
 * to decorate parts with `rotationLocked: true` before they reach the cut
 * optimizer (engine or worker). Initialised from the persisted session.
 */
let _rotationLocks: Record<string, boolean> = {};

/**
 * Phase 11 / Sprint 5 — Active cut mode, mirroring the active cabinet's
 * `config.cutMode`. Updated in `deriveBaseProject` (called before every
 * `scheduleOptimization`), so the worker and sync fallback always use the
 * current value without requiring call-site changes.
 */
let _cutMode: 'guillotine' | 'freeform' = 'freeform';

/** Phase 12 / Sprint 12 — catalog offcuts available to the optimizer. */
let _offcutCatalog: OffcutEntry[] = [];

/** Phase 12 / Sprint 13 — defect zones per material, pre-blocked in MaxRects packing. */
let _defectZones: Record<string, DefectZone[]> = {};

/** Sprint 107 — auto co-nesting toggle mirrored from optimizer settings. */
let _autoCoNest = false;

// ── Initialisers / setters ────────────────────────────────────────────────────

/**
 * Called once inside `useCabinetStore = create(...)` to inject the `set` and
 * `get` handles. All schedule* functions close over these module-level vars so
 * they never need to import the store directly.
 */
export function initWorkerSchedule(
  applyFn: (partial: Partial<CabinetState>) => void,
  getStateFn: () => CabinetState,
): void {
  _workerApplyFn = applyFn;
  _getState = getStateFn;
}

export function setRotationLocks(locks: Record<string, boolean>): void {
  _rotationLocks = locks;
}

export function setCutModeWorker(mode: 'guillotine' | 'freeform'): void {
  _cutMode = mode;
}

export function setOffcutCatalog(catalog: OffcutEntry[]): void {
  _offcutCatalog = catalog;
}

export function getOffcutCatalog(): OffcutEntry[] {
  return _offcutCatalog;
}

export function setDefectZones(zones: Record<string, DefectZone[]>): void {
  _defectZones = zones;
}

export function getDefectZones(): Record<string, DefectZone[]> {
  return _defectZones;
}

export function setAutoCoNest(enabled: boolean): void {
  _autoCoNest = enabled;
}

// ── Proxy getters ─────────────────────────────────────────────────────────────

function getCutProxy(): Comlink.Remote<CutOptimizerWorkerApi> | null {
  if (typeof Worker === 'undefined') return null;
  if (!_cutProxy) {
    _cutWorker = new CutOptimizerWorker();
    _cutProxy = Comlink.wrap<CutOptimizerWorkerApi>(_cutWorker);
  }
  return _cutProxy;
}

function getCostProxy(): Comlink.Remote<CostEstimatorWorkerApi> | null {
  if (typeof Worker === 'undefined') return null;
  if (!_costProxy) {
    _costWorker = new CostEstimatorWorker();
    _costProxy = Comlink.wrap<CostEstimatorWorkerApi>(_costWorker);
  }
  return _costProxy;
}

function getAssemblyProxy(): Comlink.Remote<AssemblyWorkerApi> | null {
  if (typeof Worker === 'undefined') return null;
  if (!_assemblyProxy) {
    _assemblyWorker = new AssemblyWorker();
    _assemblyProxy = Comlink.wrap<AssemblyWorkerApi>(_assemblyWorker);
  }
  return _assemblyProxy;
}

function terminateCutWorker(): void {
  _cutWorker?.terminate();
  _cutWorker = null;
  _cutProxy = null;
}

function terminateCostWorker(): void {
  _costWorker?.terminate();
  _costWorker = null;
  _costProxy = null;
}

function terminateAssemblyWorker(): void {
  _assemblyWorker?.terminate();
  _assemblyWorker = null;
  _assemblyProxy = null;
}

// ── applyLocks ────────────────────────────────────────────────────────────────

/**
 * Decorates each part with `rotationLocked: true` when its id is present in
 * `_rotationLocks`. Returns the original array when no part is locked (avoids
 * unnecessary allocations on the hot path).
 */
export function applyLocks(parts: Part[]): Part[] {
  let touched = false;
  const out = parts.map((p) => {
    if (_rotationLocks[p.id]) {
      touched = true;
      return { ...p, rotationLocked: true };
    }
    return p;
  });
  return touched ? out : parts;
}

function applyAutomaticCoNesting(result: OptimizationResult, sawKerfMm: number): OptimizationResult {
  if (!_autoCoNest) return result;
  const candidates = findCoNestCandidates(result);
  return candidates.length > 0
    ? applyCoNesting(result, new Set(candidates.map((candidate) => candidate.key)), sawKerfMm)
    : result;
}

function runOptimizationSynchronously(
  activeParts: Part[],
  allParts: Part[],
  sawKerfMm: number,
  sheetSizeOverrides: Record<string, { width: number; length: number }>,
  extraMaterials: ReturnType<typeof getCustomMaterials>,
): void {
  if (!_workerApplyFn) return;
  const activeRes = optimizeCutSheetsResult(
    activeParts,
    sawKerfMm,
    sheetSizeOverrides,
    _cutMode,
    _offcutCatalog,
    _defectZones,
    extraMaterials,
  );
  const combinedRes = optimizeCutSheetsResult(
    allParts,
    sawKerfMm,
    sheetSizeOverrides,
    _cutMode,
    _offcutCatalog,
    _defectZones,
    extraMaterials,
  );
  if (!activeRes.ok || !combinedRes.ok) {
    _workerApplyFn({ optimizationPending: false });
    return;
  }
  const activeOptimization = applyAutomaticCoNesting(activeRes.value, sawKerfMm);
  const combinedOptimization = applyAutomaticCoNesting(combinedRes.value, sawKerfMm);
  _workerApplyFn({
    optimization: activeOptimization,
    combinedOptimization,
    optimizationPending: false,
  });
  scheduleCostFromState(_getState!(), activeOptimization);
}

function handleCutOptimizationFailure(callId: number): void {
  if (_latestCutId !== callId) return;
  _latestCutId = 0;
  terminateCutWorker();
  _workerApplyFn?.({ optimizationPending: false });
}

// ── Schedule functions ────────────────────────────────────────────────────────

/**
 * Fire-and-forget: post a cut-optimization request to the worker via Comlink.
 * Falls back to synchronous computation when Workers are unavailable (e.g. tests).
 */
export function scheduleOptimization(
  activeParts: Part[],
  allParts: Part[],
  sawKerfMm: number,
  sheetSizeOverrides: Record<string, { width: number; length: number }>,
  signal?: AbortSignal,
): void {
  if (_latestCutId !== 0) terminateCutWorker();
  const callId = ++_cutCallId;
  _latestCutId = callId;
  if (signal?.aborted) {
    _latestCutId = 0;
    _workerApplyFn?.({ optimizationPending: false });
    return;
  }
  // Sprint 16 — decorate with rotation locks before sending to optimizer.
  const lockedActive = applyLocks(activeParts);
  const lockedAll = applyLocks(allParts);
  const extraMaterials = getCustomMaterials();
  const proxy = getCutProxy();
  if (!proxy) {
    // Synchronous fallback (tests / browsers without Worker support).
    runOptimizationSynchronously(lockedActive, lockedAll, sawKerfMm, sheetSizeOverrides, extraMaterials);
    _latestCutId = 0;
    return;
  }
  const input: CutOptimizerInput = {
    activeParts: lockedActive,
    allParts: lockedAll,
    sawKerfMm,
    sheetSizeOverrides,
    cutMode: _cutMode,
    offcutCatalog: _offcutCatalog,
    defectZones: _defectZones,
    extraMaterials,
    autoCoNest: _autoCoNest,
  };
  const stopRequest = () => handleCutOptimizationFailure(callId);
  void withWorkerDeadline(proxy.run(input), signal, () => _latestCutId === callId, stopRequest, stopRequest)
    .then((result) => {
      if (!_workerApplyFn || _latestCutId !== callId) return; // stale
      _latestCutId = 0;
      _workerApplyFn({
        optimization: result.activeResult,
        combinedOptimization: result.combinedResult,
        optimizationPending: false,
        costPending: true,
      });
      // Sprint 20 — notify plugins that optimization completed.
      pluginEventBus.emit('optimization:complete', {
        sheetCount: result.activeResult.sheets.length,
        yieldPercent: result.activeResult.overallYield,
      });
      scheduleCostFromState(_getState!(), result.activeResult);
    })
    .catch(() => handleCutOptimizationFailure(callId));
}

export function scheduleAssembly(config: CabinetConfig, signal?: AbortSignal): void {
  const callId = ++_assemblyCallId;
  _latestAssemblyId = callId;
  if (signal?.aborted) {
    _workerApplyFn?.({ assemblyPending: false });
    return;
  }
  const proxy = getAssemblyProxy();
  if (!proxy) {
    if (_workerApplyFn) {
      _workerApplyFn({ assemblySteps: generateAssemblySteps(config), assemblyPending: false });
    }
    return;
  }
  const stopRequest = () => {
    if (_latestAssemblyId !== callId) return;
    _latestAssemblyId = 0;
    terminateAssemblyWorker();
    _workerApplyFn?.({ assemblyPending: false });
  };
  void withWorkerDeadline(proxy.run({ config }), signal, () => _latestAssemblyId === callId, stopRequest, stopRequest)
    .then((result) => {
      if (!_workerApplyFn || _latestAssemblyId !== callId) return; // stale
      _workerApplyFn({ assemblySteps: result.steps, assemblyPending: false });
    })
    .catch(() => {
      if (_workerApplyFn && _latestAssemblyId === callId) _workerApplyFn({ assemblyPending: false });
    });
}

function scheduleCost(input: CostEstimatorInput, signal?: AbortSignal): void {
  const callId = ++_costCallId;
  _latestCostId = callId;
  if (signal?.aborted) {
    _workerApplyFn?.({ costPending: false });
    return;
  }
  const proxy = getCostProxy();
  if (!proxy) {
    if (_workerApplyFn) {
      _workerApplyFn({
        cost: estimateCost(
          input.optimization,
          input.hardware,
          input.edgeBandingTotal,
          input.materialPriceOverrides,
          input.edgeBandingRate,
          input.hardwarePriceOverrides,
          input.labourRate,
          input.labourHours,
          input.finishCost,
          input.extraMaterials ?? getCustomMaterials(),
        ),
        costPending: false,
      });
    }
    return;
  }
  const stopRequest = () => {
    if (_latestCostId !== callId) return;
    _latestCostId = 0;
    terminateCostWorker();
    _workerApplyFn?.({ costPending: false });
  };
  void withWorkerDeadline(proxy.run(input), signal, () => _latestCostId === callId, stopRequest, stopRequest)
    .then((result) => {
      if (!_workerApplyFn || _latestCostId !== callId) return; // stale
      _workerApplyFn({ cost: result.cost, costPending: false });
    })
    .catch(() => {
      if (_workerApplyFn && _latestCostId === callId) _workerApplyFn({ costPending: false });
    });
}

export function scheduleCostFromState(
  state: CabinetState,
  optimizationOverride?: OptimizationResult,
  hardwareOverride?: HardwareItem[],
  edgeBandingTotalOverride?: number,
  partialOverrides?: Partial<CabinetState>,
  signal?: AbortSignal,
): void {
  scheduleCost(
    {
      optimization: optimizationOverride ?? state.optimization,
      hardware: hardwareOverride ?? state.hardware,
      edgeBandingTotal: edgeBandingTotalOverride ?? state.edgeBandingTotal,
      materialPriceOverrides: partialOverrides?.materialPriceOverrides ?? state.materialPriceOverrides,
      edgeBandingRate: partialOverrides?.edgeBandingRate ?? state.edgeBandingRate,
      hardwarePriceOverrides: partialOverrides?.hardwarePriceOverrides ?? state.hardwarePriceOverrides,
      labourRate: partialOverrides?.labourRate ?? state.labourRate,
      labourHours: partialOverrides?.labourHours ?? state.labourHours,
      finishCost: partialOverrides?.finishCost ?? state.finishCost,
      extraMaterials: getCustomMaterials(),
    },
    signal,
  );
}
