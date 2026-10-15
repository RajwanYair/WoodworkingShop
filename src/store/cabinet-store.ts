import { create } from 'zustand';
import { browserLocalStorage, createLocalStorageAdapter } from '../platform/storage/index';
import type { CabinetConfig, Part, Material } from '../engine/core/types';
import { DEFAULT_CONFIG } from '../engine/materials/materials';
import { computeDimensions } from '../engine/geometry/dimensions';
import { generateParts, computeEdgeBandingTotal } from '../engine/geometry/parts';
import { generateHardware } from '../engine/hardware/hardware';
import { optimizeCutSheets } from '../engine/optimizer/cut-optimizer';
import { estimateCost } from '../engine/costing/cost-estimator';
import { generateAssemblySteps } from '../engine/assembly/assembly';
import { createJsonMemo } from '../engine/core/memo';
import { readActiveCabinetIndexFromUrl, readConfigFromUrl, readProjectNameFromUrl } from '../utils/url-state';
import { idbLoadSnapshots } from '../utils/indexed-db-storage';
import {
  initWorkerSchedule,
  setRotationLocks,
  setCutModeWorker,
  setOffcutCatalog,
  setDefectZones,
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
import type { CabinetEntry } from './slices/cabinetTypes';
import { appendCabinetPatch } from './slices/cabinetHistory';
import { createCabinetsSlice } from './slices/cabinetsSlice';
import { createProjectSlice, type ProjectSlice } from './slices/projectSlice';
import { createCatalogSlice, type CatalogSlice } from './slices/catalogSlice';
import {
  createCabinetSessionRecord,
  readCabinetSessionRecord,
  readLegacyCabinetSession,
  type CabinetSessionSnapshot,
} from './slices/sessionPersistence';
import type { CabinetState } from './store-types';
import { getCustomMaterials, useCustomMaterialsStore } from './custom-materials-store';

/**
 * Fire-and-forget: post a cut-optimization request to the worker via Comlink.
 * Falls back to synchronous computation when Workers are unavailable (e.g. tests).
 */

// Phase 11 — UI preferences now live in uiSlice.ts.  Re-export so tests and
// any external consumers that imported from cabinet-store still work.
export { detectOsDarkModeUi as detectOsDarkMode } from './slices/uiSlice';

// v3.44.0 — Auto-save: snapshot of project state persisted across page refreshes.
const SESSION_KEY = 'woodworkingshop:session';
const sessionAdapter = createLocalStorageAdapter(browserLocalStorage);

function loadSession(): CabinetSessionSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionAdapter.readSync<unknown>(SESSION_KEY);
    if (raw === undefined) return null;
    return readCabinetSessionRecord(raw) ?? readLegacyCabinetSession(raw);
  } catch {
    return null;
  }
}
function saveSession(snap: CabinetSessionSnapshot): void {
  if (typeof window === 'undefined') return;
  // Keep the legacy flat fields so existing readers keep working, and add versioned slices.
  sessionAdapter.set(SESSION_KEY, { ...snap, ...createCabinetSessionRecord(snap) }).catch(() => undefined);
}

export type { CabinetEntry } from './slices/cabinetTypes';

// Phase 11 — ProjectSnapshot moved to snapshotSlice.ts; re-export for backward
// compat (tests + utils import it from cabinet-store).
export type { ProjectSnapshot } from './slices/snapshotSlice';

export type { CabinetState } from './store-types';

function derive(
  config: CabinetConfig,
  sawKerfMm = 4,
  sheetSizeOverrides: Record<string, { width: number; length: number }> = {},
  extraMaterials: Material[] = getCustomMaterials(),
) {
  const dimensions = computeDimensions(config, extraMaterials);
  const parts = generateParts(config, extraMaterials);
  const hardware = generateHardware(config, extraMaterials);
  // Sprint 16 — decorate with rotation locks before optimization.
  const optimization = optimizeCutSheets(
    applyLocks(parts),
    sawKerfMm,
    sheetSizeOverrides,
    config.cutMode ?? 'freeform',
    [],
    {},
    extraMaterials,
  );
  const edgeBandingTotal = computeEdgeBandingTotal(parts);
  return { dimensions, parts, hardware, optimization, edgeBandingTotal };
}

function deriveProject(
  cabinets: CabinetEntry[],
  activeIndex: number,
  sawKerfMm = 4,
  sheetSizeOverrides: Record<string, { width: number; length: number }> = {},
  extraMaterials: Material[] = getCustomMaterials(),
) {
  const activeConfig = cabinets[activeIndex].config;
  const active = derive(activeConfig, sawKerfMm, sheetSizeOverrides, extraMaterials);
  // Combined parts from all cabinets (prefixed with cabinet index)
  const allParts: Part[] = cabinets.flatMap((cab, ci) =>
    generateParts(cab.config, extraMaterials).map((p) => ({
      ...p,
      id: cabinets.length > 1 ? `C${ci + 1}-${p.id}` : p.id,
    })),
  );
  // Sprint 16 — apply rotation locks for combined optimization.
  const combinedOptimization =
    cabinets.length === 1
      ? active.optimization
      : optimizeCutSheets(
          applyLocks(allParts),
          sawKerfMm,
          sheetSizeOverrides,
          activeConfig.cutMode ?? 'freeform',
          [],
          {},
          extraMaterials,
        );
  return { config: activeConfig, ...active, allParts, combinedOptimization };
}

