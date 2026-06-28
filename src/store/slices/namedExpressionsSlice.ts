/**
 * Sprint 296 — Named Expressions Slice
 *
 * Owns the map of user-defined named expressions (formula → numeric value).
 * Example: `{ shelf_gap: 'height / (shelfCount + 1)' }`.
 * These are evaluated by `evaluateNamedParameters` from the engine and are
 * stored per-session in localStorage under `woodworkingshop:namedExpressions`.
 *
 * This slice has zero cross-slice dependencies — it does not trigger
 * re-optimization; consumers read `resolvedExpressions` and decide how to
 * apply the values to config fields.
 */

const STORAGE_KEY = 'woodworkingshop:namedExpressions';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * A single user-defined expression entry.
 * `name` is the formula variable name (e.g. `shelf_gap`).
 * `expression` is the formula string (e.g. `height / (shelfCount + 1)`).
 */
export interface NamedExpression {
  /** Unique expression name — used as a variable in other expressions. */
  name: string;
  /** Formula string — arithmetic with identifiers and Math.*. */
  expression: string;
}

export type NamedExpressionsSlice = {
  /** User-defined named expressions, keyed by name. */
  namedExpressions: NamedExpression[];
  /** Last evaluation errors, keyed by name. Empty string = no error. */
  expressionErrors: Record<string, string>;

  /** Add or overwrite a named expression. */
  setNamedExpression: (entry: NamedExpression) => void;
  /** Remove a named expression by name. */
  removeNamedExpression: (name: string) => void;
  /** Replace the entire expression list (used for bulk import / session restore). */
  loadNamedExpressions: (entries: NamedExpression[]) => void;
  /** Record evaluation errors from outside the slice (called after evaluate). */
  setExpressionError: (name: string, error: string) => void;
  /** Clear all errors. */
  clearExpressionErrors: () => void;
};

// ─── Persistence helpers ──────────────────────────────────────────────────────

export function loadNamedExpressionsFromStorage(): NamedExpression[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as NamedExpression[]) : [];
  } catch {
    return [];
  }
}

function saveNamedExpressionsToStorage(entries: NamedExpression[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* quota / disabled — ignore */
  }
}

// ─── Slice creator ────────────────────────────────────────────────────────────

type NExSet = (
  partial: Partial<NamedExpressionsSlice> | ((s: NamedExpressionsSlice) => Partial<NamedExpressionsSlice>),
) => void;

/**
 * Create the named expressions slice.
 *
 * @param set - Zustand setter supplied by `create()`.
 * @returns Slice initial state and action implementations.
 */
export function createNamedExpressionsSlice(set: NExSet): NamedExpressionsSlice {
  return {
    namedExpressions: loadNamedExpressionsFromStorage(),
    expressionErrors: {},

    setNamedExpression(entry) {
      set((s) => {
        const existing = s.namedExpressions.findIndex((e) => e.name === entry.name);
        const next =
          existing >= 0
            ? s.namedExpressions.map((e, i) => (i === existing ? entry : e))
            : [...s.namedExpressions, entry];
        saveNamedExpressionsToStorage(next);
        return { ...s, namedExpressions: next };
      });
    },

    removeNamedExpression(name) {
      set((s) => {
        const next = s.namedExpressions.filter((e) => e.name !== name);
        saveNamedExpressionsToStorage(next);
        const { [name]: _removed, ...restErrors } = s.expressionErrors;
        return { ...s, namedExpressions: next, expressionErrors: restErrors };
      });
    },

    loadNamedExpressions(entries) {
      set((s) => {
        saveNamedExpressionsToStorage(entries);
        return { ...s, namedExpressions: entries, expressionErrors: {} };
      });
    },

    setExpressionError(name, error) {
      set((s) => ({
        ...s,
        expressionErrors: { ...s.expressionErrors, [name]: error },
      }));
    },

    clearExpressionErrors() {
      set((s) => ({ ...s, expressionErrors: {} }));
    },
  };
}
