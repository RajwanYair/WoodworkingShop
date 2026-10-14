/**
 * Cloud project sync engine — Sprint 118 (Phase 27)
 *
 * Pure TypeScript: no DOM, no React, no network I/O.
 * Models a sync queue for IndexedDB ↔ remote exchange.
 * Actual network transport is injected at runtime; this module
 * handles only the data structures and merge logic.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Four-state sync lifecycle for a queue. */
export type SyncStatus = 'idle' | 'pending' | 'syncing' | 'error';

/** Metadata carried by every sync entry. */
export interface SyncMeta {
  /** Unique identifier for this entry (UUIDv4 or similar). */
  readonly id: string;
  /** Wall-clock creation time (ms since epoch). */
  readonly createdAt: number;
  /** Wall-clock of last successful remote sync, or undefined if never synced. */
  syncedAt?: number;
  /** Number of consecutive sync failures for this entry. */
  errorCount: number;
}

/** A typed entry wrapping any serialisable project data. */
export interface SyncEntry<T> {
  readonly meta: SyncMeta;
  readonly data: T;
}

/** An ordered queue of pending sync entries. */
export interface SyncQueue<T> {
  readonly entries: ReadonlyArray<SyncEntry<T>>;
  readonly status: SyncStatus;
  /** Wall-clock of the last successful queue flush. */
  lastFlushedAt?: number;
}

