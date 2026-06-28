import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createNamedExpressionsSlice,
  loadNamedExpressionsFromStorage,
} from '../../src/store/slices/namedExpressionsSlice';
import type { NamedExpressionsSlice, NamedExpression } from '../../src/store/slices/namedExpressionsSlice';

// ── localStorage mock ──────────────────────────────────────────────────────

beforeAll(() => {
  // Mock localStorage for jsdom test environment
  const store: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((key) => {
        delete store[key];
      });
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  });
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeSlice(): { state: NamedExpressionsSlice } {
  const container: { state: NamedExpressionsSlice } = { state: null! };
  const set = (
    partial: Partial<NamedExpressionsSlice> | ((s: NamedExpressionsSlice) => Partial<NamedExpressionsSlice>),
  ) => {
    const next = typeof partial === 'function' ? partial(container.state) : partial;
    container.state = { ...container.state, ...next };
  };
  container.state = createNamedExpressionsSlice(set);
  return container;
}

const ENTRY_A: NamedExpression = { name: 'shelf_gap', expression: 'height / (shelfCount + 1)' };
const ENTRY_B: NamedExpression = { name: 'panel_area', expression: 'width * height' };

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('createNamedExpressionsSlice', () => {
  beforeEach(() => {
    // Clear localStorage so tests start clean
    globalThis.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initialises with empty namedExpressions and no errors', () => {
    const sliceContainer = makeSlice();
    expect(sliceContainer.state.namedExpressions).toEqual([]);
    expect(sliceContainer.state.expressionErrors).toEqual({});
  });

  describe('setNamedExpression', () => {
    it('adds a new expression to the list', () => {
      const sliceContainer = makeSlice();
      sliceContainer.state.setNamedExpression(ENTRY_A);
      expect(sliceContainer.state.namedExpressions).toHaveLength(1);
      expect(sliceContainer.state.namedExpressions[0]).toEqual(ENTRY_A);
    });

    it('overwrites an existing expression with the same name', () => {
      const sliceContainer = makeSlice();
      sliceContainer.state.setNamedExpression(ENTRY_A);
      const updated: NamedExpression = { name: 'shelf_gap', expression: 'height / 4' };
      sliceContainer.state.setNamedExpression(updated);
      expect(sliceContainer.state.namedExpressions).toHaveLength(1);
      expect(sliceContainer.state.namedExpressions[0].expression).toBe('height / 4');
    });

    it('appends a second distinct entry', () => {
      const sliceContainer = makeSlice();
      sliceContainer.state.setNamedExpression(ENTRY_A);
      sliceContainer.state.setNamedExpression(ENTRY_B);
      expect(sliceContainer.state.namedExpressions).toHaveLength(2);
    });
  });

  describe('removeNamedExpression', () => {
    it('removes the entry by name', () => {
      const sliceContainer = makeSlice();
      sliceContainer.state.setNamedExpression(ENTRY_A);
      sliceContainer.state.setNamedExpression(ENTRY_B);
      sliceContainer.state.removeNamedExpression('shelf_gap');
      expect(sliceContainer.state.namedExpressions).toHaveLength(1);
      expect(sliceContainer.state.namedExpressions[0].name).toBe('panel_area');
    });

    it('also removes any error for that name', () => {
      const sliceContainer = makeSlice();
      sliceContainer.state.setNamedExpression(ENTRY_A);
      sliceContainer.state.setExpressionError('shelf_gap', 'some error');
      sliceContainer.state.removeNamedExpression('shelf_gap');
      expect(sliceContainer.state.expressionErrors).not.toHaveProperty('shelf_gap');
    });

    it('is a no-op when the name does not exist', () => {
      const sliceContainer = makeSlice();
      sliceContainer.state.setNamedExpression(ENTRY_A);
      sliceContainer.state.removeNamedExpression('nonexistent');
      expect(sliceContainer.state.namedExpressions).toHaveLength(1);
    });
  });

  describe('loadNamedExpressions', () => {
    it('replaces all entries and clears errors', () => {
      const sliceContainer = makeSlice();
      sliceContainer.state.setNamedExpression(ENTRY_A);
      sliceContainer.state.setExpressionError('shelf_gap', 'old error');
      sliceContainer.state.loadNamedExpressions([ENTRY_B]);
      expect(sliceContainer.state.namedExpressions).toEqual([ENTRY_B]);
      expect(sliceContainer.state.expressionErrors).toEqual({});
    });

    it('accepts an empty array to clear all expressions', () => {
      const sliceContainer = makeSlice();
      sliceContainer.state.setNamedExpression(ENTRY_A);
      sliceContainer.state.loadNamedExpressions([]);
      expect(sliceContainer.state.namedExpressions).toEqual([]);
    });
  });

  describe('setExpressionError / clearExpressionErrors', () => {
    it.each([
      { name: 'shelf_gap', error: 'cyclic dependency' },
      { name: 'panel_area', error: 'unknown variable' },
    ])('records error "$error" for "$name"', ({ name, error }) => {
      const sliceContainer = makeSlice();
      sliceContainer.state.setExpressionError(name, error);
      expect(sliceContainer.state.expressionErrors[name]).toBe(error);
    });

    it('clearExpressionErrors removes all recorded errors', () => {
      const sliceContainer = makeSlice();
      sliceContainer.state.setExpressionError('a', 'err1');
      sliceContainer.state.setExpressionError('b', 'err2');
      sliceContainer.state.clearExpressionErrors();
      expect(sliceContainer.state.expressionErrors).toEqual({});
    });
  });
});

describe('loadNamedExpressionsFromStorage', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  it('returns empty array when nothing is stored', () => {
    expect(loadNamedExpressionsFromStorage()).toEqual([]);
  });

  it('returns stored entries when present', () => {
    if (globalThis.window === undefined) return;
    globalThis.localStorage.setItem('woodworkingshop:namedExpressions', JSON.stringify([ENTRY_A, ENTRY_B]));
    const result = loadNamedExpressionsFromStorage();
    expect(result).toEqual([ENTRY_A, ENTRY_B]);
  });

  it('returns empty array on malformed JSON', () => {
    if (globalThis.window === undefined) return;
    globalThis.localStorage.setItem('woodworkingshop:namedExpressions', 'INVALID JSON{');
    expect(loadNamedExpressionsFromStorage()).toEqual([]);
  });

  it('returns empty array when stored value is not an array', () => {
    if (globalThis.window === undefined) return;
    globalThis.localStorage.setItem('woodworkingshop:namedExpressions', JSON.stringify({ foo: 'bar' }));
    expect(loadNamedExpressionsFromStorage()).toEqual([]);
  });
});
