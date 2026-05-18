import { create } from 'zustand';
import type { CabinetConfig, Part, HardwareItem, OptimizationResult, DerivedDimensions } from '../engine/types';
import type { UnitSystem } from '../utils/units';
import { DEFAULT_CONFIG } from '../engine/materials';
import { computeDimensions } from '../engine/dimensions';
import { generateParts, computeEdgeBandingTotal } from '../engine/parts';
import { generateHardware } from '../engine/hardware';
import { optimizeCutSheets } from '../engine/cut-optimizer';
import { createJsonMemo } from '../engine/memo';
import { readConfigFromUrl, pushConfigToUrl, readProjectNameFromUrl, pushProjectNameToUrl } from '../utils/url-state';
import CutOptimizerWorker from '../workers/cut-optimizer.worker?worker';
import type { CutOptimizerWorkerInput, CutOptimizerWorkerOutput } from '../workers/cut-optimizer.worker';

// v3.21.0 — Module-level Web Worker singleton for cut optimization.
// Kept outside Zustand state to avoid serialization. The worker result
// callback closes over `_workerApplyFn` which is set during store creation.
let _cutOptWorker: Worker | null = null;
let _workerApplyFn: ((partial: Partial<CabinetState>) => void) | null = null;
let _currentReqId = 0;

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
        });
      } else {
        _workerApplyFn({ optimizationPending: false });
      }
    };
  }
  return _cutOptWorker;
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
  const worker = getCutOptWorker();
  if (!worker) {
    // Synchronous fallback (tests / browsers without Worker support)
    if (_workerApplyFn) {
      _workerApplyFn({
        optimization: optimizeCutSheets(activeParts, sawKerfMm, sheetSizeOverrides),
        combinedOptimization: optimizeCutSheets(allParts, sawKerfMm, sheetSizeOverrides),
        optimizationPending: false,
      });
    }
    return;
  }
  _currentReqId++;
  const payload: CutOptimizerWorkerInput = {
    activeParts,
    allParts,
    sawKerfMm,
    sheetSizeOverrides,
    requestId: String(_currentReqId),
  };
  worker.postMessage(payload);
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

export interface CabinetEntry {
  name: string;
  config: CabinetConfig;
  notes?: string;
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

  // Combined project-level optimization (all cabinets)
  allParts: Part[];
  combinedOptimization: OptimizationResult;
  /** v3.21.0 — true while the cut-optimizer Web Worker is computing a fresh result */
  optimizationPending: boolean;

  // Undo / Redo
  _past: CabinetEntry[][];
  _future: CabinetEntry[][];
  canUndo: boolean;
  canRedo: boolean;

  // UI state
  activeTab: 'configurator' | 'preview' | 'optimizer' | 'assembly' | 'pdf';
  projectName: string; // Sprint 152
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
  setActiveCabinet: (index: number) => void;
  renameCabinet: (index: number, name: string) => void;
  setNotes: (index: number, notes: string) => void;
  setSawKerf: (mm: number) => void;
  setMaterialPriceOverride: (materialKey: string, price: number | null) => void;
  setEdgeBandingRate: (rate: number) => void;
  setHardwarePriceOverride: (id: string, price: number | null) => void;
  setHardwareQtyOverride: (id: string, qty: number | null) => void; // v3.15.0
  setSheetSizeOverride: (materialKey: string, size: { width: number; length: number } | null) => void; // Sprint 165
  setProjectName: (name: string) => void;
  loadProject: (cabinets: CabinetEntry[]) => void;
  /** v3.18.0 — Replace every occurrence of fromKey with toKey across all cabinets (undoable). */
  bulkReplaceMaterial: (fromKey: string, toKey: string) => void;
}

function derive(
  config: CabinetConfig,
  sawKerfMm = 4,
  sheetSizeOverrides: Record<string, { width: number; length: number }> = {},
) {
  const dimensions = computeDimensions(config);
  const parts = generateParts(config);
  const hardware = generateHardware(config);
  const optimization = optimizeCutSheets(parts, sawKerfMm, sheetSizeOverrides);
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
  const combinedOptimization = optimizeCutSheets(allParts, sawKerfMm, sheetSizeOverrides);
  return { config: activeConfig, ...active, allParts, combinedOptimization };
}

// v3.21.0 — Base derivation (parts, hardware, dimensions) WITHOUT cut optimization.
// Used for synchronous state updates so the UI renders new parts instantly while
// the worker computes fresh optimization in the background.
function deriveBaseProject(
  cabinets: CabinetEntry[],
  activeIndex: number,
) {
  const activeConfig = cabinets[activeIndex].config;
  const dimensions = computeDimensions(activeConfig);
  const parts = generateParts(activeConfig);
  const hardware = generateHardware(activeConfig);
  const edgeBandingTotal = computeEdgeBandingTotal(parts);
  const allParts: Part[] = cabinets.flatMap((cab, ci) =>
    generateParts(cab.config).map((p) => ({
      ...p,
      id: cabinets.length > 1 ? `C${ci + 1}-${p.id}` : p.id,
    })),
  );
  return { config: activeConfig, dimensions, parts, hardware, edgeBandingTotal, allParts };
}

