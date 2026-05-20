import { create } from 'zustand';
import type { CabinetConfig, Part, HardwareItem, OptimizationResult, DerivedDimensions } from '../engine/types';
import type { UnitSystem } from '../utils/units';
import { DEFAULT_CONFIG } from '../engine/materials';
import { computeDimensions } from '../engine/dimensions';
import { generateParts, computeEdgeBandingTotal } from '../engine/parts';
import { generateHardware } from '../engine/hardware';
import { optimizeCutSheets } from '../engine/cut-optimizer';
import { estimateCost } from '../engine/cost-estimator';
import { generateAssemblySteps, type AssemblyStep } from '../engine/assembly';
import { createJsonMemo } from '../engine/memo';
import { readConfigFromUrl, pushConfigToUrl, readProjectNameFromUrl, pushProjectNameToUrl } from '../utils/url-state';
import { idbLoadSnapshots, idbSaveSnapshots } from '../utils/indexed-db-storage';
import CutOptimizerWorker from '../workers/cut-optimizer.worker?worker';
import type { CutOptimizerWorkerInput, CutOptimizerWorkerOutput } from '../workers/cut-optimizer.worker';
import CostEstimatorWorker from '../workers/cost-estimator.worker?worker';
import type { CostEstimatorWorkerOutput } from '../workers/cost-estimator.worker';
import AssemblyWorker from '../workers/assembly.worker?worker';
import type { AssemblyWorkerOutput } from '../workers/assembly.worker';

// v3.21.0 — Module-level Web Worker singleton for cut optimization.
// Kept outside Zustand state to avoid serialization. The worker result
// callback closes over `_workerApplyFn` which is set during store creation.
let _cutOptWorker: Worker | null = null;
let _costOptWorker: Worker | null = null;
let _assemblyWorker: Worker | null = null;
let _workerApplyFn: ((partial: Partial<CabinetState>) => void) | null = null;
let _currentReqId = 0;
let _currentCostReqId = 0;
let _currentAssemblyReqId = 0;

function getCutOptWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  if (!_cutOptWorker) {
    _cutOptWorker = new CutOptimizerWorker();
    _cutOptWorker.onmessage = (e: MessageEvent<CutOptimizerWorkerOutput>) => {
      const msg = e.data;
      if (!_workerApplyFn || msg.requestId !== String(_currentReqId)) return; // stale
      if (msg.type === 'done' && msg.activeResult && msg.combinedResult) {
        _workerApplyFn({
          optimization: msg.activeResult,
          combinedOptimization: msg.combinedResult,
          optimizationPending: false,
          costPending: true,
        });
        scheduleCostFromState(useCabinetStore.getState(), msg.activeResult);
      } else {
        _workerApplyFn({ optimizationPending: false });
      }
    };
  }
  return _cutOptWorker;
}

function getCostEstimatorWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  if (!_costOptWorker) {
    _costOptWorker = new CostEstimatorWorker();
    _costOptWorker.onmessage = (e: MessageEvent<CostEstimatorWorkerOutput>) => {
      const msg = e.data;
      if (!_workerApplyFn || msg.requestId !== String(_currentCostReqId)) return; // stale
      if (msg.type === 'done' && msg.cost) {
        _workerApplyFn({ cost: msg.cost, costPending: false });
      } else {
        _workerApplyFn({ costPending: false });
      }
    };
  }
  return _costOptWorker;
}

function getAssemblyWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  if (!_assemblyWorker) {
    _assemblyWorker = new AssemblyWorker();
    _assemblyWorker.onmessage = (e: MessageEvent<AssemblyWorkerOutput>) => {
      const msg = e.data;
      if (!_workerApplyFn || msg.requestId !== String(_currentAssemblyReqId)) return; // stale
      if (msg.type === 'done' && msg.steps) {
        _workerApplyFn({ assemblySteps: msg.steps, assemblyPending: false });
      } else {
        _workerApplyFn({ assemblyPending: false });
      }
    };
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
    // Synchronous fallback (tests / browsers without Worker support)
    if (_workerApplyFn) {
      _workerApplyFn({
        optimization: optimizeCutSheets(lockedActive, sawKerfMm, sheetSizeOverrides),
        combinedOptimization: optimizeCutSheets(lockedAll, sawKerfMm, sheetSizeOverrides),
        optimizationPending: false,
      });
    }
    return;
  }
  _currentReqId++;
  const payload: CutOptimizerWorkerInput = {
    activeParts: lockedActive,
    allParts: lockedAll,
    sawKerfMm,
    sheetSizeOverrides,
    requestId: String(_currentReqId),
  };
  worker.postMessage(payload);
}

