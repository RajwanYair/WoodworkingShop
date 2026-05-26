/**
 * Sprint 94 — Part Cutting Checklist engine.
 *
 * Transforms a list of cabinet `Part` objects into a structured checklist,
 * grouped by material, for tracking which parts have been physically cut at
 * the saw.  The engine is stateless; checklist state (checked IDs) is owned
 * by the store and passed in as a read-only set.
 *
 * Pure TypeScript — no React, no DOM, no side effects.
 */

import type { Part } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

/** A single row in the cut checklist. */
interface CutChecklistItem {
  /** Stable identifier — the `Part.id` value from the engine. */
  partId: string;
  /** Human-readable label (English). */
  label: string;
  material: string;
  thickness: number;
  width: number;
  length: number;
  quantity: number;
  /** True when the user has marked this part as cut. */
  checked: boolean;
}

/** Parts grouped by material key for display. */
interface CutChecklistGroup {
  material: string;
  items: CutChecklistItem[];
  /** Number of checked items in this group. */
  checkedCount: number;
  totalCount: number;
}

/** Full checklist state derived from parts + checked IDs. */
export interface CutChecklist {
  groups: CutChecklistGroup[];
  totalParts: number;
  checkedParts: number;
  /** Completion percentage 0–100. */
  progressPercent: number;
  isComplete: boolean;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Build a structured cut checklist from a flat parts list and the set of
 * already-checked part IDs.
 *
 * Parts with `qty > 1` are kept as a single row labelled "×qty" — the user
 * ticks them off as a batch.
 *
 * @param parts      - Parts from `generateParts(config)`.
 * @param checkedIds - Set of `Part.id` values that have been checked off.
 * @param lang       - Display language ('en' | 'he') for part names.
 */
export function buildCutChecklist(
  parts: Part[],
  checkedIds: ReadonlySet<string>,
  lang: 'en' | 'he' = 'en',
): CutChecklist {
  // Group by material
  const groupMap = new Map<string, CutChecklistItem[]>();
  for (const p of parts) {
    const item: CutChecklistItem = {
      partId: p.id,
      label: p.name[lang],
      material: p.material,
      thickness: p.thickness,
      width: p.width,
      length: p.length,
      quantity: p.qty,
      checked: checkedIds.has(p.id),
    };
    const existing = groupMap.get(p.material);
    if (existing) {
      existing.push(item);
    } else {
      groupMap.set(p.material, [item]);
    }
  }

  const groups: CutChecklistGroup[] = Array.from(groupMap.entries()).map(([material, items]) => ({
    material,
    items,
    checkedCount: items.filter((i) => i.checked).length,
    totalCount: items.length,
  }));

  const totalParts = groups.reduce((s, g) => s + g.totalCount, 0);
  const checkedParts = groups.reduce((s, g) => s + g.checkedCount, 0);
  const progressPercent = totalParts > 0 ? Math.round((checkedParts / totalParts) * 100) : 0;

  return {
    groups,
    totalParts,
    checkedParts,
    progressPercent,
    isComplete: totalParts > 0 && checkedParts === totalParts,
  };
}
