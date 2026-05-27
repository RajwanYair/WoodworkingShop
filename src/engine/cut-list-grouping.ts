/**
 * Sprint 173 — Cut-list grouping engine.
 *
 * Groups parts by material, thickness, and grain direction for efficient
 * batch cutting on the workshop floor. Reduces tool changes and material
 * handling by organizing cuts into logical groups.
 *
 * Pure function — no React, no DOM, no side effects.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Grain direction constraint for a part. */
export type GrainDirection = 'along-length' | 'along-width' | 'none';

/** A part to be grouped for cutting. */
export interface CutPart {
  /** Unique part identifier. */
  id: string;
  /** Human-readable label. */
  label: string;
  /** Material key (e.g. "plywood-birch-18mm"). */
  material: string;
  /** Thickness in mm. */
  thickness: number;
  /** Width in mm (cross-grain dimension). */
  width: number;
  /** Length in mm (along-grain dimension). */
  length: number;
  /** Grain constraint. */
  grain: GrainDirection;
  /** Quantity needed. */
  qty: number;
  /** Optional cabinet/project identifier. */
  cabinetId?: string;
}

/** Grouping criteria used to cluster parts. */
export type GroupingCriterion = 'material' | 'thickness' | 'grain' | 'cabinet';

/** A group of parts sharing the same cutting setup. */
export interface CutGroup {
  /** Auto-generated group key (e.g. "plywood-birch-18mm|18|along-length"). */
  key: string;
  /** Human-readable group label. */
  label: string;
  /** Material shared by all parts in this group. */
  material: string;
  /** Thickness shared by all parts (mm). */
  thickness: number;
  /** Grain direction shared by all parts. */
  grain: GrainDirection;
  /** Cabinet ID if grouped by cabinet (undefined for mixed). */
  cabinetId?: string;
  /** Parts in this group, sorted by area descending. */
  parts: CutPart[];
  /** Total number of individual cuts (sum of qty). */
  totalCuts: number;
  /** Total board-feet required (approximate). */
  totalAreaMm2: number;
}

/** Result of a grouping operation. */
export interface GroupingResult {
  /** All groups produced. */
  groups: CutGroup[];
  /** Total unique groups. */
  groupCount: number;
  /** Total parts across all groups. */
  totalParts: number;
  /** Total cuts across all groups. */
  totalCuts: number;
  /** Criteria used for grouping. */
  criteria: GroupingCriterion[];
}

// ─── Functions ────────────────────────────────────────────────────────────────

/**
 * Build a group key from a part based on the active criteria.
 * @param part - The part to key.
 * @param criteria - Which criteria to include in the key.
 * @returns A pipe-separated key string.
 */
export function buildGroupKey(part: CutPart, criteria: readonly GroupingCriterion[]): string {
  const segments: string[] = [];
  for (const c of criteria) {
    switch (c) {
      case 'material':
        segments.push(part.material);
        break;
      case 'thickness':
        segments.push(String(part.thickness));
        break;
      case 'grain':
        segments.push(part.grain);
        break;
      case 'cabinet':
        segments.push(part.cabinetId ?? '_mixed');
        break;
    }
  }
  return segments.join('|');
}

/**
 * Generate a human-readable label for a group.
 * @param part - Representative part from the group.
 * @param criteria - Active criteria.
 * @returns Readable label string.
 */
export function buildGroupLabel(part: CutPart, criteria: readonly GroupingCriterion[]): string {
  const segments: string[] = [];
  if (criteria.includes('material')) segments.push(part.material);
  if (criteria.includes('thickness')) segments.push(`${part.thickness}mm`);
  if (criteria.includes('grain') && part.grain !== 'none') segments.push(part.grain);
  if (criteria.includes('cabinet') && part.cabinetId) segments.push(part.cabinetId);
  return segments.join(' · ');
}

/**
 * Group a list of parts by the specified criteria.
 * @param parts - All parts to group.
 * @param criteria - Criteria to group by (default: material + thickness + grain).
 * @returns Grouped result with statistics.
 * @throws RangeError if parts array is empty or criteria array is empty.
 */
