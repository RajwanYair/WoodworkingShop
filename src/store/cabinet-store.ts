import { create } from 'zustand';
import type { CabinetConfig, Part, HardwareItem, OptimizationResult, DerivedDimensions, OffcutEntry, DefectZone } from '../engine/types';
import { DEFAULT_CONFIG } from '../engine/materials';
import { computeDimensions } from '../engine/dimensions';
import { generateParts, computeEdgeBandingTotal } from '../engine/parts';
import { generateHardware } from '../engine/hardware';
import { optimizeCutSheets, optimizeCutSheetsResult } from '../engine/cut-optimizer';
import { estimateCost } from '../engine/cost-estimator';
import { generateAssemblySteps, type AssemblyStep } from '../engine/assembly';
import { createJsonMemo } from '../engine/memo';
import { readConfigFromUrl, pushConfigToUrl, readProjectNameFromUrl } from '../utils/url-state';
import { idbLoadSnapshots } from '../utils/indexed-db-storage';
import CutOptimizerWorker from '../workers/cut-optimizer.worker?worker';
import type { CutOptimizerWorkerInput, CutOptimizerWorkerOutput } from '../workers/cut-optimizer.worker';
import CostEstimatorWorker from '../workers/cost-estimator.worker?worker';
import type { CostEstimatorWorkerInput, CostEstimatorWorkerOutput } from '../workers/cost-estimator.worker';
import AssemblyWorker from '../workers/assembly.worker?worker';
import type { AssemblyWorkerInput, AssemblyWorkerOutput } from '../workers/assembly.worker';
import { pluginEventBus } from '../engine/plugin';
import { workerCall, nextRpcId } from '../workers/worker-rpc';
// Phase 11 — Slice imports
import { createUiSlice, loadUiPrefs, type UiSlice } from './slices/uiSlice';
import { createSnapshotSlice, loadSnapshotsFromStorage, type SnapshotSlice, type ProjectSnapshot } from './slices/snapshotSlice';
import { createOptimizerSettingsSlice, type OptimizerSettingsSlice } from './slices/optimizerSettingsSlice';

// v3.21.0 — Module-level Web Worker singleton for cut optimization.
// Kept outside Zustand state to avoid serialization. The worker result
// callback closes over `_workerApplyFn` which is set during store creation.
let _cutOptWorker: Worker | null = null;
let _costOptWorker: Worker | null = null;
let _assemblyWorker: Worker | null = null;
let _workerApplyFn: ((partial: Partial<CabinetState>) => void) | null = null;
// Phase 11 — "latest-wins" sentinels replace the old _currentReqId counters.
// Each scheduling call sets its sentinel; after the Promise resolves the call
// compares its id against the sentinel to discard stale results.
let _latestCutReqId = '';
let _latestCostReqId = '';
let _latestAssemblyReqId = '';

function getCutOptWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  if (!_cutOptWorker) {
    _cutOptWorker = new CutOptimizerWorker();
    // No onmessage handler — workerCall adds per-request listeners instead.
  }
  return _cutOptWorker;
}

function getCostEstimatorWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  if (!_costOptWorker) {
    _costOptWorker = new CostEstimatorWorker();
  }
  return _costOptWorker;
}

function getAssemblyWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  if (!_assemblyWorker) {
    _assemblyWorker = new AssemblyWorker();
  }
  return _assemblyWorker;
}

/**
 * Sprint 16 — Module-level rotation-lock map keyed by part ID.
 * Mutated by the `toggleRotationLock` store action; read by `applyLocks` below
 * to decorate parts with `rotationLocked: true` before they reach the cut
 * optimizer (engine or worker). Initialised from the persisted session.
 */
let _rotationLocks: Record<string, boolean> = {};
/**
 * Phase 11 / Sprint 5 — Active cut mode, mirroring the active cabinet's
 * `config.cutMode`.  Updated in `deriveBaseProject` (called before every
 * `scheduleOptimization`), so the worker and sync fallback always use the
 * current value without requiring call-site changes.
 */
