/**
 * Phase 11 — UI Slice
 *
 * Owns all display-preference state: active tab, dark/colour-blind/high-contrast
 * modes, unit system, project identity fields.  Zero cross-slice dependencies:
 * none of these actions trigger re-optimization or re-derivation.
 */
import type { UnitSystem } from '../../utils/units';
import { pushProjectNameToUrl } from '../../utils/url-state';

// ─── Persisted preference helpers (shared with cabinet-store.ts) ─────────────
// NOTE: these are intentionally duplicated from cabinet-store.ts so the slice
// is independently testable without importing the full store module.

export const UI_PREFS_KEY = 'woodworkingshop:prefs';
export const BUILD_LOG_KEY = 'woodworkingshop:buildlog';
export const CUT_CHECKLIST_KEY = 'woodworkingshop:cutchecklist';

/** A single entry in the project build log. */
export interface BuildLogEntry {
  id: string;
  text: string;
  /** ISO-8601 timestamp when the entry was created. */
  createdAt: string;
}

export interface UiPersistedPrefs {
  darkMode?: boolean;
  colorBlindMode?: boolean;
  highContrastMode?: boolean;
  units?: UnitSystem;
}

export function loadUiPrefs(): UiPersistedPrefs {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(UI_PREFS_KEY);
    return raw ? (JSON.parse(raw) as UiPersistedPrefs) : {};
  } catch {
    return {};
  }
}

export function saveUiPrefs(prefs: UiPersistedPrefs): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(UI_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* quota / disabled — ignore */
  }
}

export function loadBuildLog(): BuildLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(BUILD_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as BuildLogEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveBuildLog(log: BuildLogEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(BUILD_LOG_KEY, JSON.stringify(log));
  } catch {
    /* quota / disabled — ignore */
  }
}

export function loadCutChecklist(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CUT_CHECKLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export function saveCutChecklist(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CUT_CHECKLIST_KEY, JSON.stringify(ids));
  } catch {
    /* quota / disabled — ignore */
  }
}

/**
 * Detect the OS dark-mode preference.
 * Returns `true` when `(prefers-color-scheme: dark)` matches.
 */
export function detectOsDarkModeUi(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// ─── Slice type ───────────────────────────────────────────────────────────────

type ActiveTab = 'configurator' | 'preview' | 'optimizer' | 'assembly' | 'pdf';

export type UiSlice = {
  // State
  activeTab: ActiveTab;
  projectName: string;
  projectNotes: string;
  darkMode: boolean;
  colorBlindMode: boolean;
  highContrastMode: boolean;
  units: UnitSystem;

  // Build log (Sprint 89)
  buildLog: BuildLogEntry[];

  // Focus mode (Sprint 90)
  focusMode: boolean;

  // Cut checklist (Sprint 94)
  checkedPartIds: string[];

  // Actions
  setActiveTab: (tab: ActiveTab) => void;
  setProjectName: (name: string) => void;
  setProjectNotes: (notes: string) => void;
  toggleDarkMode: () => void;
  toggleColorBlindMode: () => void;
  toggleHighContrast: () => void;
  toggleUnits: () => void;

  // Build log actions (Sprint 89)
  addBuildLogEntry: (text: string) => void;
  deleteBuildLogEntry: (id: string) => void;
  clearBuildLog: () => void;

  // Focus mode actions (Sprint 90)
  toggleFocusMode: () => void;

  // Cut checklist actions (Sprint 94)
  toggleCutPart: (partId: string) => void;
  clearCutChecklist: () => void;
};

// ─── Slice creator ────────────────────────────────────────────────────────────

// `set` is typed loosely so this factory works with any Zustand store that
// contains UiSlice fields — no circular import of CabinetState required.
type UiSet = (partial: Partial<UiSlice> | ((s: UiSlice) => Partial<UiSlice>)) => void;

/**
 * Create the UI slice for a Zustand store.  Pass initial preference data so the
 * factory is pure (no hidden `loadUiPrefs()` side effect during creation).
 */
export function createUiSlice(
  set: UiSet,
  initialPrefs: UiPersistedPrefs,
  initialProjectName: string,
  initialProjectNotes: string,
  initialBuildLog: BuildLogEntry[],
  initialCheckedPartIds: string[],
): UiSlice {
  return {
    // ── Initial state ──
    activeTab: 'configurator',
    projectName: initialProjectName,
    projectNotes: initialProjectNotes,
    darkMode: initialPrefs.darkMode ?? detectOsDarkModeUi(),
    colorBlindMode: initialPrefs.colorBlindMode ?? false,
    highContrastMode: initialPrefs.highContrastMode ?? false,
    units: initialPrefs.units ?? ('metric' as UnitSystem),
    buildLog: initialBuildLog,
    focusMode: false,
    checkedPartIds: initialCheckedPartIds,

    // ── Actions ──
    setActiveTab: (tab) => set({ activeTab: tab }),

    setProjectName: (name) => {
      set({ projectName: name });
      pushProjectNameToUrl(name);
    },

    setProjectNotes: (notes) => set({ projectNotes: notes }),

    toggleDarkMode: () =>
      set((s) => {
        const darkMode = !s.darkMode;
        saveUiPrefs({
          darkMode,
          colorBlindMode: s.colorBlindMode,
          highContrastMode: s.highContrastMode,
          units: s.units,
        });
        return { darkMode };
      }),

    toggleColorBlindMode: () =>
      set((s) => {
        const colorBlindMode = !s.colorBlindMode;
        saveUiPrefs({ darkMode: s.darkMode, colorBlindMode, highContrastMode: s.highContrastMode, units: s.units });
        return { colorBlindMode };
      }),

    toggleHighContrast: () =>
      set((s) => {
        const highContrastMode = !s.highContrastMode;
        saveUiPrefs({ darkMode: s.darkMode, colorBlindMode: s.colorBlindMode, highContrastMode, units: s.units });
        return { highContrastMode };
      }),

    toggleUnits: () =>
      set((s) => {
        const units: UnitSystem = s.units === 'metric' ? 'imperial' : 'metric';
        saveUiPrefs({
          darkMode: s.darkMode,
          colorBlindMode: s.colorBlindMode,
          highContrastMode: s.highContrastMode,
          units,
        });
        return { units };
      }),

    addBuildLogEntry: (text) =>
      set((s) => {
        const entry: BuildLogEntry = {
          id: crypto.randomUUID(),
          text: text.trim(),
          createdAt: new Date().toISOString(),
        };
        const buildLog = [entry, ...s.buildLog];
        saveBuildLog(buildLog);
        return { buildLog };
      }),

    deleteBuildLogEntry: (id) =>
      set((s) => {
        const buildLog = s.buildLog.filter((e) => e.id !== id);
        saveBuildLog(buildLog);
        return { buildLog };
      }),

    clearBuildLog: () =>
      set(() => {
        saveBuildLog([]);
        return { buildLog: [] };
      }),

    toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),

    toggleCutPart: (partId) =>
      set((s) => {
        const current = new Set(s.checkedPartIds);
        if (current.has(partId)) {
          current.delete(partId);
        } else {
          current.add(partId);
        }
        const checkedPartIds = Array.from(current);
        saveCutChecklist(checkedPartIds);
        return { checkedPartIds };
      }),

    clearCutChecklist: () =>
      set(() => {
        saveCutChecklist([]);
        return { checkedPartIds: [] };
      }),
  };
}
