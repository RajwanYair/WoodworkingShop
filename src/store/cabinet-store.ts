import { create } from 'zustand';
import type { CabinetConfig, Part, HardwareItem, OptimizationResult, DerivedDimensions } from '../engine/types';
import type { UnitSystem } from '../utils/units';
import { DEFAULT_CONFIG } from '../engine/materials';
import { computeDimensions } from '../engine/dimensions';
import { generateParts, computeEdgeBandingTotal } from '../engine/parts';
import { generateHardware } from '../engine/hardware';
import { optimizeCutSheets } from '../engine/cut-optimizer';
import { readConfigFromUrl, pushConfigToUrl } from '../utils/url-state';

const MAX_HISTORY = 50;

// Persisted user preferences (Sprint 112). Survives reload via localStorage.
const PREFS_KEY = 'woodworkingshop:prefs';
interface PersistedPrefs {
  darkMode?: boolean;
  colorBlindMode?: boolean;
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

  // Undo / Redo
  _past: CabinetEntry[][];
  _future: CabinetEntry[][];
  canUndo: boolean;
  canRedo: boolean;

  // UI state
  activeTab: 'configurator' | 'preview' | 'optimizer' | 'assembly' | 'pdf';
  darkMode: boolean;
  colorBlindMode: boolean;
  units: UnitSystem;

  // Actions
  setConfig: (patch: Partial<CabinetConfig>) => void;
  resetConfig: () => void;
  setActiveTab: (tab: CabinetState['activeTab']) => void;
  toggleDarkMode: () => void;
  toggleColorBlindMode: () => void;
  toggleUnits: () => void;
  undo: () => void;
  redo: () => void;
  addCabinet: () => void;
  removeCabinet: (index: number) => void;
  duplicateCabinet: (index: number) => void;
  setActiveCabinet: (index: number) => void;
  renameCabinet: (index: number, name: string) => void;
  setNotes: (index: number, notes: string) => void;
  loadProject: (cabinets: CabinetEntry[]) => void;
}

function derive(config: CabinetConfig) {
  const dimensions = computeDimensions(config);
  const parts = generateParts(config);
  const hardware = generateHardware(config);
  const optimization = optimizeCutSheets(parts);
  const edgeBandingTotal = computeEdgeBandingTotal(parts);
  return { dimensions, parts, hardware, optimization, edgeBandingTotal };
}

function deriveProject(cabinets: CabinetEntry[], activeIndex: number) {
  const activeConfig = cabinets[activeIndex].config;
  const active = derive(activeConfig);
  // Combined parts from all cabinets (prefixed with cabinet index)
  const allParts: Part[] = cabinets.flatMap((cab, ci) =>
    generateParts(cab.config).map((p) => ({
      ...p,
      id: cabinets.length > 1 ? `C${ci + 1}-${p.id}` : p.id,
    })),
  );
  const combinedOptimization = optimizeCutSheets(allParts);
  return { config: activeConfig, ...active, allParts, combinedOptimization };
}

export const useCabinetStore = create<CabinetState>((set) => {
  const urlPatch = readConfigFromUrl();
  const initialConfig = { ...DEFAULT_CONFIG, ...urlPatch };
  const initialCabinets: CabinetEntry[] = [{ name: 'Cabinet 1', config: initialConfig }];
  const initial = deriveProject(initialCabinets, 0);
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
    // Sprint 124 — fall back to OS preference when no saved pref exists
    darkMode: prefs.darkMode ?? detectOsDarkMode(),
    colorBlindMode: prefs.colorBlindMode ?? false,
    units: prefs.units ?? ('metric' as UnitSystem),

    setConfig: (patch) =>
      set((state) => {
        const cabinets = state.cabinets.map((cab, i) =>
          i === state.activeCabinetIndex ? { ...cab, config: { ...cab.config, ...patch } } : cab,
        );
        pushConfigToUrl(cabinets[state.activeCabinetIndex].config);
        const past = [...state._past, state.cabinets].slice(-MAX_HISTORY);
        return {
          cabinets,
          ...deriveProject(cabinets, state.activeCabinetIndex),
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
        return {
          cabinets,
          ...deriveProject(cabinets, state.activeCabinetIndex),
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
        return {
          cabinets: prevCabinets,
          activeCabinetIndex: idx,
          ...deriveProject(prevCabinets, idx),
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
        return {
          cabinets: nextCabinets,
          activeCabinetIndex: idx,
          ...deriveProject(nextCabinets, idx),
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
        return {
          cabinets,
          activeCabinetIndex: idx,
          ...deriveProject(cabinets, idx),
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
        return {
          cabinets,
          activeCabinetIndex: idx,
          ...deriveProject(cabinets, idx),
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
        return {
          cabinets,
          activeCabinetIndex: newIndex,
          ...deriveProject(cabinets, newIndex),
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
        return {
          activeCabinetIndex: index,
          ...deriveProject(state.cabinets, index),
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
        return {
          cabinets: migrated,
          activeCabinetIndex: 0,
          ...deriveProject(migrated, 0),
          _past: past,
          _future: [],
          canUndo: true,
          canRedo: false,
        };
      }),

    setActiveTab: (tab) => set({ activeTab: tab }),
    toggleDarkMode: () =>
      set((s) => {
        const darkMode = !s.darkMode;
        savePrefs({ darkMode, colorBlindMode: s.colorBlindMode, units: s.units });
        return { darkMode };
      }),
    toggleColorBlindMode: () =>
      set((s) => {
        const colorBlindMode = !s.colorBlindMode;
        savePrefs({ darkMode: s.darkMode, colorBlindMode, units: s.units });
        return { colorBlindMode };
      }),
    toggleUnits: () =>
      set((s) => {
        const units: UnitSystem = s.units === 'metric' ? 'imperial' : 'metric';
        savePrefs({ darkMode: s.darkMode, colorBlindMode: s.colorBlindMode, units });
        return { units };
      }),
  };
});