let _cutMode: 'guillotine' | 'freeform' = 'freeform';
/** Phase 12 / Sprint 12 — catalog offcuts available to the optimizer; updated by setOffcutCatalog/addOffcutEntry/removeOffcutEntry. */
let _offcutCatalog: OffcutEntry[] = [];
/** Phase 12 / Sprint 13 — defect zones per material, pre-blocked in MaxRects packing. */
let _defectZones: Record<string, DefectZone[]> = {};
function applyLocks(parts: Part[]): Part[] {
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

/**
 * Fire-and-forget: post a cut-optimization request to the worker.
 * Falls back to synchronous computation when Workers are unavailable (e.g. tests).
 */
function scheduleOptimization(
  activeParts: Part[],
  allParts: Part[],
  sawKerfMm: number,
  sheetSizeOverrides: Record<string, { width: number; length: number }>,
): void {
  // Sprint 16 — decorate with rotation locks before sending to optimizer.
  const lockedActive = applyLocks(activeParts);
  const lockedAll = applyLocks(allParts);
  const worker = getCutOptWorker();
  if (!worker) {
    // Synchronous fallback (tests / browsers without Worker support).
    // Phase 11 — use Result-returning variant so material lookup errors surface
    // cleanly rather than throwing across the fallback boundary.
    if (_workerApplyFn) {
      const activeRes = optimizeCutSheetsResult(lockedActive, sawKerfMm, sheetSizeOverrides, _cutMode, _offcutCatalog, _defectZones);
      const combinedRes = optimizeCutSheetsResult(lockedAll, sawKerfMm, sheetSizeOverrides, _cutMode, _offcutCatalog, _defectZones);
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
  const reqId = nextRpcId();
  _latestCutReqId = reqId;
  void workerCall<CutOptimizerWorkerInput, CutOptimizerWorkerOutput>(
    worker,
    { activeParts: lockedActive, allParts: lockedAll, sawKerfMm, sheetSizeOverrides, cutMode: _cutMode, offcutCatalog: _offcutCatalog, defectZones: _defectZones },
    reqId,
  )
    .then((msg) => {
      if (!_workerApplyFn || _latestCutReqId !== reqId) return; // stale
      if (msg.type === 'done' && msg.activeResult && msg.combinedResult) {
        _workerApplyFn({
          optimization: msg.activeResult,
          combinedOptimization: msg.combinedResult,
          optimizationPending: false,
          costPending: true,
        });
        // Sprint 20 — notify plugins that optimization completed.
        pluginEventBus.emit('optimization:complete', {
          sheetCount: msg.activeResult.sheets.length,
          yieldPercent: msg.activeResult.overallYield,
        });
        scheduleCostFromState(useCabinetStore.getState(), msg.activeResult);
      } else {
        _workerApplyFn({ optimizationPending: false });
      }
    })
    .catch(() => {
      _workerApplyFn?.({ optimizationPending: false });
    });
}

function scheduleAssembly(config: CabinetConfig): void {
  const worker = getAssemblyWorker();
  if (!worker) {
    if (_workerApplyFn) {
      _workerApplyFn({ assemblySteps: generateAssemblySteps(config), assemblyPending: false });
    }
    return;
  }
  const reqId = nextRpcId();
  _latestAssemblyReqId = reqId;
  void workerCall<AssemblyWorkerInput, AssemblyWorkerOutput>(worker, { config }, reqId)
    .then((msg) => {
      if (!_workerApplyFn || _latestAssemblyReqId !== reqId) return; // stale
      if (msg.type === 'done' && msg.steps) {
        _workerApplyFn({ assemblySteps: msg.steps, assemblyPending: false });
      } else {
        _workerApplyFn({ assemblyPending: false });
      }
    })
    .catch(() => {
      _workerApplyFn?.({ assemblyPending: false });
    });
}

function scheduleCost(
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
  const worker = getCostEstimatorWorker();
  if (!worker) {
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
  const reqId = nextRpcId();
  _latestCostReqId = reqId;
  void workerCall<CostEstimatorWorkerInput, CostEstimatorWorkerOutput>(
    worker,
    {
      optimization,
      hardware,
      edgeBandingTotal,
      materialPriceOverrides,
      edgeBandingRate,
      hardwarePriceOverrides,
      labourRate,
      labourHours,
      finishCost,
    },
    reqId,
  )
    .then((msg) => {
      if (!_workerApplyFn || _latestCostReqId !== reqId) return; // stale
      if (msg.type === 'done' && msg.cost) {
        _workerApplyFn({ cost: msg.cost, costPending: false });
      } else {
        _workerApplyFn({ costPending: false });
      }
    })
    .catch(() => {
      _workerApplyFn?.({ costPending: false });
    });
}

function scheduleCostFromState(
  state: CabinetState,
  optimizationOverride?: OptimizationResult,
  hardwareOverride?: HardwareItem[],
  edgeBandingTotalOverride?: number,
  partialOverrides?: Partial<CabinetState>,
) {
  scheduleCost(
    optimizationOverride || state.optimization,
    hardwareOverride || state.hardware,
    edgeBandingTotalOverride ?? state.edgeBandingTotal,
    partialOverrides?.materialPriceOverrides ?? state.materialPriceOverrides,
    partialOverrides?.edgeBandingRate ?? state.edgeBandingRate,
    partialOverrides?.hardwarePriceOverrides ?? state.hardwarePriceOverrides,
    partialOverrides?.labourRate ?? state.labourRate,
    partialOverrides?.labourHours ?? state.labourHours,
    partialOverrides?.finishCost ?? state.finishCost,
  );
}

const MAX_HISTORY = 50;

// Phase 11 — UI preferences now live in uiSlice.ts.  Re-export so tests and
// any external consumers that imported from cabinet-store still work.
export { detectOsDarkModeUi as detectOsDarkMode } from './slices/uiSlice';

// v3.44.0 — Auto-save: snapshot of project state persisted across page refreshes.
const SESSION_KEY = 'woodworkingshop:session';
interface SessionSnapshot {
  cabinets: CabinetEntry[];
  activeCabinetIndex: number;
  projectName: string;
  /** Sprint 14 — project-level notes, optional so old sessions deserialise safely. */
  projectNotes?: string;
  sawKerf: number;
  materialPriceOverrides: Record<string, number>;
  edgeBandingRate: number;
  hardwarePriceOverrides: Record<string, number>;
  hardwareQtyOverrides: Record<string, number>;
  sheetSizeOverrides: Record<string, { width: number; length: number }>;
  labourRate: number;
  labourHours: number;
  finishCost: number;
  /** Sprint 16 — per-part rotation lock map (partId → true). */
  rotationLockedPartIds?: Record<string, boolean>;
}
function loadSession(): SessionSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SessionSnapshot) : null;
  } catch {
    return null;
  }
}
function saveSession(snap: SessionSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(snap));
  } catch {
    /* quota exceeded — ignore */
  }
}