// v3.21.0 — Base derivation (parts, hardware, dimensions) WITHOUT cut optimization.
// Used for synchronous state updates so the UI renders new parts instantly while
// the worker computes fresh optimization in the background.
// v3.51.0 — Optimized: reuses the active cabinet's already-computed parts in the
// allParts flatMap instead of calling generateParts twice for the same config.
function deriveBaseProject(
  cabinets: CabinetEntry[],
  activeIndex: number,
  extraMaterials: Material[] = getCustomMaterials(),
) {
  const activeConfig = cabinets[activeIndex].config;
  // Phase 11 / Sprint 5 — sync module-level cut mode from active config so
  // scheduleOptimization always uses the latest value without extra params.
  setCutModeWorker(activeConfig.cutMode ?? 'freeform');
  const dimensions = computeDimensions(activeConfig, extraMaterials);
  const parts = generateParts(activeConfig, extraMaterials);
  const hardware = generateHardware(activeConfig, extraMaterials);
  const edgeBandingTotal = computeEdgeBandingTotal(parts);
  const allParts: Part[] = cabinets.flatMap((cab, ci) => {
    const cabParts = ci === activeIndex ? parts : generateParts(cab.config, extraMaterials);
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

  const cabinetsSlice = createCabinetsSlice(set, () => get(), deriveBaseProject);

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
    const urlActiveIndex = readActiveCabinetIndexFromUrl(initialCabinets.length);
    if (urlActiveIndex !== null) initialActiveIndex = urlActiveIndex;
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
  const deferInitialOptimization = typeof Worker !== 'undefined';
  const initial = deferInitialOptimization
    ? {
        ...deriveBaseProject(initialCabinets, initialActiveIndex),
        optimization: { sheets: [], totalSheets: 0, overallYield: 0, totalWaste: 0, grainConflictCount: 0 },
        combinedOptimization: { sheets: [], totalSheets: 0, overallYield: 0, totalWaste: 0, grainConflictCount: 0 },
      }
    : deriveProjectMemo(initialCabinets, initialActiveIndex, 4, {}, getCustomMaterials());
  if (deferInitialOptimization) scheduleOptimization(initial.parts, initial.allParts, 4, {});
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
    cabinetsSlice.endHistoryGroup();
    const state = get();
    const migrated = cabinets.map((c) => ({ ...c, config: { ...DEFAULT_CONFIG, ...c.config } }));
    const past = appendCabinetPatch(state._past, state.cabinets, migrated);
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
  const projectSet = sliceSetImpl as SliceSetFn<ProjectSlice>;
  const catalogSet = sliceSetImpl as SliceSetFn<CatalogSlice>;
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
    optimizationPending: deferInitialOptimization,
    costPending: deferInitialOptimization,
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
      getCustomMaterials(),
    ),
    assemblySteps: generateAssemblySteps(initial.config),

    // ── UI slice ───────────────────────────────────────────────────────────
    ...createUiSlice(uiSet, prefs, loadBuildLog(), loadCutChecklist()),

    // Project identity and URL state are separate from display preferences.
    ...createProjectSlice(projectSet, initialProjectName, initialProjectNotes),

    // Offcut/defect catalogs own the store-facing data; worker mirrors remain behind injected callbacks.
    ...createCatalogSlice(
      catalogSet,
      () => get() as CatalogSlice,
      setOffcutCatalog,
      setDefectZones,
      () => {
        const state = get();
        const base = deriveBaseProject(state.cabinets, state.activeCabinetIndex);
        scheduleOptimization(base.parts, base.allParts, state.sawKerf, state.sheetSizeOverrides);
      },
    ),

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

    ...cabinetsSlice,
  };
});

useCustomMaterialsStore.subscribe((state, previousState) => {
  if (state.materials === previousState.materials) return;
  const cabinetState = useCabinetStore.getState();
  const base = deriveBaseProject(cabinetState.cabinets, cabinetState.activeCabinetIndex, state.materials);
  scheduleOptimization(base.parts, base.allParts, cabinetState.sawKerf, cabinetState.sheetSizeOverrides);
  useCabinetStore.setState({ ...base, optimizationPending: true, costPending: true });
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
      autoCoNest: state.autoCoNest,
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
const loadedSnapshots = await idbLoadSnapshots<ProjectSnapshot>();
if (loadedSnapshots.length > 0) {
  useCabinetStore.setState({ snapshots: loadedSnapshots });
}
