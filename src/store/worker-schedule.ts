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
import { optimizeCutSheetsResult } from '../engine/cut-optimizer';
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

// ── Worker proxies ────────────────────────────────────────────────────────────
// Kept module-level to avoid serialisation into Zustand state.
let _cutProxy: Comlink.Remote<CutOptimizerWorkerApi> | null = null;
let _costProxy: Comlink.Remote<CostEstimatorWorkerApi> | null = null;
let _assemblyProxy: Comlink.Remote<AssemblyWorkerApi> | null = null;
/** Injected by `initWorkerSchedule`; callbacks post state patches here. */
let _workerApplyFn: ((partial: Partial<CabinetState>) => void) | null = null;
/** Injected by `initWorkerSchedule`; reads the latest state without importing the store. */
let _getState: (() => CabinetState) | null = null;

// Latest-wins counters: each scheduling call increments and captures its own
// id; the promise handler discards the result if a newer call has been issued.
let _cutCallId = 0;
let _latestCutId = 0;
let _costCallId = 0;
let _latestCostId = 0;
let _assemblyCallId = 0;
let _latestAssemblyId = 0;

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

// ── Proxy getters ─────────────────────────────────────────────────────────────

function getCutProxy(): Comlink.Remote<CutOptimizerWorkerApi> | null {
  if (typeof Worker === 'undefined') return null;
  if (!_cutProxy) _cutProxy = Comlink.wrap<CutOptimizerWorkerApi>(new CutOptimizerWorker());
  return _cutProxy;
}

function getCostProxy(): Comlink.Remote<CostEstimatorWorkerApi> | null {
  if (typeof Worker === 'undefined') return null;
  if (!_costProxy) _costProxy = Comlink.wrap<CostEstimatorWorkerApi>(new CostEstimatorWorker());
  return _costProxy;
}

function getAssemblyProxy(): Comlink.Remote<AssemblyWorkerApi> | null {
  if (typeof Worker === 'undefined') return null;
  if (!_assemblyProxy) _assemblyProxy = Comlink.wrap<AssemblyWorkerApi>(new AssemblyWorker());
  return _assemblyProxy;
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
): void {
  // Sprint 16 — decorate with rotation locks before sending to optimizer.
  const lockedActive = applyLocks(activeParts);
  const lockedAll = applyLocks(allParts);
  const proxy = getCutProxy();
  if (!proxy) {
    // Synchronous fallback (tests / browsers without Worker support).
    if (_workerApplyFn) {
      const activeRes = optimizeCutSheetsResult(
        lockedActive,
        sawKerfMm,
        sheetSizeOverrides,
        _cutMode,
        _offcutCatalog,
        _defectZones,
      );
      const combinedRes = optimizeCutSheetsResult(
        lockedAll,
        sawKerfMm,
        sheetSizeOverrides,
        _cutMode,
        _offcutCatalog,
        _defectZones,
      );
      if (activeRes.ok && combinedRes.ok) {
        _workerApplyFn({
          optimization: activeRes.value,
          combinedOptimization: combinedRes.value,
          optimizationPending: false,
        });
      } else {
        _workerApplyFn({ optimizationPending: false });
      }
    }
    return;
  }
  const callId = ++_cutCallId;
  _latestCutId = callId;
  const input: CutOptimizerInput = {
    activeParts: lockedActive,
    allParts: lockedAll,
    sawKerfMm,
    sheetSizeOverrides,
    cutMode: _cutMode,
    offcutCatalog: _offcutCatalog,
    defectZones: _defectZones,
  };
  void proxy
    .run(input)
    .then((result) => {
      if (!_workerApplyFn || _latestCutId !== callId) return; // stale
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
    .catch(() => {
      _workerApplyFn?.({ optimizationPending: false });
    });
}

export function scheduleAssembly(config: CabinetConfig): void {
  const proxy = getAssemblyProxy();
  if (!proxy) {
    if (_workerApplyFn) {
      _workerApplyFn({ assemblySteps: generateAssemblySteps(config), assemblyPending: false });
    }
    return;
  }
  const callId = ++_assemblyCallId;
  _latestAssemblyId = callId;
  void proxy
    .run({ config })
    .then((result) => {
      if (!_workerApplyFn || _latestAssemblyId !== callId) return; // stale
      _workerApplyFn({ assemblySteps: result.steps, assemblyPending: false });
    })
    .catch(() => {
      _workerApplyFn?.({ assemblyPending: false });
    });
}

export function scheduleCost(
  optimization: OptimizationResult,
  hardware: HardwareItem[],
  edgeBandingTotal: number,
  materialPriceOverrides: Record<string, number>,
  edgeBandingRate: number,
  hardwarePriceOverrides: Record<string, number>,
  labourRate: number,
  labourHours: number,
  finishCost: number,
): void {
  const proxy = getCostProxy();
  if (!proxy) {
    if (_workerApplyFn) {
      _workerApplyFn({
        cost: estimateCost(
          optimization,
          hardware,
          edgeBandingTotal,
          materialPriceOverrides,
          edgeBandingRate,
          hardwarePriceOverrides,
          labourRate,
          labourHours,
          finishCost,
        ),
        costPending: false,
      });
    }
    return;
  }
  const callId = ++_costCallId;
  _latestCostId = callId;
  const input: CostEstimatorInput = {
    optimization,
    hardware,
    edgeBandingTotal,
    materialPriceOverrides,
    edgeBandingRate,
    hardwarePriceOverrides,
    labourRate,
    labourHours,
    finishCost,
  };
  void proxy
    .run(input)
    .then((result) => {
      if (!_workerApplyFn || _latestCostId !== callId) return; // stale
      _workerApplyFn({ cost: result.cost, costPending: false });
    })
    .catch(() => {
      _workerApplyFn?.({ costPending: false });
    });
}

export function scheduleCostFromState(
  state: CabinetState,
  optimizationOverride?: OptimizationResult,
  hardwareOverride?: HardwareItem[],
  edgeBandingTotalOverride?: number,
  partialOverrides?: Partial<CabinetState>,
): void {
  scheduleCost(
    optimizationOverride ?? state.optimization,
    hardwareOverride ?? state.hardware,
    edgeBandingTotalOverride ?? state.edgeBandingTotal,
    partialOverrides?.materialPriceOverrides ?? state.materialPriceOverrides,
    partialOverrides?.edgeBandingRate ?? state.edgeBandingRate,
    partialOverrides?.hardwarePriceOverrides ?? state.hardwarePriceOverrides,
    partialOverrides?.labourRate ?? state.labourRate,
    partialOverrides?.labourHours ?? state.labourHours,
    partialOverrides?.finishCost ?? state.finishCost,
  );
}