export interface CabinetEntry {
  name: string;
  config: CabinetConfig;
  notes?: string;
}

// Phase 11 — ProjectSnapshot moved to snapshotSlice.ts; re-export for backward
// compat (tests + utils import it from cabinet-store).
export type { ProjectSnapshot } from './slices/snapshotSlice';

/**
 * Phase 11: CabinetState is now composed of the Config slice (inline) +
 * three extracted slices.  The external API is identical — components and
 * tests continue to import everything from this file.
 */
export type CabinetState = {
  // ── Config / multi-cabinet state ──
  cabinets: CabinetEntry[];
  activeCabinetIndex: number;
  config: CabinetConfig;
  dimensions: DerivedDimensions;
  parts: Part[];
  hardware: HardwareItem[];
  optimization: OptimizationResult;
  edgeBandingTotal: number;
  cost: ReturnType<typeof estimateCost>;
  assemblySteps: AssemblyStep[];
  allParts: Part[];
  combinedOptimization: OptimizationResult;
  optimizationPending: boolean;
  costPending: boolean;
  assemblyPending: boolean;
  _past: CabinetEntry[][];
  _future: CabinetEntry[][];
  canUndo: boolean;
  canRedo: boolean;
  rotationLockedPartIds: Record<string, boolean>;
  /** Phase 12 / Sprint 12 — saved partial-sheet offcuts available for reuse. */
  offcutCatalog: OffcutEntry[];
  /** Phase 12 / Sprint 13 — per-material defect zones pre-blocked in MaxRects packing. */
  defectZones: Record<string, DefectZone[]>;

  // ── Config actions ──
  setConfig: (patch: Partial<CabinetConfig>) => void;
  resetConfig: () => void;
  undo: () => void;
  redo: () => void;
  addCabinet: () => void;
  removeCabinet: (index: number) => void;
  duplicateCabinet: (index: number) => void;
  moveCabinet: (index: number, direction: 'up' | 'down') => void;
  setActiveCabinet: (index: number) => void;
  renameCabinet: (index: number, name: string) => void;
  setNotes: (index: number, notes: string) => void;
  toggleRotationLock: (partId: string) => void;
  loadProject: (cabinets: CabinetEntry[]) => void;
  bulkReplaceMaterial: (fromKey: string, toKey: string) => void;
  setOffcutCatalog: (catalog: OffcutEntry[]) => void;
  addOffcutEntry: (entry: OffcutEntry) => void;
  removeOffcutEntry: (id: string) => void;
  addDefectZone: (materialKey: string, zone: DefectZone) => void;
  removeDefectZone: (materialKey: string, zoneIndex: number) => void;
} & UiSlice &
  OptimizerSettingsSlice &
  SnapshotSlice;

function derive(
  config: CabinetConfig,
  sawKerfMm = 4,
  sheetSizeOverrides: Record<string, { width: number; length: number }> = {},
) {
  const dimensions = computeDimensions(config);
  const parts = generateParts(config);
  const hardware = generateHardware(config);
  // Sprint 16 — decorate with rotation locks before optimization.
  const optimization = optimizeCutSheets(applyLocks(parts), sawKerfMm, sheetSizeOverrides, config.cutMode ?? 'freeform');
  const edgeBandingTotal = computeEdgeBandingTotal(parts);
  return { dimensions, parts, hardware, optimization, edgeBandingTotal };
}

