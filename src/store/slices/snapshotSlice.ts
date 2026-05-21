/**
 * Phase 11 — Snapshot Slice
 *
 * Owns project-snapshot history: save, restore, delete.  Restoration delegates
 * back to the root store via the provided `onRestore` callback so the
 * optimizer/assembly workers are triggered through the same path as any other
 * cabinet-change action (single source of truth for scheduling).
 */
import type { CabinetEntry } from '../cabinet-store';
import { idbSaveSnapshots } from '../../utils/indexed-db-storage';

// ─── Persistence helpers ──────────────────────────────────────────────────────

const SNAPSHOTS_KEY = 'woodworkingshop:snapshots';

export function loadSnapshotsFromStorage(): ProjectSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SNAPSHOTS_KEY);
    return raw ? (JSON.parse(raw) as ProjectSnapshot[]) : [];
  } catch {
    return [];
  }
}

export function persistSnapshots(snaps: ProjectSnapshot[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snaps));
  } catch {
    /* quota exceeded — ignore */
  }
  void idbSaveSnapshots<ProjectSnapshot>(snaps);
}

// ─── Public types ─────────────────────────────────────────────────────────────

/** An immutable point-in-time copy of the whole project. */
export interface ProjectSnapshot {
  id: string;
  name: string;
  cabinets: CabinetEntry[];
  timestamp: string; // ISO 8601
}

// ─── Slice type ───────────────────────────────────────────────────────────────

export type SnapshotSlice = {
  // State
  snapshots: ProjectSnapshot[];

  // Actions
  saveSnapshot: (name: string) => void;
  restoreSnapshot: (id: string) => void;
  deleteSnapshot: (id: string) => void;
};

// ─── Slice creator ────────────────────────────────────────────────────────────

type SnapshotSet = (partial: Partial<SnapshotSlice> | ((s: SnapshotSlice) => Partial<SnapshotSlice>)) => void;
type SnapshotGet = () => SnapshotSlice;

/**
 * Create the snapshot slice.
 * `getCurrentCabinets` supplies the live cabinet list at save time.
 * `onRestore` triggers worker scheduling in the root store when a snapshot is restored.
 */
export function createSnapshotSlice(
  set: SnapshotSet,
  get: SnapshotGet,
  initialSnapshots: ProjectSnapshot[],
  getCurrentCabinets: () => CabinetEntry[],
  onRestore: (cabinets: CabinetEntry[]) => void,
): SnapshotSlice {
  return {
    // ── Initial state ──
    snapshots: initialSnapshots,

    // ── Actions ──
    saveSnapshot: (name) =>
      set((state) => {
        const now = new Date();
        const autoName = `Snapshot ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const snap: ProjectSnapshot = {
          id: `snap-${Date.now()}`,
          name: name.trim() || autoName,
          cabinets: getCurrentCabinets(),
          timestamp: now.toISOString(),
        };
        const snapshots = [...state.snapshots, snap];
        persistSnapshots(snapshots);
        return { snapshots };
      }),

    restoreSnapshot: (id) => {
      const snap = get().snapshots.find((s) => s.id === id);
      if (!snap) return;
      onRestore(snap.cabinets);
    },

    deleteSnapshot: (id) =>
      set((state) => {
        const snapshots = state.snapshots.filter((s) => s.id !== id);
        persistSnapshots(snapshots);
        return { snapshots };
      }),
  };
}