function scheduleAssembly(config: CabinetConfig): void {
  const worker = getAssemblyWorker();
  if (!worker) {
    if (_workerApplyFn) {
      _workerApplyFn({ assemblySteps: generateAssemblySteps(config), assemblyPending: false });
    }
    return;
  }
  _currentAssemblyReqId++;
  worker.postMessage({ requestId: String(_currentAssemblyReqId), config });
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
  _currentCostReqId++;
  worker.postMessage({
    requestId: String(_currentCostReqId),
    optimization,
    hardware,
    edgeBandingTotal,
    materialPriceOverrides,
    edgeBandingRate,
    hardwarePriceOverrides,
    labourRate,
    labourHours,
    finishCost,
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

// Persisted user preferences (Sprint 112). Survives reload via localStorage.
const PREFS_KEY = 'woodworkingshop:prefs';
interface PersistedPrefs {
  darkMode?: boolean;
  colorBlindMode?: boolean;
  highContrastMode?: boolean;
  units?: UnitSystem;
}
function loadPrefs(): PersistedPrefs {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as PersistedPrefs) : {};
  } catch {
    return {};
  }
}

/**
 * Sprint 124 — Detect the OS dark-mode preference.
 * Returns `true` when `(prefers-color-scheme: dark)` matches.
 * Falls back to `false` in environments where matchMedia is unavailable.
 */
export function detectOsDarkMode(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}
function savePrefs(prefs: PersistedPrefs): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* quota / disabled — ignore */
  }
}

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

// Sprint 10 — Project snapshot history
export interface ProjectSnapshot {
  id: string;
  name: string;
  cabinets: CabinetEntry[];
  timestamp: string; // ISO 8601
}

const SNAPSHOTS_KEY = 'woodworkingshop:snapshots';
function loadSnapshots(): ProjectSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SNAPSHOTS_KEY);
    return raw ? (JSON.parse(raw) as ProjectSnapshot[]) : [];
  } catch {
    return [];
  }
}
function saveSnapshots(snaps: ProjectSnapshot[]): void {
  if (typeof window === 'undefined') return;
  try {
    // Persist synchronously to localStorage (immediate next-load availability)
    window.localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snaps));
  } catch {
    /* quota exceeded — ignore */
  }
  // Also persist asynchronously to IndexedDB (reliable long-term storage)
  void idbSaveSnapshots<ProjectSnapshot>(snaps);
}

export interface CabinetState {
  // Multi-cabinet project
  cabinets: CabinetEntry[];
  activeCabinetIndex: number;

  // Active cabinet config (convenience alias)
  config: CabinetConfig;

  // Derived for active cabinet
  dimensions: DerivedDimensions;
  parts: Part[];
  hardware: HardwareItem[];
  optimization: OptimizationResult;
  edgeBandingTotal: number; // mm
  cost: ReturnType<typeof estimateCost>;
  assemblySteps: AssemblyStep[];

  // Combined project-level optimization (all cabinets)
  allParts: Part[];
  combinedOptimization: OptimizationResult;
  /** v3.21.0 — true while the cut-optimizer Web Worker is computing a fresh result */
  optimizationPending: boolean;
  costPending: boolean;
  assemblyPending: boolean;

  // Undo / Redo
  _past: CabinetEntry[][];
  _future: CabinetEntry[][];
  canUndo: boolean;
  canRedo: boolean;