function deriveProject(
  cabinets: CabinetEntry[],
  activeIndex: number,
  sawKerfMm = 4,
  sheetSizeOverrides: Record<string, { width: number; length: number }> = {},
) {
  const activeConfig = cabinets[activeIndex].config;
  const active = derive(activeConfig, sawKerfMm, sheetSizeOverrides);
  // Combined parts from all cabinets (prefixed with cabinet index)
  const allParts: Part[] = cabinets.flatMap((cab, ci) =>
    generateParts(cab.config).map((p) => ({
      ...p,
      id: cabinets.length > 1 ? `C${ci + 1}-${p.id}` : p.id,
    })),
  );
  // Sprint 16 — apply rotation locks for combined optimization.
  const combinedOptimization = optimizeCutSheets(applyLocks(allParts), sawKerfMm, sheetSizeOverrides, activeConfig.cutMode ?? 'freeform');
  return { config: activeConfig, ...active, allParts, combinedOptimization };
}

// v3.21.0 — Base derivation (parts, hardware, dimensions) WITHOUT cut optimization.
// Used for synchronous state updates so the UI renders new parts instantly while
// the worker computes fresh optimization in the background.
// v3.51.0 — Optimized: reuses the active cabinet's already-computed parts in the
// allParts flatMap instead of calling generateParts twice for the same config.
function deriveBaseProject(cabinets: CabinetEntry[], activeIndex: number) {
  const activeConfig = cabinets[activeIndex].config;
  // Phase 11 / Sprint 5 — sync module-level cut mode from active config so
  // scheduleOptimization always uses the latest value without extra params.
  _cutMode = activeConfig.cutMode ?? 'freeform';
  const dimensions = computeDimensions(activeConfig);
  const parts = generateParts(activeConfig);
  const hardware = generateHardware(activeConfig);
  const edgeBandingTotal = computeEdgeBandingTotal(parts);
  const allParts: Part[] = cabinets.flatMap((cab, ci) => {
    const cabParts = ci === activeIndex ? parts : generateParts(cab.config);
    return cabParts.map((p) => ({
      ...p,
      id: cabinets.length > 1 ? `C${ci + 1}-${p.id}` : p.id,
    }));
  });
  return { config: activeConfig, dimensions, parts, hardware, edgeBandingTotal, allParts };
}

// v3.11.0 — Memoised wrappers: rapid undo/redo and repeated setConfig calls
// with identical arguments skip the MaxRects computation entirely.
const deriveProjectMemo = createJsonMemo(deriveProject);

