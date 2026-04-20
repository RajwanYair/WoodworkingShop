import { create } from 'zustand';
import type { CabinetConfig, Part, HardwareItem, OptimizationResult, DerivedDimensions } from '../engine/types';
import { DEFAULT_CONFIG } from '../engine/materials';
import { computeDimensions } from '../engine/dimensions';
import { generateParts, computeEdgeBandingTotal } from '../engine/parts';
import { generateHardware } from '../engine/hardware';
import { optimizeCutSheets } from '../engine/cut-optimizer';
import { readConfigFromUrl, pushConfigToUrl } from '../utils/url-state';

const MAX_HISTORY = 50;

export interface CabinetState {
  // Config
  config: CabinetConfig;

  // Derived (recomputed on every config change)
  dimensions: DerivedDimensions;
  parts: Part[];
  hardware: HardwareItem[];
  optimization: OptimizationResult;
  edgeBandingTotal: number; // mm

  // Undo / Redo
  _past: CabinetConfig[];
  _future: CabinetConfig[];
  canUndo: boolean;
  canRedo: boolean;

  // UI state
  activeTab: 'configurator' | 'preview' | 'optimizer' | 'pdf';
  darkMode: boolean;
  colorBlindMode: boolean;

  // Actions
  setConfig: (patch: Partial<CabinetConfig>) => void;
  resetConfig: () => void;
  setActiveTab: (tab: CabinetState['activeTab']) => void;
  toggleDarkMode: () => void;
  toggleColorBlindMode: () => void;
  undo: () => void;
  redo: () => void;
}

function derive(config: CabinetConfig) {
  const dimensions = computeDimensions(config);
  const parts = generateParts(config);
  const hardware = generateHardware(config);
  const optimization = optimizeCutSheets(parts);
  const edgeBandingTotal = computeEdgeBandingTotal(parts);
  return { dimensions, parts, hardware, optimization, edgeBandingTotal };
}

export const useCabinetStore = create<CabinetState>((set) => {
  const urlPatch = readConfigFromUrl();
  const initialConfig = { ...DEFAULT_CONFIG, ...urlPatch };
  const initial = derive(initialConfig);

  return {
    config: initialConfig,
    ...initial,
    _past: [],
    _future: [],
    canUndo: false,
    canRedo: false,
    activeTab: 'configurator',
    darkMode: false,
    colorBlindMode: false,

    setConfig: (patch) =>
      set((state) => {
        const config = { ...state.config, ...patch };
        pushConfigToUrl(config);
        const past = [...state._past, state.config].slice(-MAX_HISTORY);
        return { config, ...derive(config), _past: past, _future: [], canUndo: true, canRedo: false };
      }),

    resetConfig: () =>
      set((state) => {
        pushConfigToUrl(DEFAULT_CONFIG);
        const past = [...state._past, state.config].slice(-MAX_HISTORY);
        return {
          config: DEFAULT_CONFIG,
          ...derive(DEFAULT_CONFIG),
          _past: past,
          _future: [],
          canUndo: true,
          canRedo: false,
        };
      }),

    undo: () =>
      set((state) => {
        if (state._past.length === 0) return state;
        const prev = state._past[state._past.length - 1];
        const past = state._past.slice(0, -1);
        pushConfigToUrl(prev);
        return {
          config: prev,
          ...derive(prev),
          _past: past,
          _future: [state.config, ...state._future],
          canUndo: past.length > 0,
          canRedo: true,
        };
      }),

    redo: () =>
      set((state) => {
        if (state._future.length === 0) return state;
        const next = state._future[0];
        const future = state._future.slice(1);
        pushConfigToUrl(next);
        return {
          config: next,
          ...derive(next),
          _past: [...state._past, state.config],
          _future: future,
          canUndo: true,
          canRedo: future.length > 0,
        };
      }),

    setActiveTab: (tab) => set({ activeTab: tab }),
    toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
    toggleColorBlindMode: () => set((s) => ({ colorBlindMode: !s.colorBlindMode })),
  };
});