  // UI state
  activeTab: 'configurator' | 'preview' | 'optimizer' | 'assembly' | 'pdf';
  projectName: string; // Sprint 152
  /** Sprint 14 — project-level free-text notes shown in PDF/BOM exports. */
  projectNotes: string;
  darkMode: boolean;
  colorBlindMode: boolean;
  highContrastMode: boolean; // v3.12.0
  units: UnitSystem;
  sawKerf: number; // mm, default 4 (Sprint 136)
  materialPriceOverrides: Record<string, number>; // Sprint 139: materialKey → ₪ per sheet
  edgeBandingRate: number; // Sprint 141: ₪ per meter, default 3
  hardwarePriceOverrides: Record<string, number>; // Sprint 148: hw.id → ₪ per unit
  hardwareQtyOverrides: Record<string, number>; // v3.15.0: hw.id → user-overridden qty
  sheetSizeOverrides: Record<string, { width: number; length: number }>; // Sprint 165: per-material sheet size overrides (mm)
  labourRate: number; // v3.23.0: ₪ per hour, default 75
  labourHours: number; // v3.23.0: estimated labour hours (user-overrideable)
  finishCost: number; // v3.23.0: finish/paint cost in ₪
  /** Sprint 16 — per-part rotation lock map (partId → true). */
  rotationLockedPartIds: Record<string, boolean>;

  // Actions
  setConfig: (patch: Partial<CabinetConfig>) => void;
  resetConfig: () => void;
  setActiveTab: (tab: CabinetState['activeTab']) => void;
  toggleDarkMode: () => void;
  toggleColorBlindMode: () => void;
  toggleHighContrast: () => void; // v3.12.0
  toggleUnits: () => void;
  undo: () => void;
  redo: () => void;
  addCabinet: () => void;
  removeCabinet: (index: number) => void;
  duplicateCabinet: (index: number) => void;
  /** Sprint 61 — swap cabinet at `index` one position up or down in the project list. */
  moveCabinet: (index: number, direction: 'up' | 'down') => void;
  setActiveCabinet: (index: number) => void;
  renameCabinet: (index: number, name: string) => void;
  setNotes: (index: number, notes: string) => void;
  setSawKerf: (mm: number) => void;
  setMaterialPriceOverride: (materialKey: string, price: number | null) => void;
  setEdgeBandingRate: (rate: number) => void;
  setHardwarePriceOverride: (id: string, price: number | null) => void;
  setHardwareQtyOverride: (id: string, qty: number | null) => void; // v3.15.0
  setSheetSizeOverride: (materialKey: string, size: { width: number; length: number } | null) => void; // Sprint 165
  setLabourRate: (rate: number) => void; // v3.23.0
  setLabourHours: (hours: number) => void; // v3.23.0
  setFinishCost: (cost: number) => void; // v3.23.0
  setProjectName: (name: string) => void;
  setProjectNotes: (notes: string) => void;
  /** Sprint 16 — toggle the rotation-lock flag for a specific part ID. */
  toggleRotationLock: (partId: string) => void;
  loadProject: (cabinets: CabinetEntry[]) => void;
  /** v3.18.0 — Replace every occurrence of fromKey with toKey across all cabinets (undoable). */
  bulkReplaceMaterial: (fromKey: string, toKey: string) => void;

  // Sprint 10 — Snapshot history
  snapshots: ProjectSnapshot[];
  saveSnapshot: (name: string) => void;
  restoreSnapshot: (id: string) => void;
  deleteSnapshot: (id: string) => void;
}

function derive(
  config: CabinetConfig,
  sawKerfMm = 4,
  sheetSizeOverrides: Record<string, { width: number; length: number }> = {},
) {
  const dimensions = computeDimensions(config);
  const parts = generateParts(config);
  const hardware = generateHardware(config);
  // Sprint 16 — decorate with rotation locks before optimization.
  const optimization = optimizeCutSheets(applyLocks(parts), sawKerfMm, sheetSizeOverrides);
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
  const combinedOptimization = optimizeCutSheets(applyLocks(allParts), sawKerfMm, sheetSizeOverrides);
  return { config: activeConfig, ...active, allParts, combinedOptimization };
}

