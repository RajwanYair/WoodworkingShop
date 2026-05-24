/**
 * Sprint 47 — Batch material replace engine.
 *
 * Replaces all occurrences of one material identifier with another across a
 * set of parts.  Optionally, the replacement can be scoped to specific zones
 * or part types.
 *
 * Returns a result object describing:
 *   - The updated parts array (original parts NOT mutated).
 *   - How many parts were changed.
 *   - Which part ids were affected.
 *
 * Pure function — no React, no side effects.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Minimal part shape required for batch replacement. */
export interface BatchPart {
  id: string;
  material: string;
  type?: string;
  zone?: string;
}

export interface BatchReplaceOptions {
  /** If provided, only replace parts with matching type. */
  filterType?: string;
  /** If provided, only replace parts within this zone. */
  filterZone?: string;
}

export interface BatchReplaceResult<T extends BatchPart> {
  parts: T[];
  changedCount: number;
  affectedIds: string[];
}

// ─── Core ─────────────────────────────────────────────────────────────────────

/**
 * Replace `fromMaterial` with `toMaterial` across all parts (or filtered
 * subset).  Returns a new array; input parts are not mutated.
 */
export function batchReplaceMaterial<T extends BatchPart>(
  parts: T[],
  fromMaterial: string,
  toMaterial: string,
  options: BatchReplaceOptions = {},
): BatchReplaceResult<T> {
  const affectedIds: string[] = [];

  const updated = parts.map((p): T => {
    if (p.material !== fromMaterial) return p;
    if (options.filterType !== undefined && p.type !== options.filterType) return p;
    if (options.filterZone !== undefined && p.zone !== options.filterZone) return p;

    affectedIds.push(p.id);
    return { ...p, material: toMaterial };
  });

  return { parts: updated, changedCount: affectedIds.length, affectedIds };
}

/**
 * List all distinct materials used across a set of parts.
 */
export function listMaterials(parts: BatchPart[]): string[] {
  return [...new Set(parts.map((p) => p.material))].sort();
}

/**
 * Count how many parts use each material.
 */
export function countByMaterial(parts: BatchPart[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of parts) {
    map.set(p.material, (map.get(p.material) ?? 0) + 1);
  }
  return map;
}
