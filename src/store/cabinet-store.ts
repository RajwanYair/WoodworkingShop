import { create } from 'zustand';
import type {
  CabinetConfig,
  Part,
  HardwareItem,
  OptimizationResult,
  DerivedDimensions,
  OffcutEntry,
  DefectZone,
} from '../engine/types';
import { DEFAULT_CONFIG } from '../engine/materials';
import { computeDimensions } from '../engine/dimensions';
import { generateParts, computeEdgeBandingTotal } from '../engine/parts';
import { generateHardware } from '../engine/hardware';
import { optimizeCutSheets } from '../engine/cut-optimizer';
import { estimateCost } from '../engine/cost-estimator';
import { generateAssemblySteps, type AssemblyStep } from '../engine/assembly';
import { createJsonMemo } from '../engine/memo';
import { readConfigFromUrl, pushConfigToUrl, readProjectNameFromUrl } from '../utils/url-state';
import { idbLoadSnapshots } from '../utils/indexed-db-storage';
import { pluginEventBus } from '../engine/plugin';
import { mirrorConfig, mirrorName } from '../engine/mirror-cabinet';
import {
  initWorkerSchedule,
  setRotationLocks,
  setCutModeWorker,
  setOffcutCatalog,
  getOffcutCatalog,
  setDefectZones,
  getDefectZones,
  setAutoCoNest,
  applyLocks,
  scheduleOptimization,
  scheduleAssembly,
  scheduleCostFromState,
} from './worker-schedule';
// Phase 11 — Slice imports
import { createUiSlice, loadUiPrefs, loadBuildLog, loadCutChecklist, type UiSlice } from './slices/uiSlice';
import {
  createSnapshotSlice,
  loadSnapshotsFromStorage,
  type SnapshotSlice,
  type ProjectSnapshot,
} from './slices/snapshotSlice';
import { createOptimizerSettingsSlice, type OptimizerSettingsSlice } from './slices/optimizerSettingsSlice';
import { createNamedExpressionsSlice, type NamedExpressionsSlice } from './slices/namedExpressionsSlice';

/**
 * Fire-and-forget: post a cut-optimization request to the worker via Comlink.
 * Falls back to synchronous computation when Workers are unavailable (e.g. tests).
 */

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
  mirrorCabinet: (index: number) => void;
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
  SnapshotSlice &
  NamedExpressionsSlice;

function derive(
  config: CabinetConfig,
  sawKerfMm = 4,
  sheetSizeOverrides: Record<string, { width: number; length: number }> = {},
) {
  const dimensions = computeDimensions(config);
  const parts = generateParts(config);
  const hardware = generateHardware(config);
  // Sprint 16 — decorate with rotation locks before optimization.
  const optimization = optimizeCutSheets(
    applyLocks(parts),
    sawKerfMm,
    sheetSizeOverrides,
    config.cutMode ?? 'freeform',
  );
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
  const combinedOptimization = optimizeCutSheets(
    applyLocks(allParts),
    sawKerfMm,
    sheetSizeOverrides,
    activeConfig.cutMode ?? 'freeform',
  );
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
  setCutModeWorker(activeConfig.cutMode ?? 'freeform');
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
  // v3.21.0 — Inject `set` and `get` so worker-schedule callbacks can update state.
  initWorkerSchedule(set as (partial: Partial<CabinetState>) => void, () => get());

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
  setRotationLocks(session?.rotationLockedPartIds ?? {});
  const initial = deriveProjectMemo(initialCabinets, initialActiveIndex);
  const prefs = loadUiPrefs();
  const initialProjectName = session?.projectName || readProjectNameFromUrl();
  const initialProjectNotes = session?.projectNotes ?? '';
  const initialSnapshots = loadSnapshotsFromStorage();

  // ── Slice callbacks (close over `set` and `get`) ──────────────────────────
  // Called by OptimizerSettingsSlice when kerf or sheet overrides change.
  function handleRescheduleOpt(sawKerf: number, sheetSizeOverrides: Record<string, { width: number; length: number }>) {
    const state = get();
    // Sprint 107 — sync the co-nesting flag before scheduling.
    setAutoCoNest(state.autoCoNest);
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
  const sliceSetImpl: SliceSetFn<CabinetState> = (partial) => {
    set(partial);
  };
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
    ...createUiSlice(uiSet, prefs, initialProjectName, initialProjectNotes, loadBuildLog(), loadCutChecklist()),

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

    // ── Named expressions slice ────────────────────────────────────────────
    ...createNamedExpressionsSlice(sliceSetImpl as SliceSetFn<NamedExpressionsSlice>),

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

    // Sprint 93 — create a mirrored twin of an existing cabinet
    mirrorCabinet: (index) =>
      set((state) => {
        if (index < 0 || index >= state.cabinets.length) return state;
        const src = state.cabinets[index];
        const newEntry: CabinetEntry = {
          name: mirrorName(src.name),
          config: mirrorConfig(src.config),
        };
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
        setRotationLocks(next);
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
      setOffcutCatalog(catalog);
      set({ offcutCatalog: catalog });
    },
    addOffcutEntry: (entry) => {
      setOffcutCatalog([...getOffcutCatalog(), entry]);
      set((s) => ({ offcutCatalog: [...s.offcutCatalog, entry] }));
    },
    removeOffcutEntry: (id) => {
      setOffcutCatalog(getOffcutCatalog().filter((e) => e.id !== id));
      set((s) => ({ offcutCatalog: s.offcutCatalog.filter((e) => e.id !== id) }));
    },
    addDefectZone: (materialKey, zone) => {
      const dz = getDefectZones();
      const updated = { ...dz, [materialKey]: [...(dz[materialKey] ?? []), zone] };
      setDefectZones(updated);
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
      const existing = getDefectZones()[materialKey] ?? [];
      const filtered = existing.filter((_, i) => i !== zoneIndex);
      const updated = { ...getDefectZones(), [materialKey]: filtered };
      setDefectZones(updated);
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
