/**
 * IndexedDB persistence layer using idb-keyval.
 *
 * Replaces direct localStorage calls for project and saved-config data.
 * Provides a localStorage migration path: on first access of an empty
 * IndexedDB store the helper reads the old localStorage key and migrates
 * the data automatically (one-way, non-destructive — the old key is left
 * in place so a downgrade can still read it).
 *
 * Storage estimate helpers power the quota-monitoring badge (Phase 3, Sprint 2).
 */

import { get, set, del, keys, createStore } from 'idb-keyval';
import type { OffcutEntry } from '../engine/types';

// One custom idb-keyval store per logical namespace so keys don't collide.
// Each uses a distinct DB name so that idb-keyval's createStore can fire
// onupgradeneeded for every store — sharing one DB name only lets the first
// object store be created (subsequent opens see an already-versioned DB).
const projectStore = createStore('cabinet-planner-projects', 'projects');
const configStore = createStore('cabinet-planner-configs', 'saved-configs');

// ─── Projects ───────────────────────────────────────────────────────────────

const LS_PROJECTS_KEY = 'cabinet-planner-projects-v1';
const IDB_PROJECTS_KEY = 'all-projects';

/** Load all saved projects from IndexedDB, migrating from localStorage on first run. */
export async function idbLoadProjects<T>(): Promise<T[]> {
  let data = await get<T[]>(IDB_PROJECTS_KEY, projectStore);
  if (data === undefined) {
    // One-time migration from localStorage
    try {
      const raw = localStorage.getItem(LS_PROJECTS_KEY);
      data = raw ? (JSON.parse(raw) as T[]) : [];
    } catch {
      data = [];
    }
    await set(IDB_PROJECTS_KEY, data, projectStore);
  }
  return Array.isArray(data) ? data : [];
}

/** Persist all projects to IndexedDB. */
export async function idbSaveProjects<T>(projects: T[]): Promise<void> {
  await set(IDB_PROJECTS_KEY, projects, projectStore);
}

// ─── Saved configs ───────────────────────────────────────────────────────────

const LS_CONFIGS_KEY = 'cabinet-planner-saved-configs';
const IDB_CONFIGS_KEY = 'all-configs';

/** Load all saved configs from IndexedDB, migrating from localStorage on first run. */
export async function idbLoadConfigs<T>(): Promise<T[]> {
  let data = await get<T[]>(IDB_CONFIGS_KEY, configStore);
  if (data === undefined) {
    try {
      const raw = localStorage.getItem(LS_CONFIGS_KEY);
      data = raw ? (JSON.parse(raw) as T[]) : [];
    } catch {
      data = [];
    }
    await set(IDB_CONFIGS_KEY, data, configStore);
  }
  return Array.isArray(data) ? data : [];
}

/** Persist all saved configs to IndexedDB. */
export async function idbSaveConfigs<T>(configs: T[]): Promise<void> {
  await set(IDB_CONFIGS_KEY, configs, configStore);
}

// ─── Snapshots ────────────────────────────────────────────────────────────────

const LS_SNAPSHOTS_KEY = 'woodworkingshop:snapshots';
const IDB_SNAPSHOTS_KEY = 'all-snapshots';
const snapshotStore = createStore('cabinet-planner-snapshots', 'snapshots');

/** Load all snapshots from IndexedDB, migrating from localStorage on first run. */
export async function idbLoadSnapshots<T>(): Promise<T[]> {
  let data = await get<T[]>(IDB_SNAPSHOTS_KEY, snapshotStore);
  if (data === undefined) {
    try {
      const raw = localStorage.getItem(LS_SNAPSHOTS_KEY);
      data = raw ? (JSON.parse(raw) as T[]) : [];
    } catch {
      data = [];
    }
    await set(IDB_SNAPSHOTS_KEY, data, snapshotStore);
  }
  return Array.isArray(data) ? data : [];
}

/** Persist all snapshots to IndexedDB. */
export async function idbSaveSnapshots<T>(snapshots: T[]): Promise<void> {
  await set(IDB_SNAPSHOTS_KEY, snapshots, snapshotStore);
}

/** Delete a single snapshot by id field. */
export async function idbDeleteSnapshot<T extends { id: string }>(id: string): Promise<void> {
  const all = await idbLoadSnapshots<T>();
  await idbSaveSnapshots(all.filter((s) => s.id !== id));
}

// ─── Generic key/value helpers ────────────────────────────────────────────────

/** Read any value from the projects store (used for ad-hoc metadata). */
export async function idbGet<T>(key: string): Promise<T | undefined> {
  return get<T>(key, projectStore);
}

/** Write any value to the projects store. */
export async function idbSet<T>(key: string, value: T): Promise<void> {
  return set(key, value, projectStore);
}

/** Delete a key from the projects store. */
export async function idbDel(key: string): Promise<void> {
  return del(key, projectStore);
}

/** List all keys in the projects store (used for quota reporting). */
export async function idbKeys(): Promise<IDBValidKey[]> {
  return keys(projectStore);
}

// ─── Offcut catalog ───────────────────────────────────────────────────────────────────────────────

const offcutStore = createStore('cabinet-planner-offcuts', 'offcuts');
const IDB_OFFCUTS_KEY = 'all-offcuts';

/** Load all saved offcut catalog entries from IndexedDB. */
export async function idbLoadOffcuts(): Promise<OffcutEntry[]> {
  const data = await get<OffcutEntry[]>(IDB_OFFCUTS_KEY, offcutStore);
  return Array.isArray(data) ? data : [];
}

/** Append a new offcut entry to the catalog. */
export async function idbSaveOffcut(entry: OffcutEntry): Promise<void> {
  const all = await idbLoadOffcuts();
  await set(IDB_OFFCUTS_KEY, [...all, entry], offcutStore);
}

/** Remove an offcut catalog entry by id. */
export async function idbDeleteOffcut(id: string): Promise<void> {
  const all = await idbLoadOffcuts();
  await set(IDB_OFFCUTS_KEY, all.filter((e) => e.id !== id), offcutStore);
}

// ─── Storage quota estimate ──────────────────────────────────────────────────

export interface StorageEstimate {
  usedBytes: number;
  quotaBytes: number;
  usedKb: number;
  quotaMb: number;
  /** 0–100 % */
  percentUsed: number;
  /** true when usedBytes > 80% of quota */
  nearLimit: boolean;
}

/** Return a storage usage estimate using the Storage API when available. */
export async function getStorageEstimate(): Promise<StorageEstimate> {
  const fallback: StorageEstimate = {
    usedBytes: 0,
    quotaBytes: 0,
    usedKb: 0,
    quotaMb: 0,
    percentUsed: 0,
    nearLimit: false,
  };
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return fallback;
  try {
    const est = await navigator.storage.estimate();
    const used = est.usage ?? 0;
    const quota = est.quota ?? 0;
    const pct = quota > 0 ? Math.round((used / quota) * 100) : 0;
    return {
      usedBytes: used,
      quotaBytes: quota,
      usedKb: Math.round(used / 1024),
      quotaMb: Math.round(quota / (1024 * 1024)),
      percentUsed: pct,
      nearLimit: pct >= 80,
    };
  } catch {
    return fallback;
  }
}