/** Describes what changed between a local and remote queue. */
export interface SyncDelta<T> {
  /** Entries present locally but not remotely (need to push). */
  readonly localOnly: ReadonlyArray<SyncEntry<T>>;
  /** Entries present remotely but not locally (need to pull). */
  readonly remoteOnly: ReadonlyArray<SyncEntry<T>>;
  /** Entries present in both with identical data (no action needed). */
  readonly inSync: ReadonlyArray<SyncEntry<T>>;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function assertNonEmptyId(id: string): void {
  if (!id || id.trim().length === 0) {
    throw new RangeError('SyncEntry id must be a non-empty string');
  }
}

function assertPositiveTimestamp(ts: number, label: string): void {
  if (!Number.isFinite(ts) || ts < 0) {
    throw new RangeError(`${label} must be a non-negative finite number, got ${ts}`);
  }
}

// ---------------------------------------------------------------------------
// createSyncEntry
// ---------------------------------------------------------------------------

/**
 * Wraps project data in a new {@link SyncEntry} with fresh metadata.
 *
 * @throws {RangeError} if id is empty or createdAt is negative / non-finite.
 */
export function createSyncEntry<T>(id: string, data: T, createdAt: number = Date.now()): SyncEntry<T> {
  assertNonEmptyId(id);
  assertPositiveTimestamp(createdAt, 'createdAt');
  return {
    meta: { id, createdAt, errorCount: 0 },
    data,
  };
}

// ---------------------------------------------------------------------------
// createSyncQueue
// ---------------------------------------------------------------------------

/** Creates an empty {@link SyncQueue} in `idle` state. */
export function createSyncQueue<T>(): SyncQueue<T> {
  return { entries: [], status: 'idle' };
}

// ---------------------------------------------------------------------------
// enqueueSyncEntry
// ---------------------------------------------------------------------------

/**
 * Appends an entry to the queue and transitions status to `pending`.
 * Does NOT mutate the original queue.
 *
 * @throws {RangeError} if an entry with the same id already exists.
 */
export function enqueueSyncEntry<T>(queue: SyncQueue<T>, entry: SyncEntry<T>): SyncQueue<T> {
  assertNonEmptyId(entry.meta.id);
  const duplicate = queue.entries.some((e) => e.meta.id === entry.meta.id);
  if (duplicate) {
    throw new RangeError(`SyncEntry with id "${entry.meta.id}" already exists in the queue`);
  }
  return {
    ...queue,
    entries: [...queue.entries, entry],
    status: 'pending',
  };
}

// ---------------------------------------------------------------------------
// dequeueSyncEntry
// ---------------------------------------------------------------------------

/**
 * Removes the entry with the given id from the queue.
 * If the queue becomes empty the status transitions back to `idle`.
 * Returns the updated queue (or the original if the id was not found).
 */
export function dequeueSyncEntry<T>(queue: SyncQueue<T>, id: string): SyncQueue<T> {
  assertNonEmptyId(id);
  const entries = queue.entries.filter((e) => e.meta.id !== id);
  if (entries.length === queue.entries.length) {
    return queue; // nothing removed — no change
  }
  return {
    ...queue,
    entries,
    status: entries.length === 0 ? 'idle' : queue.status,
  };
}

// ---------------------------------------------------------------------------
// markSyncError
// ---------------------------------------------------------------------------

/**
 * Increments `errorCount` on the specified entry and transitions the queue
 * status to `error`.  Returns queue unchanged if id is not found.
 */
export function markSyncError<T>(queue: SyncQueue<T>, id: string): SyncQueue<T> {
  assertNonEmptyId(id);
  const entries = queue.entries.map((e) => {
    if (e.meta.id !== id) return e;
    return { ...e, meta: { ...e.meta, errorCount: e.meta.errorCount + 1 } };
  });
  const changed = entries.some((e, i) => e !== queue.entries[i]);
  return changed ? { ...queue, entries, status: 'error' } : queue;
}

// ---------------------------------------------------------------------------
// getSyncStatus
// ---------------------------------------------------------------------------

/** Returns the current {@link SyncStatus} of the queue. */
export function getSyncStatus<T>(queue: SyncQueue<T>): SyncStatus {
  return queue.status;
}

// ---------------------------------------------------------------------------
// computeSyncDelta
// ---------------------------------------------------------------------------

/**
 * Computes what is different between a local queue and a remote snapshot.
 * Equality is determined by entry id AND a JSON-serialised value comparison
 * for the data payload.
 */
export function computeSyncDelta<T>(local: SyncQueue<T>, remote: SyncQueue<T>): SyncDelta<T> {
  const remoteById = new Map(remote.entries.map((e) => [e.meta.id, e]));
  const localById = new Map(local.entries.map((e) => [e.meta.id, e]));

  const localOnly: Array<SyncEntry<T>> = [];
  const inSync: Array<SyncEntry<T>> = [];

  for (const localEntry of local.entries) {
    const remoteEntry = remoteById.get(localEntry.meta.id);
    if (!remoteEntry) {
      localOnly.push(localEntry);
    } else if (JSON.stringify(localEntry.data) === JSON.stringify(remoteEntry.data)) {
      inSync.push(localEntry);
    } else {
      localOnly.push(localEntry); // data diverged — treat as local-only update
    }
  }

  const remoteOnly = remote.entries.filter((e) => !localById.has(e.meta.id));

  return { localOnly, remoteOnly, inSync };
}

// ---------------------------------------------------------------------------
// mergeSyncQueues
// ---------------------------------------------------------------------------

/**
 * Merges two queues: entries are unioned by id.
 * For conflicting ids the entry with the **newer createdAt** wins.
 * The result queue status is `pending` when any entries are present,
 * otherwise `idle`.
 */
export function mergeSyncQueues<T>(local: SyncQueue<T>, remote: SyncQueue<T>): SyncQueue<T> {
  const merged = new Map<string, SyncEntry<T>>();

  for (const entry of [...local.entries, ...remote.entries]) {
    const existing = merged.get(entry.meta.id);
    if (!existing || entry.meta.createdAt > existing.meta.createdAt) {
      merged.set(entry.meta.id, entry);
    }
  }

  const entries = Array.from(merged.values()).sort((a, b) => a.meta.createdAt - b.meta.createdAt);
  return {
    entries,
    status: entries.length > 0 ? 'pending' : 'idle',
  };
}
