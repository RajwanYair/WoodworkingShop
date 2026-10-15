import type { CabinetConfig, DerivedDimensions, HardwareItem, Material, Part } from '../../engine/core/types';
import { DEFAULT_CONFIG } from '../../engine/materials/materials';
import { mirrorConfig, mirrorName } from '../../engine/geometry/mirror-cabinet';
import { pluginEventBus } from '../../engine/core/plugin';
import { pushConfigToUrl } from '../../utils/url-state';
import { scheduleAssembly, scheduleOptimization, setRotationLocks } from '../worker-schedule';
import type { CabinetState } from '../store-types';
import {
  appendCabinetPatch,
  applyCabinetPatch,
  createCabinetPatch,
  MAX_CABINET_HISTORY,
  type CabinetPatch,
} from './cabinetHistory';
import type { CabinetEntry } from './cabinetTypes';

export interface DerivedCabinetBase {
  config: CabinetConfig;
  dimensions: DerivedDimensions;
  parts: Part[];
  hardware: HardwareItem[];
  edgeBandingTotal: number;
  allParts: Part[];
}

interface HistoryFields {
  _past: CabinetPatch[];
  _future: CabinetPatch[];
  canUndo: boolean;
  canRedo: boolean;
}

type CabinetsSet = (
  partial: Partial<CabinetState> | ((state: CabinetState) => Partial<CabinetState> | CabinetState),
) => void;

export interface CabinetsSlice {
  beginHistoryGroup: () => void;
  endHistoryGroup: () => void;
  setConfig: (patch: Partial<CabinetConfig>) => void;
  resetConfig: () => void;
  undo: () => void;
  redo: () => void;
  addCabinet: () => void;
  removeCabinet: (index: number) => void;
  duplicateCabinet: (index: number) => void;
  mirrorCabinet: (index: number) => void;
  moveCabinet: (index: number, direction: 'up' | 'down') => void;
  setActiveCabinet: (index: number) => void;
  renameCabinet: (index: number, name: string) => void;
  setNotes: (index: number, notes: string) => void;
  loadProject: (cabinets: CabinetEntry[]) => void;
  toggleRotationLock: (partId: string) => void;
  bulkReplaceMaterial: (fromKey: string, toKey: string) => void;
}

function pendingUpdate(base: DerivedCabinetBase, history?: HistoryFields) {
  return {
    ...base,
    optimizationPending: true,
    costPending: true,
    assemblyPending: true,
    ...history,
  };
}

/**
 * Cabinet list, active selection, and structural undo/redo.
 * Slider gestures call begin/end so a drag collapses to one patch.
 */
