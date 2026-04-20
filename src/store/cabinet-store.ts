import { create } from 'zustand';
import type { CabinetConfig, Part, HardwareItem, OptimizationResult, DerivedDimensions } from '../engine/types';
import { DEFAULT_CONFIG } from '../engine/materials';
import { computeDimensions } from '../engine/dimensions';
import { generateParts, computeEdgeBandingTotal } from '../engine/parts';
import { generateHardware } from '../engine/hardware';
import { optimizeCutSheets } from '../engine/cut-optimizer';
import { readConfigFromUrl, pushConfigToUrl } from '../utils/url-state';

export interface CabinetState {
  // Config
  config: CabinetConfig;

  // Derived (recomputed on every config change)
  dimensions: DerivedDimensions;
  parts: Part[];
  hardware: HardwareItem[];
  optimization: OptimizationResult;
  edgeBandingTotal: number; // mm

  // UI state
  activeTab: 'configurator' | 'preview' | 'optimizer' | 'pdf';
  darkMode: boolean;

  // Actions
  setConfig: (patch: Partial<CabinetConfig>) => void;
  resetConfig: () => void;
  setActiveTab: (tab: CabinetState['activeTab']) => void;
  toggleDarkMode: () => void;
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
    activeTab: 'configurator',
    darkMode: false,

    setConfig: (patch) =>
      set((state) => {
        const config = { ...state.config, ...patch };
        pushConfigToUrl(config);
        return { config, ...derive(config) };
      }),

    resetConfig: () =>
      set(() => {
        pushConfigToUrl(DEFAULT_CONFIG);
        return {
          config: DEFAULT_CONFIG,
          ...derive(DEFAULT_CONFIG),
        };
      }),

    setActiveTab: (tab) => set({ activeTab: tab }),
    toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
  };
});
