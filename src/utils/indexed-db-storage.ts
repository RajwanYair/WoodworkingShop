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

import { createIndexedDbAdapter, readLegacyArray } from '../platform/storage/index';
import type { OffcutEntry } from '../engine/core/types';
export { getStorageEstimate } from '../platform/storage/index';
export type { StorageEstimate } from '../platform/storage/index';

// One custom idb-keyval store per logical namespace so keys don't collide.
// Each uses a distinct DB name so that idb-keyval's createStore can fire
// onupgradeneeded for every store — sharing one DB name only lets the first
// object store be created (subsequent opens see an already-versioned DB).
const projectStore = createIndexedDbAdapter('cabinet-planner-projects', 'projects');
const configStore = createIndexedDbAdapter('cabinet-planner-configs', 'saved-configs');

// ─── Projects ───────────────────────────────────────────────────────────────

const LS_PROJECTS_KEY = 'cabinet-planner-projects-v1';
const IDB_PROJECTS_KEY = 'all-projects';

function requireArray<T>(value: unknown, message: string): T[] {
  if (!Array.isArray(value)) throw new TypeError(message);
  return value as T[];
}

/** Load all saved projects from IndexedDB, migrating from localStorage on first run. */
export async function idbLoadProjects<T>(): Promise<T[]> {
  let data: unknown = await projectStore.get<unknown>(IDB_PROJECTS_KEY);
  if (data === undefined) {
    // One-time migration from localStorage
    data = readLegacyArray<T>(LS_PROJECTS_KEY, 'project');
    await projectStore.set(IDB_PROJECTS_KEY, data);
  }
  return requireArray<T>(data, 'Invalid saved project storage: expected an array');
}

/** Persist all projects to IndexedDB. */
export async function idbSaveProjects<T>(projects: T[]): Promise<void> {
  await projectStore.set(IDB_PROJECTS_KEY, projects);
}

// ─── Saved configs ───────────────────────────────────────────────────────────

const LS_CONFIGS_KEY = 'cabinet-planner-saved-configs';
const IDB_CONFIGS_KEY = 'all-configs';

/** Load all saved configs from IndexedDB, migrating from localStorage on first run. */
export async function idbLoadConfigs<T>(): Promise<T[]> {
  let data: unknown = await configStore.get<unknown>(IDB_CONFIGS_KEY);
  if (data === undefined) {
    data = readLegacyArray<T>(LS_CONFIGS_KEY, 'saved-config');
    await configStore.set(IDB_CONFIGS_KEY, data);
  }
  return requireArray<T>(data, 'Invalid saved config storage: expected an array');
}

/** Persist all saved configs to IndexedDB. */
export async function idbSaveConfigs<T>(configs: T[]): Promise<void> {
  await configStore.set(IDB_CONFIGS_KEY, configs);
}

// ─── Snapshots ────────────────────────────────────────────────────────────────

const LS_SNAPSHOTS_KEY = 'woodworkingshop:snapshots';
const IDB_SNAPSHOTS_KEY = 'all-snapshots';
const snapshotStore = createIndexedDbAdapter('cabinet-planner-snapshots', 'snapshots');

/** Load all snapshots from IndexedDB, migrating from localStorage on first run. */
export async function idbLoadSnapshots<T>(): Promise<T[]> {
  let data: unknown = await snapshotStore.get<unknown>(IDB_SNAPSHOTS_KEY);
  if (data === undefined) {
    data = readLegacyArray<T>(LS_SNAPSHOTS_KEY, 'snapshot');
    await snapshotStore.set(IDB_SNAPSHOTS_KEY, data);
  }
  return requireArray<T>(data, 'Invalid saved snapshot storage: expected an array');
}

/** Persist all snapshots to IndexedDB. */
export async function idbSaveSnapshots<T>(snapshots: T[]): Promise<void> {
  await snapshotStore.set(IDB_SNAPSHOTS_KEY, snapshots);
}

/** Delete a single snapshot by id field. */
export async function idbDeleteSnapshot<T extends { id: string }>(id: string): Promise<void> {
  const all = await idbLoadSnapshots<T>();
  await idbSaveSnapshots(all.filter((s) => s.id !== id));
}

// ─── Generic key/value helpers ────────────────────────────────────────────────

/** Read any value from the projects store (used for ad-hoc metadata). */
export async function idbGet<T>(key: string): Promise<T | undefined> {
  return projectStore.get<T>(key);
}

/** Write any value to the projects store. */
export async function idbSet<T>(key: string, value: T): Promise<void> {
  return projectStore.set(key, value);
}

/** Delete a key from the projects store. */
export async function idbDel(key: string): Promise<void> {
  return projectStore.delete(key);
}

/** List all keys in the projects store (used for quota reporting). */
export async function idbKeys(): Promise<IDBValidKey[]> {
  return projectStore.keys();
}

// ─── Offcut catalog ───────────────────────────────────────────────────────────────────────────────

const offcutStore = createIndexedDbAdapter('cabinet-planner-offcuts', 'offcuts');
const IDB_OFFCUTS_KEY = 'all-offcuts';

/** Load all saved offcut catalog entries from IndexedDB. */
export async function idbLoadOffcuts(): Promise<OffcutEntry[]> {
  const data = await offcutStore.get<OffcutEntry[]>(IDB_OFFCUTS_KEY);
  return Array.isArray(data) ? data : [];
}

/** Append a new offcut entry to the catalog. */
export async function idbSaveOffcut(entry: OffcutEntry): Promise<void> {
  const all = await idbLoadOffcuts();
  await offcutStore.set(IDB_OFFCUTS_KEY, [...all, entry]);
}

/** Remove an offcut catalog entry by id. */
export async function idbDeleteOffcut(id: string): Promise<void> {
  const all = await idbLoadOffcuts();
  await offcutStore.set(
    IDB_OFFCUTS_KEY,
    all.filter((e) => e.id !== id),
  );
}

// ─── Storage quota estimate ──────────────────────────────────────────────────

// ── Phase 13 / Sprint 6 — URL short-ref store ────────────────────────────────
// When a serialised config exceeds the safe URL length (~2 KB), the app stores
// the base64-encoded config here under a short random key and shares `?ref=<key>`
// instead of embedding the full config in the URL.  Lookups fall back gracefully
// to an empty config when the ref is not found (e.g. on a different device).

const urlRefStore = createIndexedDbAdapter('cabinet-planner-url-refs', 'url-refs');

/**
 * Persist a base64-encoded config string under `key` in the URL-ref store.
 * The key should be a short random string generated by `generateShareRefKey()`.
 */
export async function storeUrlRef(key: string, compressedConfig: string): Promise<void> {
  await urlRefStore.set(key, compressedConfig);
}

/**
 * Retrieve a previously stored base64-encoded config string by `key`.
 * Returns `undefined` when the ref is not present (cleared storage, other device).
 */
export async function loadUrlRef(key: string): Promise<string | undefined> {
  return urlRefStore.get<string>(key);
}

/** Remove a URL ref from storage (e.g. after the share link is superseded). */
export async function deleteUrlRef(key: string): Promise<void> {
  await urlRefStore.delete(key);
}