export function createCabinetsSlice(
  set: CabinetsSet,
  get: () => CabinetState,
  deriveBaseProject: (cabinets: CabinetEntry[], activeIndex: number, extraMaterials?: Material[]) => DerivedCabinetBase,
): CabinetsSlice {
  let historyGroupStart: CabinetEntry[] | null = null;

  function historyUpdate(state: CabinetState, cabinets: CabinetEntry[]): HistoryFields {
    if (historyGroupStart !== null) {
      return { _past: state._past, _future: state._future, canUndo: state.canUndo, canRedo: state.canRedo };
    }
    return {
      _past: appendCabinetPatch(state._past, state.cabinets, cabinets),
      _future: [],
      canUndo: true,
      canRedo: false,
    };
  }

  function endHistoryGroup(): void {
    const previous = historyGroupStart;
    if (previous === null) return;
    historyGroupStart = null;
    const state = get();
    const patch = createCabinetPatch(previous, state.cabinets);
    if (patch.changes.length === 0 && patch.permute === undefined) return;
    set({
      _past: appendCabinetPatch(state._past, previous, state.cabinets),
      _future: [],
      canUndo: true,
      canRedo: false,
    });
  }

  function reschedule(cabinets: CabinetEntry[], activeIndex: number, state: CabinetState) {
    const base = deriveBaseProject(cabinets, activeIndex);
    scheduleOptimization(base.parts, base.allParts, state.sawKerf, state.sheetSizeOverrides);
    scheduleAssembly(base.config);
    return base;
  }

  return {
    beginHistoryGroup: () => {
      historyGroupStart ??= get().cabinets;
    },
    endHistoryGroup,
    setConfig: (patch) =>
      set((state) => {
        const cabinets = state.cabinets.map((cab, index) =>
          index === state.activeCabinetIndex ? { ...cab, config: { ...cab.config, ...patch } } : cab,
        );
        pushConfigToUrl(cabinets[state.activeCabinetIndex].config, state.activeCabinetIndex);
        pluginEventBus.emit('config:change', { config: cabinets[state.activeCabinetIndex].config });
        const history = historyUpdate(state, cabinets);
        const base = reschedule(cabinets, state.activeCabinetIndex, state);
        return { cabinets, ...pendingUpdate(base, history) };
      }),
    resetConfig: () =>
      set((state) => {
        const cabinets = state.cabinets.map((cab, index) =>
          index === state.activeCabinetIndex ? { ...cab, config: DEFAULT_CONFIG } : cab,
        );
        pushConfigToUrl(DEFAULT_CONFIG, state.activeCabinetIndex);
        const history = historyUpdate(state, cabinets);
        const base = reschedule(cabinets, state.activeCabinetIndex, state);
        return { cabinets, ...pendingUpdate(base, history) };
      }),
    undo: () => {
      endHistoryGroup();
      set((state) => {
        const patch = state._past.at(-1);
        if (!patch) return state;
        const prevCabinets = applyCabinetPatch(state.cabinets, patch, 'backward');
        const past = state._past.slice(0, -1);
        const index = Math.min(state.activeCabinetIndex, prevCabinets.length - 1);
        pushConfigToUrl(prevCabinets[index].config, index);
        const base = reschedule(prevCabinets, index, state);
        return {
          cabinets: prevCabinets,
          activeCabinetIndex: index,
          ...pendingUpdate(base),
          _past: past,
          _future: [patch, ...state._future],
          canUndo: past.length > 0,
          canRedo: true,
        };
      });
    },
    redo: () => {
      endHistoryGroup();
      set((state) => {
        const patch = state._future[0];
        if (!patch) return state;
        const nextCabinets = applyCabinetPatch(state.cabinets, patch, 'forward');
        const future = state._future.slice(1);
        const index = Math.min(state.activeCabinetIndex, nextCabinets.length - 1);
        pushConfigToUrl(nextCabinets[index].config, index);
        const base = reschedule(nextCabinets, index, state);
        return {
          cabinets: nextCabinets,
          activeCabinetIndex: index,
          ...pendingUpdate(base),
          _past: [...state._past, patch].slice(-MAX_CABINET_HISTORY),
          _future: future,
          canUndo: true,
          canRedo: future.length > 0,
        };
      });
    },
    addCabinet: () =>
      set((state) => {
        const newCab: CabinetEntry = { name: `Cabinet ${state.cabinets.length + 1}`, config: { ...DEFAULT_CONFIG } };
        const cabinets = [...state.cabinets, newCab];
        const index = cabinets.length - 1;
        pushConfigToUrl(cabinets[index].config, index);
        const base = reschedule(cabinets, index, state);
        return {
          cabinets,
          activeCabinetIndex: index,
          ...pendingUpdate(base, {
            _past: appendCabinetPatch(state._past, state.cabinets, cabinets),
            _future: [],
            canUndo: true,
            canRedo: false,
          }),
        };
      }),
    removeCabinet: (index) =>
      set((state) => {
        if (state.cabinets.length <= 1 || !Number.isInteger(index) || index < 0 || index >= state.cabinets.length) {
          return state;
        }
        const cabinets = state.cabinets.filter((_, cabinetIndex) => cabinetIndex !== index);
        const nextIndex = Math.min(state.activeCabinetIndex, cabinets.length - 1);
        pushConfigToUrl(cabinets[nextIndex].config, nextIndex);
        const base = reschedule(cabinets, nextIndex, state);
        return {
          cabinets,
          activeCabinetIndex: nextIndex,
          ...pendingUpdate(base, {
            _past: appendCabinetPatch(state._past, state.cabinets, cabinets),
            _future: [],
            canUndo: true,
            canRedo: false,
          }),
        };
      }),
    duplicateCabinet: (index) =>
      set((state) => {
        if (!Number.isInteger(index) || index < 0 || index >= state.cabinets.length) return state;
        const src = state.cabinets[index];
        const baseName = src.name.replace(/ \(copy(?: \d+)?\)$/, '');
        const copies = state.cabinets.filter((cabinet) => cabinet.name.startsWith(`${baseName} (copy`)).length;
        const newName = copies === 0 ? `${baseName} (copy)` : `${baseName} (copy ${copies + 1})`;
        const newEntry: CabinetEntry = { name: newName, config: { ...src.config } };
        const cabinets = [...state.cabinets.slice(0, index + 1), newEntry, ...state.cabinets.slice(index + 1)];
        const newIndex = index + 1;
        pushConfigToUrl(cabinets[newIndex].config, newIndex);
        const base = reschedule(cabinets, newIndex, state);
        return {
          cabinets,
          activeCabinetIndex: newIndex,
          ...pendingUpdate(base, {
            _past: appendCabinetPatch(state._past, state.cabinets, cabinets),
            _future: [],
            canUndo: true,
            canRedo: false,
          }),
        };
      }),
    mirrorCabinet: (index) =>
      set((state) => {
        if (!Number.isInteger(index) || index < 0 || index >= state.cabinets.length) return state;
        const src = state.cabinets[index];
        const newEntry: CabinetEntry = { name: mirrorName(src.name), config: mirrorConfig(src.config) };
        const cabinets = [...state.cabinets.slice(0, index + 1), newEntry, ...state.cabinets.slice(index + 1)];
        const newIndex = index + 1;
        pushConfigToUrl(cabinets[newIndex].config, newIndex);
        const base = reschedule(cabinets, newIndex, state);
        return {
          cabinets,
          activeCabinetIndex: newIndex,
          ...pendingUpdate(base, {
            _past: appendCabinetPatch(state._past, state.cabinets, cabinets),
            _future: [],
            canUndo: true,
            canRedo: false,
          }),
        };
      }),
    moveCabinet: (index, direction) =>
      set((state) => {
        if (!Number.isInteger(index) || index < 0 || index >= state.cabinets.length) return state;
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= state.cabinets.length) return state;
        const cabinets = [...state.cabinets];
        [cabinets[index], cabinets[targetIndex]] = [cabinets[targetIndex], cabinets[index]];
        let newActive = state.activeCabinetIndex;
        if (state.activeCabinetIndex === index) newActive = targetIndex;
        else if (state.activeCabinetIndex === targetIndex) newActive = index;
        pushConfigToUrl(cabinets[newActive].config, newActive);
        const base = reschedule(cabinets, newActive, state);
        return {
          cabinets,
          activeCabinetIndex: newActive,
          ...pendingUpdate(base, {
            _past: appendCabinetPatch(state._past, state.cabinets, cabinets),
            _future: [],
            canUndo: true,
            canRedo: false,
          }),
        };
      }),
    setActiveCabinet: (index) =>
      set((state) => {
        if (!Number.isInteger(index) || index < 0 || index >= state.cabinets.length) return state;
        pushConfigToUrl(state.cabinets[index].config, index);
        const base = reschedule(state.cabinets, index, state);
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
        if (!Number.isInteger(index) || index < 0 || index >= state.cabinets.length) return state;
        const cabinets = state.cabinets.map((cab, cabinetIndex) => (cabinetIndex === index ? { ...cab, name } : cab));
        return { cabinets };
      }),
    setNotes: (index, notes) =>
      set((state) => {
        if (!Number.isInteger(index) || index < 0 || index >= state.cabinets.length) return state;
        const cabinets = state.cabinets.map((cab, cabinetIndex) => (cabinetIndex === index ? { ...cab, notes } : cab));
        return { cabinets };
      }),
    loadProject: (cabinets) =>
      set((state) => {
        if (cabinets.length === 0) return state;
        const migrated = cabinets.map((cabinet) => ({ ...cabinet, config: { ...DEFAULT_CONFIG, ...cabinet.config } }));
        pushConfigToUrl(migrated[0].config, 0);
        const base = reschedule(migrated, 0, state);
        return {
          cabinets: migrated,
          activeCabinetIndex: 0,
          ...pendingUpdate(base, {
            _past: appendCabinetPatch(state._past, state.cabinets, migrated),
            _future: [],
            canUndo: true,
            canRedo: false,
          }),
        };
      }),
    toggleRotationLock: (partId) =>
      set((state) => {
        const next = { ...state.rotationLockedPartIds };
        if (next[partId]) delete next[partId];
        else next[partId] = true;
        setRotationLocks(next);
        pluginEventBus.emit('part:rotation-lock', { partId, locked: next[partId] === true });
        const base = deriveBaseProject(state.cabinets, state.activeCabinetIndex);
        scheduleOptimization(base.parts, base.allParts, state.sawKerf, state.sheetSizeOverrides);
        return { rotationLockedPartIds: next, ...base, optimizationPending: true };
      }),
    bulkReplaceMaterial: (fromKey, toKey) =>
      set((state) => {
        if (fromKey === toKey) return state;
        const cabinets = state.cabinets.map((cab) => {
          const config = { ...cab.config };
          if (config.carcassMaterial === fromKey) config.carcassMaterial = toKey;
          if (config.backPanelMaterial === fromKey) config.backPanelMaterial = toKey;
          return { ...cab, config };
        });
        const base = reschedule(cabinets, state.activeCabinetIndex, state);
        return {
          cabinets,
          ...pendingUpdate(base, {
            _past: appendCabinetPatch(state._past, state.cabinets, cabinets),
            _future: [],
            canUndo: true,
            canRedo: false,
          }),
        };
      }),
  };
}