// v3.11.0 — Memoised wrappers: rapid undo/redo and repeated setConfig calls
// with identical arguments skip the MaxRects computation entirely.
const deriveProjectMemo = createJsonMemo(deriveProject);

export const useCabinetStore = create<CabinetState>((set) => {
  // v3.21.0 — Capture `set` so the worker response callback can update state.
  _workerApplyFn = set as (partial: Partial<CabinetState>) => void;

  const urlPatch = readConfigFromUrl();
  const initialConfig = { ...DEFAULT_CONFIG, ...urlPatch };
  const initialCabinets: CabinetEntry[] = [{ name: 'Cabinet 1', config: initialConfig }];
  const initial = deriveProjectMemo(initialCabinets, 0);
  const prefs = loadPrefs();

  return {
    cabinets: initialCabinets,
    activeCabinetIndex: 0,
    ...initial,
    _past: [],
    _future: [],
    canUndo: false,
    canRedo: false,
    activeTab: 'configurator',
    projectName: readProjectNameFromUrl(), // Sprint 157: persist in URL
    // Sprint 124 — fall back to OS preference when no saved pref exists
    darkMode: prefs.darkMode ?? detectOsDarkMode(),
    colorBlindMode: prefs.colorBlindMode ?? false,
    highContrastMode: prefs.highContrastMode ?? false,
    units: prefs.units ?? ('metric' as UnitSystem),
    sawKerf: 4, // mm — Sprint 136
    materialPriceOverrides: {}, // Sprint 139
    edgeBandingRate: 3, // ₪/m — Sprint 141
    hardwarePriceOverrides: {}, // Sprint 148
    hardwareQtyOverrides: {}, // v3.15.0
    sheetSizeOverrides: {}, // Sprint 165
    optimizationPending: false, // v3.21.0

    setConfig: (patch) =>
      set((state) => {
        const cabinets = state.cabinets.map((cab, i) =>
          i === state.activeCabinetIndex ? { ...cab, config: { ...cab.config, ...patch } } : cab,
        );
        pushConfigToUrl(cabinets[state.activeCabinetIndex].config);
        const past = [...state._past, state.cabinets].slice(-MAX_HISTORY);
        const base = deriveBaseProject(cabinets, state.activeCabinetIndex);
        scheduleOptimization(base.parts, base.allParts, state.sawKerf, state.sheetSizeOverrides);
        return {
          cabinets,
          ...base,
          optimizationPending: true,
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
        return {
          cabinets,
          ...base,
          optimizationPending: true,
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
        return {
          cabinets: prevCabinets,
          activeCabinetIndex: idx,
          ...base,
          optimizationPending: true,
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
        return {
          cabinets: nextCabinets,
          activeCabinetIndex: idx,
          ...base,
          optimizationPending: true,
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
        return {
          cabinets,
          activeCabinetIndex: idx,
          ...base,
          optimizationPending: true,
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
        return {
          cabinets,
          activeCabinetIndex: idx,
          ...base,
          optimizationPending: true,
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
        return {
          cabinets,
          activeCabinetIndex: newIndex,
          ...base,
          optimizationPending: true,
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
        return {
          activeCabinetIndex: index,
          ...base,
          optimizationPending: true,
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
        return {
          cabinets: migrated,
          activeCabinetIndex: 0,
          ...base,
          optimizationPending: true,
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
    setSawKerf: (mm) =>
      set((state) => {
        const sawKerf = Math.max(0, Math.min(8, mm));
        const base = deriveBaseProject(state.cabinets, state.activeCabinetIndex);
        scheduleOptimization(base.parts, base.allParts, sawKerf, state.sheetSizeOverrides);
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
        return { materialPriceOverrides: overrides };
      }),
    setEdgeBandingRate: (rate) => set({ edgeBandingRate: Math.max(0, rate) }),
    setHardwarePriceOverride: (id, price) =>
      set((state) => {
        const overrides = { ...state.hardwarePriceOverrides };
        if (price === null) {
          delete overrides[id];
        } else {
          overrides[id] = Math.max(0, price);
        }
        return { hardwarePriceOverrides: overrides };
      }),
    setHardwareQtyOverride: (id, qty) =>
      set((state) => {
        const overrides = { ...state.hardwareQtyOverrides };
        if (qty === null) {
          delete overrides[id];
        } else {
          overrides[id] = Math.max(0, qty);
        }
        return { hardwareQtyOverrides: overrides };
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
        return {
          cabinets,
          ...base,
          optimizationPending: true,
          _past: past,
          _future: [],
          canUndo: true,
          canRedo: false,
        };
      }),

    toggleDarkMode: () =>
      set((s) => {        const darkMode = !s.darkMode;
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
        savePrefs({ darkMode: s.darkMode, colorBlindMode: s.colorBlindMode, highContrastMode: s.highContrastMode, units });
        return { units };
      }),
  };
});