// v3.21.0 — Base derivation (parts, hardware, dimensions) WITHOUT cut optimization.
// Used for synchronous state updates so the UI renders new parts instantly while
// the worker computes fresh optimization in the background.
// v3.51.0 — Optimized: reuses the active cabinet's already-computed parts in the
// allParts flatMap instead of calling generateParts twice for the same config.
function deriveBaseProject(cabinets: CabinetEntry[], activeIndex: number) {
  const activeConfig = cabinets[activeIndex].config;
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

export const useCabinetStore = create<CabinetState>((set) => {
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
  const prefs = loadPrefs();

  return {
    snapshots: loadSnapshots(),
    cabinets: initialCabinets,
    activeCabinetIndex: initialActiveIndex,
    ...initial,
    _past: [],
    _future: [],
    canUndo: false,
    canRedo: false,
    activeTab: 'configurator',
    projectName: session?.projectName || readProjectNameFromUrl(),
    projectNotes: session?.projectNotes ?? '',
    // Sprint 124 — fall back to OS preference when no saved pref exists
    darkMode: prefs.darkMode ?? detectOsDarkMode(),
    colorBlindMode: prefs.colorBlindMode ?? false,
    highContrastMode: prefs.highContrastMode ?? false,
    units: prefs.units ?? ('metric' as UnitSystem),
    sawKerf: session?.sawKerf ?? 4, // mm — Sprint 136
    materialPriceOverrides: session?.materialPriceOverrides ?? {}, // Sprint 139
    edgeBandingRate: session?.edgeBandingRate ?? 3, // ₪/m — Sprint 141
    hardwarePriceOverrides: session?.hardwarePriceOverrides ?? {}, // Sprint 148
    hardwareQtyOverrides: session?.hardwareQtyOverrides ?? {}, // v3.15.0
    sheetSizeOverrides: session?.sheetSizeOverrides ?? {}, // Sprint 165
    labourRate: session?.labourRate ?? 75, // ₪/hr — v3.23.0
    labourHours: session?.labourHours ?? 0, // hours — v3.23.0 (0 = not set, user inputs manually)
    finishCost: session?.finishCost ?? 0, // ₪ — v3.23.0
    rotationLockedPartIds: session?.rotationLockedPartIds ?? {}, // Sprint 16
    optimizationPending: false, // v3.21.0
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

    setConfig: (patch) =>
      set((state) => {
        const cabinets = state.cabinets.map((cab, i) =>
          i === state.activeCabinetIndex ? { ...cab, config: { ...cab.config, ...patch } } : cab,
        );
        pushConfigToUrl(cabinets[state.activeCabinetIndex].config);
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
        const baseName = src.name.replace(/\s*\(copy\s*\d*\)\s*$/, '');
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

    setActiveTab: (tab) => set({ activeTab: tab }),
    setProjectName: (name) => {
      set({ projectName: name });
      pushProjectNameToUrl(name); // Sprint 157
    },
    setProjectNotes: (notes) => set({ projectNotes: notes }),
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
        const base = deriveBaseProject(state.cabinets, state.activeCabinetIndex);
        scheduleOptimization(base.parts, base.allParts, state.sawKerf, state.sheetSizeOverrides);
        return { rotationLockedPartIds: next, ...base, optimizationPending: true };
      }),
    setSawKerf: (mm) =>
      set((state) => {
        const sawKerf = Math.max(0, Math.min(8, mm));
        const base = deriveBaseProject(state.cabinets, state.activeCabinetIndex);
        scheduleOptimization(base.parts, base.allParts, sawKerf, state.sheetSizeOverrides);
        scheduleAssembly(base.config);
        return { sawKerf, ...base, optimizationPending: true };
      }),
    setMaterialPriceOverride: (materialKey, price) =>
      set((state) => {
        const overrides = { ...state.materialPriceOverrides };
        if (price === null) {
          delete overrides[materialKey];
        } else {
          overrides[materialKey] = price;
        }
        scheduleCostFromState(state, undefined, undefined, undefined, { materialPriceOverrides: overrides });
        return { materialPriceOverrides: overrides, costPending: true };
      }),
    setEdgeBandingRate: (rate) =>
      set((state) => {
        const r = Math.max(0, rate);
        scheduleCostFromState(state, undefined, undefined, undefined, { edgeBandingRate: r });
        return { edgeBandingRate: r, costPending: true };
      }),
    setLabourRate: (rate) =>
      set((state) => {
        const r = Math.max(0, rate);
        scheduleCostFromState(state, undefined, undefined, undefined, { labourRate: r });
        return { labourRate: r, costPending: true };
      }),
    setLabourHours: (hours) =>
      set((state) => {
        const h = Math.max(0, hours);
        scheduleCostFromState(state, undefined, undefined, undefined, { labourHours: h });
        return { labourHours: h, costPending: true };
      }),
    setFinishCost: (cost) =>
      set((state) => {
        const c = Math.max(0, cost);
        scheduleCostFromState(state, undefined, undefined, undefined, { finishCost: c });
        return { finishCost: c, costPending: true };
      }),
    setHardwarePriceOverride: (id, price) =>
      set((state) => {
        const overrides = { ...state.hardwarePriceOverrides };
        if (price === null) {
          delete overrides[id];
        } else {
          overrides[id] = Math.max(0, price);
        }
        scheduleCostFromState(state, undefined, undefined, undefined, { hardwarePriceOverrides: overrides });
        return { hardwarePriceOverrides: overrides, costPending: true };
      }),
    setHardwareQtyOverride: (id, qty) =>
      set((state) => {
        const overrides = { ...state.hardwareQtyOverrides };
        if (qty === null) {
          delete overrides[id];
        } else {
          overrides[id] = Math.max(0, qty);
        }
        scheduleCostFromState(state, undefined, undefined, undefined, { hardwareQtyOverrides: overrides });
        return { hardwareQtyOverrides: overrides, costPending: true };
      }),
    // Sprint 165 — per-material sheet size overrides
    setSheetSizeOverride: (materialKey, size) =>
      set((state) => {
        const sheetSizeOverrides = { ...state.sheetSizeOverrides };
        if (size === null) {
          delete sheetSizeOverrides[materialKey];
        } else {
          sheetSizeOverrides[materialKey] = size;
        }
        const base = deriveBaseProject(state.cabinets, state.activeCabinetIndex);
        scheduleOptimization(base.parts, base.allParts, state.sawKerf, sheetSizeOverrides);
        scheduleAssembly(base.config);
        return { sheetSizeOverrides, ...base, optimizationPending: true };
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

    saveSnapshot: (name) =>
      set((state) => {
        const now = new Date();
        const autoName = `Snapshot ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const snap: ProjectSnapshot = {
          id: `snap-${Date.now()}`,
          name: name.trim() || autoName,
          cabinets: state.cabinets,
          timestamp: now.toISOString(),
        };
        const snapshots = [...state.snapshots, snap];
        saveSnapshots(snapshots);
        return { snapshots };
      }),

    restoreSnapshot: (id) =>
      set((state) => {
        const snap = state.snapshots.find((s) => s.id === id);
        if (!snap) return state;
        const cabinets = snap.cabinets;
        const activeCabinetIndex = Math.min(state.activeCabinetIndex, cabinets.length - 1);
        const past = [...state._past, state.cabinets].slice(-MAX_HISTORY);
        const base = deriveBaseProject(cabinets, activeCabinetIndex);
        scheduleOptimization(base.parts, base.allParts, state.sawKerf, state.sheetSizeOverrides);
        scheduleAssembly(base.config);
        return {
          cabinets,
          activeCabinetIndex,
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

    deleteSnapshot: (id) =>
      set((state) => {
        const snapshots = state.snapshots.filter((s) => s.id !== id);
        saveSnapshots(snapshots);
        return { snapshots };
      }),

    toggleDarkMode: () =>
      set((s) => {
        const darkMode = !s.darkMode;
        savePrefs({ darkMode, colorBlindMode: s.colorBlindMode, highContrastMode: s.highContrastMode, units: s.units });
        return { darkMode };
      }),
    toggleColorBlindMode: () =>
      set((s) => {
        const colorBlindMode = !s.colorBlindMode;
        savePrefs({ darkMode: s.darkMode, colorBlindMode, highContrastMode: s.highContrastMode, units: s.units });
        return { colorBlindMode };
      }),
    toggleHighContrast: () =>
      set((s) => {
        const highContrastMode = !s.highContrastMode;
        savePrefs({ darkMode: s.darkMode, colorBlindMode: s.colorBlindMode, highContrastMode, units: s.units });
        return { highContrastMode };
      }),
    toggleUnits: () =>
      set((s) => {
        const units: UnitSystem = s.units === 'metric' ? 'imperial' : 'metric';
        savePrefs({
          darkMode: s.darkMode,
          colorBlindMode: s.colorBlindMode,
          highContrastMode: s.highContrastMode,
          units,
        });
        return { units };
      }),
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
