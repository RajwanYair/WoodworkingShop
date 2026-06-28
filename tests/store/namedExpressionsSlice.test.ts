import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createNamedExpressionsSlice,
  loadNamedExpressionsFromStorage,
} from '../../src/store/slices/namedExpressionsSlice';
import type { NamedExpressionsSlice, NamedExpression } from '../../src/store/slices/namedExpressionsSlice';

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
    if (globalThis.window !== undefined) {
      globalThis.localStorage.clear();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initialises with empty namedExpressions and no errors', () => {
    const { state } = makeSlice();
    expect(state.namedExpressions).toEqual([]);
    expect(state.expressionErrors).toEqual({});
  });

  describe('setNamedExpression', () => {
    it('adds a new expression to the list', () => {
      const { state } = makeSlice();
      state.setNamedExpression(ENTRY_A);
      expect(state.namedExpressions).toHaveLength(1);
      expect(state.namedExpressions[0]).toEqual(ENTRY_A);
    });

    it('overwrites an existing expression with the same name', () => {
      const { state } = makeSlice();
      state.setNamedExpression(ENTRY_A);
      const updated: NamedExpression = { name: 'shelf_gap', expression: 'height / 4' };
      state.setNamedExpression(updated);
      expect(state.namedExpressions).toHaveLength(1);
      expect(state.namedExpressions[0].expression).toBe('height / 4');
    });

    it('appends a second distinct entry', () => {
      const { state } = makeSlice();
      state.setNamedExpression(ENTRY_A);
      state.setNamedExpression(ENTRY_B);
      expect(state.namedExpressions).toHaveLength(2);
    });
  });

  describe('removeNamedExpression', () => {
    it('removes the entry by name', () => {
      const { state } = makeSlice();
      state.setNamedExpression(ENTRY_A);
      state.setNamedExpression(ENTRY_B);
      state.removeNamedExpression('shelf_gap');
      expect(state.namedExpressions).toHaveLength(1);
      expect(state.namedExpressions[0].name).toBe('panel_area');
    });

    it('also removes any error for that name', () => {
      const { state } = makeSlice();
      state.setNamedExpression(ENTRY_A);
      state.setExpressionError('shelf_gap', 'some error');
      state.removeNamedExpression('shelf_gap');
      expect(state.expressionErrors).not.toHaveProperty('shelf_gap');
    });

    it('is a no-op when the name does not exist', () => {
      const { state } = makeSlice();
      state.setNamedExpression(ENTRY_A);
      state.removeNamedExpression('non_existent');
      expect(state.namedExpressions).toHaveLength(1);
    });
  });

  describe('loadNamedExpressions', () => {
    it('replaces all entries and clears errors', () => {
      const { state } = makeSlice();
      state.setNamedExpression(ENTRY_A);
      state.setExpressionError('shelf_gap', 'old error');
      state.loadNamedExpressions([ENTRY_B]);
      expect(state.namedExpressions).toEqual([ENTRY_B]);
      expect(state.expressionErrors).toEqual({});
    });

    it('accepts an empty array to clear all expressions', () => {
      const { state } = makeSlice();
      state.setNamedExpression(ENTRY_A);
      state.loadNamedExpressions([]);
      expect(state.namedExpressions).toHaveLength(0);
    });
  });

  describe('setExpressionError / clearExpressionErrors', () => {
    it.each([
      { name: 'shelf_gap', error: 'cyclic dependency' },
      { name: 'panel_area', error: 'unknown variable' },
    ])('records error "$error" for "$name"', ({ name, error }) => {
      const { state } = makeSlice();
      state.setExpressionError(name, error);
      expect(state.expressionErrors[name]).toBe(error);
    });

    it('clearExpressionErrors removes all recorded errors', () => {
      const { state } = makeSlice();
      state.setExpressionError('a', 'err1');
      state.setExpressionError('b', 'err2');
      state.clearExpressionErrors();
      expect(state.expressionErrors).toEqual({});
    });
  });
});

describe('loadNamedExpressionsFromStorage', () => {
  beforeEach(() => {
    if (globalThis.window !== undefined) {
      globalThis.localStorage.clear();
    }
  });

  it('returns empty array when nothing is stored', () => {
    expect(loadNamedExpressionsFromStorage()).toEqual([]);
  });

  it('returns stored entries when present', () => {
    if (globalThis.window === undefined) return;
    globalThis.localStorage.setItem(
      'woodworkingshop:namedExpressions',
      JSON.stringify([ENTRY_A, ENTRY_B]),
    );
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
