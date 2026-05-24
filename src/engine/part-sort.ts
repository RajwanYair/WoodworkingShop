/**
 * Sprint 39 — Part sort order engine.
 *
 * Provides configurable, multi-key sort predicates for BOM and cut-plan part
 * lists.  Sorting is entirely in-memory (returns a new sorted array).
 *
 * Sort keys (applied left-to-right, ties broken by next key):
 *   - material   : alphabetic by material name
 *   - type       : alphabetic by part type
 *   - zone       : alphabetic by cabinet zone
 *   - length     : numeric (descending by default — largest parts first)
 *   - width      : numeric (descending)
 *   - thickness  : numeric (descending)
 *   - name       : alphabetic by English name
 *   - quantity   : numeric (descending)
 *
 * Each key can be 'asc' or 'desc'.
 *
 * Pure function — no React, no side effects.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SortablePart {
  id: string;
  name: { en: string; he: string };
  material: string;
  type: string;
  zone?: string;
  thicknessMm: number;
  widthMm: number;
  lengthMm: number;
  quantity: number;
}

export type SortKey = 'material' | 'type' | 'zone' | 'length' | 'width' | 'thickness' | 'name' | 'quantity';
export type SortDirection = 'asc' | 'desc';

export interface SortCriterion {
  key: SortKey;
  dir: SortDirection;
}

/** Pre-defined common sort presets. */
export type SortPreset =
  | 'material-then-length-desc'
  | 'type-then-length-desc'
  | 'thickness-desc-then-length-desc'
  | 'name-asc';

export const SORT_PRESETS: Record<SortPreset, SortCriterion[]> = {
  'material-then-length-desc': [
    { key: 'material', dir: 'asc' },
    { key: 'length', dir: 'desc' },
    { key: 'width', dir: 'desc' },
  ],
  'type-then-length-desc': [
    { key: 'type', dir: 'asc' },
    { key: 'length', dir: 'desc' },
  ],
  'thickness-desc-then-length-desc': [
    { key: 'thickness', dir: 'desc' },
    { key: 'length', dir: 'desc' },
    { key: 'width', dir: 'desc' },
  ],
  'name-asc': [{ key: 'name', dir: 'asc' }],
};

// ─── Core ─────────────────────────────────────────────────────────────────────

function getValue(part: SortablePart, key: SortKey): string | number {
  switch (key) {
    case 'material':
      return part.material.toLowerCase();
    case 'type':
      return part.type.toLowerCase();
    case 'zone':
      return (part.zone ?? '').toLowerCase();
    case 'length':
      return part.lengthMm;
    case 'width':
      return part.widthMm;
    case 'thickness':
      return part.thicknessMm;
    case 'name':
      return part.name.en.toLowerCase();
    case 'quantity':
      return part.quantity;
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

/**
 * Sort parts by an ordered list of sort criteria.
 * Returns a new sorted array (original is not mutated).
 */
export function sortParts(parts: SortablePart[], criteria: SortCriterion[]): SortablePart[] {
  const copy = [...parts];
  copy.sort((a, b) => {
    for (const c of criteria) {
      const va = getValue(a, c.key);
      const vb = getValue(b, c.key);
      if (va < vb) return c.dir === 'asc' ? -1 : 1;
      if (va > vb) return c.dir === 'asc' ? 1 : -1;
    }
    return 0;
  });
  return copy;
}

/** Sort using a named preset. */
export function sortPartsByPreset(parts: SortablePart[], preset: SortPreset): SortablePart[] {
  return sortParts(parts, SORT_PRESETS[preset]);
}

/** Reverse the sort direction of each criterion in a list. */
export function invertSortCriteria(criteria: SortCriterion[]): SortCriterion[] {
  return criteria.map((c) => ({ ...c, dir: c.dir === 'asc' ? 'desc' : 'asc' }));
}