export const useCabinetStore = create<CabinetState>((set, get) => {
  // v3.21.0 — Capture `set` so the worker response callback can update state.
  _workerApplyFn = set as (partial: Partial<CabinetState>) => void;

  const urlPatch = readConfigFromUrl();
  // v3.44.0 — Restore session from localStorage when present.
  // URL config params take precedence for the active cabinet (enables shared links).
  const session = loadSession();
  let initialCabinets: CabinetEntry[];
  let initialActiveIndex = 0;
  if (session) {
    initialCabinets = session.cabinets.map((c) => ({
      ...c,
      config: { ...DEFAULT_CONFIG, ...c.config },
    }));
    initialActiveIndex = Math.min(session.activeCabinetIndex, initialCabinets.length - 1);
    if (Object.keys(urlPatch).length > 0) {
      // Shared-link scenario: apply URL params on top of the restored active cabinet
      initialCabinets = initialCabinets.map((cab, i) =>
        i === initialActiveIndex ? { ...cab, config: { ...cab.config, ...urlPatch } } : cab,
      );
    }
  } else {
    const initialConfig = { ...DEFAULT_CONFIG, ...urlPatch };
    initialCabinets = [{ name: 'Cabinet 1', config: initialConfig }];
  }
  // Sprint 16 — hydrate module-level lock map from session before deriving initial optimization.
  _rotationLocks = session?.rotationLockedPartIds ?? {};
  const initial = deriveProjectMemo(initialCabinets, initialActiveIndex);
  const prefs = loadUiPrefs();
  const initialProjectName = session?.projectName || readProjectNameFromUrl();
  const initialProjectNotes = session?.projectNotes ?? '';
  const initialSnapshots = loadSnapshotsFromStorage();

  // ── Slice callbacks (close over `set` and `get`) ──────────────────────────
  // Called by OptimizerSettingsSlice when kerf or sheet overrides change.
  function handleRescheduleOpt(sawKerf: number, sheetSizeOverrides: Record<string, { width: number; length: number }>) {
    const state = get();
    const base = deriveBaseProject(state.cabinets, state.activeCabinetIndex);
    scheduleOptimization(base.parts, base.allParts, sawKerf, sheetSizeOverrides);
    scheduleAssembly(base.config);
    set({ ...base, optimizationPending: true, costPending: true, assemblyPending: true } as Partial<CabinetState>);
  }
  // Called by OptimizerSettingsSlice when cost-only params change.
  function handleRescheduleCost(overrides: Partial<OptimizerSettingsSlice>) {
    scheduleCostFromState(get(), undefined, undefined, undefined, overrides as Partial<CabinetState>);
    set({ costPending: true } as Partial<CabinetState>);
  }
  // Called by SnapshotSlice restoreSnapshot so the config slice handles undo history.
  function handleRestoreSnapshot(cabinets: CabinetEntry[]) {
    const state = get();
    const past = [...state._past, state.cabinets].slice(-MAX_HISTORY);
    const migrated = cabinets.map((c) => ({ ...c, config: { ...DEFAULT_CONFIG, ...c.config } }));
    const base = deriveBaseProject(migrated, 0);
    scheduleOptimization(base.parts, base.allParts, state.sawKerf, state.sheetSizeOverrides);
    scheduleAssembly(base.config);
    set({
      cabinets: migrated,
      activeCabinetIndex: 0,
      ...base,
      optimizationPending: true,
      costPending: true,
      assemblyPending: true,
      _past: past,
      _future: [],
      canUndo: true,
      canRedo: false,
    } as Partial<CabinetState>);
  }

  // Type-narrowing wrappers: each slice only sets its own state fields so the
  // cast from Partial<SliceType> → Partial<CabinetState> is structurally safe.
  type SliceSetFn<S> = (partial: Partial<S> | ((s: S) => Partial<S>)) => void;
  // Single shared dispatcher — CabinetState is structurally a supertype of every
  // slice (it contains all slice fields), so the narrowed aliases are sound.
  const sliceSetImpl: SliceSetFn<CabinetState> = (partial) => { set(partial); };
  const uiSet = sliceSetImpl as SliceSetFn<UiSlice>;
  const optSet = sliceSetImpl as SliceSetFn<OptimizerSettingsSlice>;
  const snapSet = sliceSetImpl as SliceSetFn<SnapshotSlice>;

  return {
    // ── Config / multi-cabinet slice (inline) ─────────────────────────────
    cabinets: initialCabinets,
    activeCabinetIndex: initialActiveIndex,
    ...initial,
    _past: [],
    _future: [],
    canUndo: false,
    canRedo: false,
    rotationLockedPartIds: session?.rotationLockedPartIds ?? {},
    offcutCatalog: [],
    defectZones: {},
    optimizationPending: false,
    costPending: false,
    assemblyPending: false,
    cost: estimateCost(
      initial.optimization,
      initial.hardware,
      initial.edgeBandingTotal,
      session?.materialPriceOverrides ?? {},
      session?.edgeBandingRate ?? 3,
      session?.hardwarePriceOverrides ?? {},
      session?.labourRate ?? 75,
      session?.labourHours ?? 0,
      session?.finishCost ?? 0,
    ),
    assemblySteps: generateAssemblySteps(initial.config),

    // ── UI slice ───────────────────────────────────────────────────────────
    ...createUiSlice(uiSet, prefs, initialProjectName, initialProjectNotes),

    // ── Optimizer settings slice ───────────────────────────────────────────
    ...createOptimizerSettingsSlice(
      optSet,
      () => get() as OptimizerSettingsSlice,
      session,
      handleRescheduleOpt,
      handleRescheduleCost,
    ),

    // ── Snapshot slice ─────────────────────────────────────────────────────
    ...createSnapshotSlice(
      snapSet,
      () => get() as SnapshotSlice,
      initialSnapshots,
      () => get().cabinets,
      handleRestoreSnapshot,
    ),

    // ── Config actions (inline) ────────────────────────────────────────────
    setConfig: (patch) =>
      set((state) => {
        const cabinets = state.cabinets.map((cab, i) =>
          i === state.activeCabinetIndex ? { ...cab, config: { ...cab.config, ...patch } } : cab,
        );
        pushConfigToUrl(cabinets[state.activeCabinetIndex].config);
        // Sprint 20 — notify plugins that config changed.
        pluginEventBus.emit('config:change', { config: cabinets[state.activeCabinetIndex].config });
        const past = [...state._past, state.cabinets].slice(-MAX_HISTORY);
        const base = deriveBaseProject(cabinets, state.activeCabinetIndex);
        scheduleOptimization(base.parts, base.allParts, state.sawKerf, state.sheetSizeOverrides);
        scheduleAssembly(base.config);
        return {
          cabinets,
          ...base,
          optimizationPending: true,
          costPending: true,
          assemblyPending: true,
          _past: past,
          _future: [],
          canUndo: true,
          canRedo: false,
        };
      }),

    resetConfig: () =>
      set((state) => {
        const cabinets = state.cabinets.map((cab, i) =>
          i === state.activeCabinetIndex ? { ...cab, config: DEFAULT_CONFIG } : cab,
        );
        pushConfigToUrl(DEFAULT_CONFIG);
        const past = [...state._past, state.cabinets].slice(-MAX_HISTORY);
        const base = deriveBaseProject(cabinets, state.activeCabinetIndex);
        scheduleOptimization(base.parts, base.allParts, state.sawKerf, state.sheetSizeOverrides);
        scheduleAssembly(base.config);
        return {
          cabinets,
          ...base,
          optimizationPending: true,
          costPending: true,
          assemblyPending: true,
          _past: past,
          _future: [],
          canUndo: true,
          canRedo: false,
        };
      }),

    undo: () =>
      set((state) => {
        if (state._past.length === 0) return state;
        const prevCabinets = state._past[state._past.length - 1];
        const past = state._past.slice(0, -1);
        const idx = Math.min(state.activeCabinetIndex, prevCabinets.length - 1);
        pushConfigToUrl(prevCabinets[idx].config);
        const base = deriveBaseProject(prevCabinets, idx);
        scheduleOptimization(base.parts, base.allParts, state.sawKerf, state.sheetSizeOverrides);
        scheduleAssembly(base.config);
        return {
          cabinets: prevCabinets,
          activeCabinetIndex: idx,
          ...base,
          optimizationPending: true,
          costPending: true,
          assemblyPending: true,
          _past: past,
          _future: [state.cabinets, ...state._future],
          canUndo: past.length > 0,
          canRedo: true,
        };
      }),

    redo: () =>
      set((state) => {
        if (state._future.length === 0) return state;
        const nextCabinets = state._future[0];
        const future = state._future.slice(1);
        const idx = Math.min(state.activeCabinetIndex, nextCabinets.length - 1);
        pushConfigToUrl(nextCabinets[idx].config);
        const base = deriveBaseProject(nextCabinets, idx);
        scheduleOptimization(base.parts, base.allParts, state.sawKerf, state.sheetSizeOverrides);
        scheduleAssembly(base.config);
        return {
          cabinets: nextCabinets,
          activeCabinetIndex: idx,
          ...base,
          optimizationPending: true,
          costPending: true,
          assemblyPending: true,
          _past: [...state._past, state.cabinets],
          _future: future,
          canUndo: true,
          canRedo: future.length > 0,
        };
      }),

    addCabinet: () =>
      set((state) => {
        const past = [...state._past, state.cabinets].slice(-MAX_HISTORY);
        const newCab: CabinetEntry = { name: `Cabinet ${state.cabinets.length + 1}`, config: { ...DEFAULT_CONFIG } };
        const cabinets = [...state.cabinets, newCab];
        const idx = cabinets.length - 1;
        pushConfigToUrl(cabinets[idx].config);
        const base = deriveBaseProject(cabinets, idx);
        scheduleOptimization(base.parts, base.allParts, state.sawKerf, state.sheetSizeOverrides);
        scheduleAssembly(base.config);
        return {
          cabinets,
          activeCabinetIndex: idx,
          ...base,
          optimizationPending: true,
          costPending: true,
          assemblyPending: true,
          _past: past,
          _future: [],
          canUndo: true,
          canRedo: false,
        };
      }),

    removeCabinet: (index) =>
      set((state) => {
        if (state.cabinets.length <= 1) return state;
        const past = [...state._past, state.cabinets].slice(-MAX_HISTORY);
        const cabinets = state.cabinets.filter((_, i) => i !== index);
        const idx = Math.min(state.activeCabinetIndex, cabinets.length - 1);
        pushConfigToUrl(cabinets[idx].config);
        const base = deriveBaseProject(cabinets, idx);
        scheduleOptimization(base.parts, base.allParts, state.sawKerf, state.sheetSizeOverrides);
        scheduleAssembly(base.config);
        return {
          cabinets,
          activeCabinetIndex: idx,
          ...base,
          optimizationPending: true,
          costPending: true,
          assemblyPending: true,
          _past: past,
          _future: [],
          canUndo: true,
          canRedo: false,
        };
      }),

    // Sprint 125 — duplicate an existing cabinet with an incremented name
    duplicateCabinet: (index) =>
      set((state) => {
        if (index < 0 || index >= state.cabinets.length) return state;
        const src = state.cabinets[index];
        const baseName = src.name.replace(/\s*\(copy(?:\s+\d+)?\)\s*$/, '');
        const copies = state.cabinets.filter((c) => c.name.startsWith(baseName + ' (copy')).length;
        const newName = copies === 0 ? `${baseName} (copy)` : `${baseName} (copy ${copies + 1})`;
        const newEntry: CabinetEntry = { name: newName, config: { ...src.config } };
        const cabinets = [...state.cabinets.slice(0, index + 1), newEntry, ...state.cabinets.slice(index + 1)];
        const newIndex = index + 1;
        const past = [...state._past, state.cabinets].slice(-MAX_HISTORY);
        pushConfigToUrl(cabinets[newIndex].config);
        const base = deriveBaseProject(cabinets, newIndex);
        scheduleOptimization(base.parts, base.allParts, state.sawKerf, state.sheetSizeOverrides);
        scheduleAssembly(base.config);
        return {
          cabinets,
          activeCabinetIndex: newIndex,
          ...base,
          optimizationPending: true,
          costPending: true,
          assemblyPending: true,
          _past: past,
          _future: [],
          canUndo: true,
          canRedo: false,
        };
      }),

    // Sprint 61 — reorder cabinets within the project list
    moveCabinet: (index, direction) =>
      set((state) => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= state.cabinets.length) return state;
        const cabinets = [...state.cabinets];
        [cabinets[index], cabinets[targetIndex]] = [cabinets[targetIndex], cabinets[index]];
        // Keep active index pointing at the moved cabinet
        const newActive =
          state.activeCabinetIndex === index
            ? targetIndex
            : state.activeCabinetIndex === targetIndex
              ? index
              : state.activeCabinetIndex;
        const past = [...state._past, state.cabinets].slice(-MAX_HISTORY);
        const base = deriveBaseProject(cabinets, newActive);
        scheduleOptimization(base.parts, base.allParts, state.sawKerf, state.sheetSizeOverrides);
        scheduleAssembly(base.config);
        return {
          cabinets,
          activeCabinetIndex: newActive,
          ...base,
          optimizationPending: true,
          costPending: true,
          assemblyPending: true,
          _past: past,
          _future: [],
          canUndo: true,
          canRedo: false,
        };
      }),

    setActiveCabinet: (index) =>
      set((state) => {
        if (index < 0 || index >= state.cabinets.length) return state;
        pushConfigToUrl(state.cabinets[index].config);
        const base = deriveBaseProject(state.cabinets, index);
        scheduleOptimization(base.parts, base.allParts, state.sawKerf, state.sheetSizeOverrides);
        scheduleAssembly(base.config);
        return {
          activeCabinetIndex: index,
          ...base,
          optimizationPending: true,
          costPending: true,
          assemblyPending: true,
        };
      }),

    renameCabinet: (index, name) =>
      set((state) => {
        const cabinets = state.cabinets.map((cab, i) => (i === index ? { ...cab, name } : cab));
        return { cabinets };
      }),

    setNotes: (index, notes) =>
      set((state) => {
        const cabinets = state.cabinets.map((cab, i) => (i === index ? { ...cab, notes } : cab));
        return { cabinets };
      }),

    loadProject: (cabinets) =>
      set((state) => {
        const past = [...state._past, state.cabinets].slice(-MAX_HISTORY);
        const migrated = cabinets.map((c) => ({
          ...c,
          config: { ...DEFAULT_CONFIG, ...c.config },
        }));
        const base = deriveBaseProject(migrated, 0);
        scheduleOptimization(base.parts, base.allParts, state.sawKerf, state.sheetSizeOverrides);
        scheduleAssembly(base.config);
        return {
          cabinets: migrated,
          activeCabinetIndex: 0,
          ...base,
          optimizationPending: true,
          costPending: true,
          assemblyPending: true,
          _past: past,
          _future: [],
          canUndo: true,
          canRedo: false,
        };
      }),

    /** Sprint 16 — toggle per-part rotation lock and trigger re-optimization. */
    toggleRotationLock: (partId) =>
      set((state) => {
        const next = { ...state.rotationLockedPartIds };
        if (next[partId]) {
          delete next[partId];
        } else {
          next[partId] = true;
        }
        // Update module-level map BEFORE scheduling so the optimizer sees fresh locks.
        _rotationLocks = next;
        // Sprint 20 — notify plugins.
        pluginEventBus.emit('part:rotation-lock', { partId, locked: next[partId] === true });
        const base = deriveBaseProject(state.cabinets, state.activeCabinetIndex);
        scheduleOptimization(base.parts, base.allParts, state.sawKerf, state.sheetSizeOverrides);
        return { rotationLockedPartIds: next, ...base, optimizationPending: true };
      }),
    // v3.18.0 — Bulk material replacement across all cabinets
    bulkReplaceMaterial: (fromKey, toKey) =>
      set((state) => {
        if (fromKey === toKey) return state;
        const past = [...state._past, state.cabinets].slice(-MAX_HISTORY);
        const cabinets = state.cabinets.map((cab) => {
          const config = { ...cab.config };
          if (config.carcassMaterial === fromKey) config.carcassMaterial = toKey;
          if (config.backPanelMaterial === fromKey) config.backPanelMaterial = toKey;
          return { ...cab, config };
        });
        const base = deriveBaseProject(cabinets, state.activeCabinetIndex);
        scheduleOptimization(base.parts, base.allParts, state.sawKerf, state.sheetSizeOverrides);
        scheduleAssembly(base.config);
        return {
          cabinets,
          ...base,
          optimizationPending: true,
          costPending: true,
          assemblyPending: true,
          _past: past,
          _future: [],
          canUndo: true,
          canRedo: false,
        };
      }),
    // Phase 12 / Sprint 12 — offcut catalog actions
    setOffcutCatalog: (catalog) => {
      _offcutCatalog = catalog;
      set({ offcutCatalog: catalog });
    },
    addOffcutEntry: (entry) => {
      _offcutCatalog = [..._offcutCatalog, entry];
      set((s) => ({ offcutCatalog: [...s.offcutCatalog, entry] }));
    },
    removeOffcutEntry: (id) => {
      _offcutCatalog = _offcutCatalog.filter((e) => e.id !== id);
      set((s) => ({ offcutCatalog: s.offcutCatalog.filter((e) => e.id !== id) }));
    },
    addDefectZone: (materialKey, zone) => {
      const updated = { ..._defectZones, [materialKey]: [...(_defectZones[materialKey] ?? []), zone] };
      _defectZones = updated;
      set((s) => {
        const newDz = { ...s.defectZones, [materialKey]: [...(s.defectZones[materialKey] ?? []), zone] };
        return { defectZones: newDz };
      });
      // Re-run the optimizer so the new zone is immediately applied.
      const state = useCabinetStore.getState();
      const base = deriveBaseProject(state.cabinets, state.activeCabinetIndex);
      scheduleOptimization(base.parts, base.allParts, state.sawKerf, state.sheetSizeOverrides);
    },
    removeDefectZone: (materialKey, zoneIndex) => {
      const existing = _defectZones[materialKey] ?? [];
      const filtered = existing.filter((_, i) => i !== zoneIndex);
      const updated = { ..._defectZones, [materialKey]: filtered };
      _defectZones = updated;
      set((s) => {
        const ex = s.defectZones[materialKey] ?? [];
        const newList = ex.filter((_, i) => i !== zoneIndex);
        return { defectZones: { ...s.defectZones, [materialKey]: newList } };
      });
      // Re-run the optimizer so the removed zone is no longer applied.
      const state = useCabinetStore.getState();
      const base = deriveBaseProject(state.cabinets, state.activeCabinetIndex);
      scheduleOptimization(base.parts, base.allParts, state.sawKerf, state.sheetSizeOverrides);
    },

  };
});

