/**
 * Phase 11 — uiSlice unit tests
 *
 * Validates initial state, actions, and localStorage persistence in isolation
 * (no Zustand store required — factory function is pure).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createUiSlice,
  detectOsDarkModeUi,
  loadUiPrefs,
  saveUiPrefs,
  UI_PREFS_KEY,
  type UiSlice,
  type UiPersistedPrefs,
} from '../../../src/store/slices/uiSlice';

// ── localStorage stub ──────────────────────────────────────────────────────
// jsdom exposes window.localStorage but not the bare `localStorage` global.
const _lsData: Record<string, string> = {};
const localStorageMock = {
  getItem: (k: string) => _lsData[k] ?? null,
  setItem: (k: string, v: string) => {
    _lsData[k] = v;
  },
  removeItem: (k: string) => {
    delete _lsData[k];
  },
  clear: () => {
    for (const k of Object.keys(_lsData)) delete _lsData[k];
  },
};
vi.stubGlobal('localStorage', localStorageMock);
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true, configurable: true });

// ── helpers ───────────────────────────────────────────────────────────────────

/** Build a UiSlice by wiring a simple patch-based set fn. */
function makeSlice(prefs: UiPersistedPrefs = {}, projectName = '', projectNotes = '') {
  let state: UiSlice;
  const set = (partial: Partial<UiSlice> | ((s: UiSlice) => Partial<UiSlice>)) => {
    const patch = typeof partial === 'function' ? partial(state) : partial;
    state = { ...state, ...patch };
  };
  state = createUiSlice(set as Parameters<typeof createUiSlice>[0], prefs, projectName, projectNotes, [], []);
  return { get: () => state, set };
}

// ── detectOsDarkModeUi ────────────────────────────────────────────────────────

describe('detectOsDarkModeUi', () => {
  it('returns false when matchMedia is unavailable', () => {
    const original = window.matchMedia;
    // @ts-expect-error intentional stub
    window.matchMedia = undefined;
    expect(detectOsDarkModeUi()).toBe(false);
    window.matchMedia = original;
  });

  it('mirrors the matchMedia dark result when available', () => {
    // @ts-expect-error intentional minimal stub
    window.matchMedia = () => ({ matches: true });
    expect(detectOsDarkModeUi()).toBe(true);
    // @ts-expect-error intentional minimal stub
    window.matchMedia = () => ({ matches: false });
    expect(detectOsDarkModeUi()).toBe(false);
    // Restore to undefined (jsdom default)
    // @ts-expect-error intentional stub
    window.matchMedia = undefined;
  });
});

// ── localStorage helpers ──────────────────────────────────────────────────────

describe('loadUiPrefs / saveUiPrefs', () => {
  beforeEach(() => localStorage.clear());

  it('returns empty object when nothing is stored', () => {
    expect(loadUiPrefs()).toEqual({});
  });

  it('round-trips prefs through localStorage', () => {
    const prefs: UiPersistedPrefs = { darkMode: true, colorBlindMode: false, units: 'imperial' };
    saveUiPrefs(prefs);
    expect(loadUiPrefs()).toEqual(prefs);
  });

  it('returns empty object on malformed JSON', () => {
    localStorage.setItem(UI_PREFS_KEY, '{bad json}');
    expect(loadUiPrefs()).toEqual({});
  });
});

// ── createUiSlice — initial state ────────────────────────────────────────────

describe('createUiSlice — initial state', () => {
  it('defaults to workspace tab', () => {
    expect(makeSlice().get().activeTab).toBe('workspace');
  });

  it('applies saved darkMode preference', () => {
    expect(makeSlice({ darkMode: true }).get().darkMode).toBe(true);
    expect(makeSlice({ darkMode: false }).get().darkMode).toBe(false);
  });

  it('defaults colorBlindMode to false', () => {
    expect(makeSlice().get().colorBlindMode).toBe(false);
  });

  it('defaults highContrastMode to false', () => {
    expect(makeSlice().get().highContrastMode).toBe(false);
  });

  it('defaults units to metric', () => {
    expect(makeSlice().get().units).toBe('metric');
  });

  it('applies saved units preference', () => {
    expect(makeSlice({ units: 'imperial' }).get().units).toBe('imperial');
  });

  it('sets initial projectName', () => {
    expect(makeSlice({}, 'My Kitchen').get().projectName).toBe('My Kitchen');
  });

  it('sets initial projectNotes', () => {
    expect(makeSlice({}, '', 'Some notes').get().projectNotes).toBe('Some notes');
  });
});

// ── createUiSlice — actions ───────────────────────────────────────────────────

describe('createUiSlice — setActiveTab', () => {
  it('switches to optimizer tab', () => {
    const { get } = makeSlice();
    get().setActiveTab('optimizer');
    expect(get().activeTab).toBe('optimizer');
  });

  it('switches back to configurator', () => {
    const { get } = makeSlice();
    get().setActiveTab('pdf');
    get().setActiveTab('configurator');
    expect(get().activeTab).toBe('configurator');
  });
});

describe('createUiSlice — setProjectName / setProjectNotes', () => {
  it('updates projectName', () => {
    const { get } = makeSlice({}, 'Old');
    get().setProjectName('New');
    expect(get().projectName).toBe('New');
  });

  it('updates projectNotes', () => {
    const { get } = makeSlice();
    get().setProjectNotes('note text');
    expect(get().projectNotes).toBe('note text');
  });
});

describe('createUiSlice — toggleDarkMode', () => {
  beforeEach(() => localStorage.clear());

  it('toggles false → true', () => {
    const { get } = makeSlice({ darkMode: false });
    get().toggleDarkMode();
    expect(get().darkMode).toBe(true);
  });

  it('toggles true → false', () => {
    const { get } = makeSlice({ darkMode: true });
    get().toggleDarkMode();
    expect(get().darkMode).toBe(false);
  });

  it('persists the new value to localStorage', () => {
    const { get } = makeSlice({ darkMode: false });
    get().toggleDarkMode();
    expect(loadUiPrefs().darkMode).toBe(true);
  });
});

describe('createUiSlice — toggleColorBlindMode', () => {
  beforeEach(() => localStorage.clear());

  it('toggles false → true', () => {
    const { get } = makeSlice();
    get().toggleColorBlindMode();
    expect(get().colorBlindMode).toBe(true);
  });

  it('persists colorBlindMode', () => {
    const { get } = makeSlice();
    get().toggleColorBlindMode();
    expect(loadUiPrefs().colorBlindMode).toBe(true);
  });
});

describe('createUiSlice — toggleHighContrast', () => {
  beforeEach(() => localStorage.clear());

  it('toggles false → true', () => {
    const { get } = makeSlice();
    get().toggleHighContrast();
    expect(get().highContrastMode).toBe(true);
  });

  it('persists highContrastMode', () => {
    const { get } = makeSlice();
    get().toggleHighContrast();
    expect(loadUiPrefs().highContrastMode).toBe(true);
  });
});

describe('createUiSlice — toggleUnits', () => {
  beforeEach(() => localStorage.clear());

  it('toggles metric → imperial', () => {
    const { get } = makeSlice({ units: 'metric' });
    get().toggleUnits();
    expect(get().units).toBe('imperial');
  });

  it('toggles imperial → metric', () => {
    const { get } = makeSlice({ units: 'imperial' });
    get().toggleUnits();
    expect(get().units).toBe('metric');
  });

  it('persists units to localStorage', () => {
    const { get } = makeSlice({ units: 'metric' });
    get().toggleUnits();
    expect(loadUiPrefs().units).toBe('imperial');
  });
});
