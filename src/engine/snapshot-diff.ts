/**
 * Pure snapshot diff engine.
 *
 * Compares two ProjectSnapshot objects and returns a structured list of
 * per-cabinet config field deltas. Used by the SnapshotDiffModal UI component.
 */

import type { CabinetConfig } from './types';

export interface FieldDelta {
  field: string;
  /** Human-readable field label (English key for i18n lookup). */
  labelKey: string;
  oldValue: string;
  newValue: string;
}

export interface CabinetDiff {
  /** 0-based cabinet index. */
  index: number;
  cabinetName: string;
  deltas: FieldDelta[];
}

export interface SnapshotDiff {
  /** True when the two snapshots contain identical cabinet configurations. */
  identical: boolean;
  /** Cabinet-level diffs (only cabinets that changed are included). */
  cabinetDiffs: CabinetDiff[];
  /** Number of cabinets added in snapshotB relative to snapshotA. */
  addedCabinets: number;
  /** Number of cabinets removed in snapshotB relative to snapshotA. */
  removedCabinets: number;
}

// Fields we diff, with display label keys for i18n lookup.
const COMPARED_FIELDS: Array<{ field: keyof CabinetConfig; labelKey: string }> = [
  { field: 'furnitureType', labelKey: 'diff.furnitureType' },
  { field: 'width', labelKey: 'diff.width' },
  { field: 'height', labelKey: 'diff.height' },
  { field: 'depth', labelKey: 'diff.depth' },
  { field: 'shelfCount', labelKey: 'diff.shelfCount' },
  { field: 'carcassMaterial', labelKey: 'diff.carcassMaterial' },
  { field: 'backPanelMaterial', labelKey: 'diff.backPanelMaterial' },
  { field: 'doorCount', labelKey: 'diff.doorCount' },
  { field: 'doorStyle', labelKey: 'diff.doorStyle' },
  { field: 'drawerCount', labelKey: 'diff.drawerCount' },
  { field: 'kickHeight', labelKey: 'diff.kickHeight' },
  { field: 'handleStyle', labelKey: 'diff.handleStyle' },
  { field: 'edgeBanding', labelKey: 'diff.edgeBanding' },
  { field: 'hasBack', labelKey: 'diff.hasBack' },
];

function fmt(val: unknown): string {
  if (val === undefined || val === null) return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  return String(val);
}

function diffConfigs(a: CabinetConfig, b: CabinetConfig): FieldDelta[] {
  const deltas: FieldDelta[] = [];
  for (const { field, labelKey } of COMPARED_FIELDS) {
    const av = a[field];
    const bv = b[field];
    if (String(av ?? '') !== String(bv ?? '')) {
      deltas.push({ field, labelKey, oldValue: fmt(av), newValue: fmt(bv) });
    }
  }
  return deltas;
}

export interface SnapshotLike {
  cabinets: Array<{ name: string; config: CabinetConfig }>;
}

/**
 * Produce a structured diff between two snapshots.
 * snapshotA is treated as "before", snapshotB as "after".
 */
export function diffSnapshots(snapshotA: SnapshotLike, snapshotB: SnapshotLike): SnapshotDiff {
  const lenA = snapshotA.cabinets.length;
  const lenB = snapshotB.cabinets.length;
  const sharedCount = Math.min(lenA, lenB);

  const cabinetDiffs: CabinetDiff[] = [];

  for (let i = 0; i < sharedCount; i++) {
    const deltas = diffConfigs(snapshotA.cabinets[i].config, snapshotB.cabinets[i].config);
    if (deltas.length > 0) {
      cabinetDiffs.push({
        index: i,
        cabinetName: snapshotB.cabinets[i].name || `Cabinet ${i + 1}`,
        deltas,
      });
    }
  }

  const addedCabinets = Math.max(0, lenB - lenA);
  const removedCabinets = Math.max(0, lenA - lenB);

  return {
    identical: cabinetDiffs.length === 0 && addedCabinets === 0 && removedCabinets === 0,
    cabinetDiffs,
    addedCabinets,
    removedCabinets,
  };
}