// v3.44.0 — Auto-save the full project session to localStorage on every state
// change, debounced to 500 ms. Prevents data loss on HMR or manual page refresh.
let _autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
useCabinetStore.subscribe((state) => {
  if (_autoSaveTimer !== null) clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(() => {
    saveSession({
      cabinets: state.cabinets,
      activeCabinetIndex: state.activeCabinetIndex,
      projectName: state.projectName,
      projectNotes: state.projectNotes,
      sawKerf: state.sawKerf,
      materialPriceOverrides: state.materialPriceOverrides,
      edgeBandingRate: state.edgeBandingRate,
      hardwarePriceOverrides: state.hardwarePriceOverrides,
      hardwareQtyOverrides: state.hardwareQtyOverrides,
      sheetSizeOverrides: state.sheetSizeOverrides,
      labourRate: state.labourRate,
      labourHours: state.labourHours,
      finishCost: state.finishCost,
      rotationLockedPartIds: state.rotationLockedPartIds,
    });
  }, 500);
});

// Hydrate snapshots from IndexedDB after the store is created.
// idbLoadSnapshots handles one-way migration from localStorage on first run.
// We only overwrite state when IndexedDB has data, to avoid wiping a session
// that already loaded from localStorage before the async call resolves.
void idbLoadSnapshots<ProjectSnapshot>().then((snaps) => {
  if (snaps.length > 0) {
    useCabinetStore.setState({ snapshots: snaps });
  }
});