export function groupParts(
  parts: readonly CutPart[],
  criteria: readonly GroupingCriterion[] = ['material', 'thickness', 'grain'],
): GroupingResult {
  if (parts.length === 0) {
    throw new RangeError('groupParts: parts array must not be empty');
  }
  if (criteria.length === 0) {
    throw new RangeError('groupParts: criteria array must not be empty');
  }

  const map = new Map<string, CutPart[]>();

  for (const part of parts) {
    const key = buildGroupKey(part, criteria);
    const existing = map.get(key);
    if (existing) {
      existing.push(part);
    } else {
      map.set(key, [part]);
    }
  }

  const groups: CutGroup[] = [];
  for (const [key, groupParts] of map) {
    // Sort by area descending (largest parts first for optimizer efficiency)
    const sorted = [...groupParts].sort((a, b) => b.width * b.length - a.width * a.length);
    const representative = sorted[0];
    const totalCuts = sorted.reduce((sum, p) => sum + p.qty, 0);
    const totalAreaMm2 = sorted.reduce((sum, p) => sum + p.width * p.length * p.qty, 0);

    groups.push({
      key,
      label: buildGroupLabel(representative, criteria),
      material: representative.material,
      thickness: representative.thickness,
      grain: representative.grain,
      cabinetId: criteria.includes('cabinet') ? representative.cabinetId : undefined,
      parts: sorted,
      totalCuts,
      totalAreaMm2,
    });
  }

  // Sort groups by total area descending (process largest groups first)
  groups.sort((a, b) => b.totalAreaMm2 - a.totalAreaMm2);

  return {
    groups,
    groupCount: groups.length,
    totalParts: parts.length,
    totalCuts: groups.reduce((sum, g) => sum + g.totalCuts, 0),
    criteria: [...criteria],
  };
}

/**
 * Merge compatible groups that share all criteria except grain (when grain is 'none').
 * Parts with grain='none' can be cut with any orientation, so they can join
 * the largest compatible group to reduce setup changes.
 * @param result - A grouping result to optimize.
 * @returns A new grouping result with merged groups.
 */
export function mergeGrainFlexible(result: GroupingResult): GroupingResult {
  if (!result.criteria.includes('grain')) return result;

  const otherCriteria = result.criteria.filter((c) => c !== 'grain');

  // Build a key without grain for matching
  const flexibleParts: CutPart[] = [];
  const fixedGroups: CutGroup[] = [];

  for (const group of result.groups) {
    if (group.grain === 'none') {
      flexibleParts.push(...group.parts);
    } else {
      fixedGroups.push(group);
    }
  }

  if (flexibleParts.length === 0) return result;

  // Assign each flexible part to the largest compatible fixed group
  for (const part of flexibleParts) {
    const partKey = buildGroupKey(part, otherCriteria);
    let bestGroup: CutGroup | undefined;
    let bestArea = -1;

    for (const group of fixedGroups) {
      const groupKey = buildGroupKey(group.parts[0], otherCriteria);
      if (groupKey === partKey && group.totalAreaMm2 > bestArea) {
        bestGroup = group;
        bestArea = group.totalAreaMm2;
      }
    }

    if (bestGroup) {
      bestGroup.parts.push(part);
      bestGroup.totalCuts += part.qty;
      bestGroup.totalAreaMm2 += part.width * part.length * part.qty;
    } else {
      // No compatible group — create a new one
      fixedGroups.push({
        key: buildGroupKey(part, result.criteria),
        label: buildGroupLabel(part, result.criteria),
        material: part.material,
        thickness: part.thickness,
        grain: part.grain,
        parts: [part],
        totalCuts: part.qty,
        totalAreaMm2: part.width * part.length * part.qty,
      });
    }
  }

  fixedGroups.sort((a, b) => b.totalAreaMm2 - a.totalAreaMm2);

  return {
    groups: fixedGroups,
    groupCount: fixedGroups.length,
    totalParts: result.totalParts,
    totalCuts: fixedGroups.reduce((sum, g) => sum + g.totalCuts, 0),
    criteria: result.criteria,
  };
}

/**
 * Estimate the number of tool changes required to process all groups sequentially.
 * Each group transition requires a blade/bit change or fence adjustment.
 * @param result - Grouping result.
 * @returns Estimated tool-change count.
 */
export function estimateToolChanges(result: GroupingResult): number {
  if (result.groupCount <= 1) return 0;
  // Each group transition = 1 tool change
  return result.groupCount - 1;
}
