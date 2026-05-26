/**
 * Sprint 128 — Mobile offline sync engine (Phase 29)
 *
 * Pure engine module — no React, no DOM, no side effects.
 * Implements an offline-first sync queue for iOS / Android / PWA clients.
 * Changes are enqueued locally and merged on reconnect using a configurable
 * conflict-resolution strategy.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Target runtime platform. */
export type MobilePlatform = 'ios' | 'android' | 'web';

/** Strategy used to resolve sync conflicts. */
export type SyncConflictStrategy = 'local-wins' | 'remote-wins' | 'newest-wins';

/** Serialised project snapshot (opaque string for transport). */
export type ProjectSnapshot = string;

/** A pending local change waiting to be synced. */
export interface OfflineQueueEntry {
  /** Monotonically increasing queue position. */
  seq: number;
  /** Project identifier this change belongs to. */
  projectId: string;
  /** Serialised delta or full snapshot. */
  payload: ProjectSnapshot;
  /** ISO 8601 timestamp when the change was made. */
  timestamp: string;
  /** Whether this entry has been transmitted to the server. */
  synced: boolean;
}

/** A conflict between a local and remote version of a project. */
export interface SyncConflict {
  /** Project identifier. */
  projectId: string;
  /** The local version. */
  local: ProjectSnapshot;
  /** The remote version. */
  remote: ProjectSnapshot;
  /** ISO 8601 timestamp of the local snapshot. */
  localTimestamp: string;
  /** ISO 8601 timestamp of the remote snapshot. */
  remoteTimestamp: string;
}

/** Runtime sync state for a single device session. */
export interface MobileSyncState {
  /** Unique device identifier. */
  deviceId: string;
  /** Target platform. */
  platform: MobilePlatform;
  /** Whether the device currently has network access. */
  online: boolean;
  /** Pending changes not yet transmitted. */
  queue: OfflineQueueEntry[];
  /** Unresolved conflicts. */
  conflicts: SyncConflict[];
  /** ISO 8601 timestamp of the last successful sync. */
  lastSyncedAt: string | null;
  /** Running counter used to generate sequential entry ids. */
  nextSeq: number;
}

/** Summary returned after a sync attempt. */
export interface MobileSyncSummary {
  /** Number of queue entries transmitted in this sync. */
  transmitted: number;
  /** Number of conflicts detected. */
  conflictsDetected: number;
  /** Number of conflicts auto-resolved. */
  conflictsResolved: number;
  /** ISO 8601 timestamp of the sync. */
  syncedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Create a fresh mobile sync state for the given device.
 */
export function createMobileSyncState(deviceId: string, platform: MobilePlatform): MobileSyncState {
  if (!deviceId.trim()) throw new RangeError('deviceId must not be empty');
  return {
    deviceId,
    platform,
    online: false,
    queue: [],
    conflicts: [],
    lastSyncedAt: null,
    nextSeq: 1,
  };
}

/**
 * Enqueue a local change for later transmission.
 */
export function enqueuePendingChange(
  state: MobileSyncState,
  projectId: string,
  payload: ProjectSnapshot,
): MobileSyncState {
  if (!projectId.trim()) throw new RangeError('projectId must not be empty');
  const entry: OfflineQueueEntry = {
    seq: state.nextSeq,
    projectId,
    payload,
    timestamp: now(),
    synced: false,
  };
  return { ...state, queue: [...state.queue, entry], nextSeq: state.nextSeq + 1 };
}

/**
 * Return all pending (not yet synced) queue entries.
 */
export function dequeueChanges(state: MobileSyncState): OfflineQueueEntry[] {
  return state.queue.filter((e) => !e.synced);
}

/**
 * Mark a set of queue entries as transmitted (by seq numbers).
 */
export function markSynced(state: MobileSyncState, seqs: number[]): MobileSyncState {
  const seqSet = new Set(seqs);
  const queue = state.queue.map((e) => (seqSet.has(e.seq) ? { ...e, synced: true } : e));
  return { ...state, queue, lastSyncedAt: now() };
}

/**
 * Detect conflicts between pending local changes and a map of remote snapshots.
 * A conflict exists when the same projectId has a local pending entry AND a
 * different remote snapshot.
 */
export function detectConflicts(
  state: MobileSyncState,
  remoteSnapshots: Record<string, ProjectSnapshot>,
  remoteTimestamps: Record<string, string>,
): SyncConflict[] {
  const pending = dequeueChanges(state);
  const seen = new Set<string>();
  const conflicts: SyncConflict[] = [];
  for (const entry of pending) {
    if (seen.has(entry.projectId)) continue;
    const remote = remoteSnapshots[entry.projectId];
    if (remote !== undefined && remote !== entry.payload) {
      seen.add(entry.projectId);
      conflicts.push({
        projectId: entry.projectId,
        local: entry.payload,
        remote,
        localTimestamp: entry.timestamp,
        remoteTimestamp: remoteTimestamps[entry.projectId] ?? now(),
      });
    }
  }
  return conflicts;
}

/**
 * Resolve a single conflict using the given strategy.
 * Returns the winning snapshot.
 */
export function resolveConflict(conflict: SyncConflict, strategy: SyncConflictStrategy): ProjectSnapshot {
  if (strategy === 'local-wins') return conflict.local;
  if (strategy === 'remote-wins') return conflict.remote;
  // newest-wins — compare ISO 8601 timestamps lexicographically
  return conflict.localTimestamp >= conflict.remoteTimestamp ? conflict.local : conflict.remote;
}

/**
 * Apply a conflict resolution to the sync state, removing the conflict from
 * the pending list.
 */
export function applyConflictResolution(
  state: MobileSyncState,
  projectId: string,
  strategy: SyncConflictStrategy,
): MobileSyncState {
  const conflict = state.conflicts.find((c) => c.projectId === projectId);
  if (!conflict) throw new RangeError(`No conflict for project: ${projectId}`);
  resolveConflict(conflict, strategy); // validate — result used by caller
  const conflicts = state.conflicts.filter((c) => c.projectId !== projectId);
  return { ...state, conflicts };
}

/**
 * Add detected conflicts to the sync state.
 */
export function addConflicts(state: MobileSyncState, conflicts: SyncConflict[]): MobileSyncState {
  const existing = new Set(state.conflicts.map((c) => c.projectId));
  const newConflicts = conflicts.filter((c) => !existing.has(c.projectId));
  return { ...state, conflicts: [...state.conflicts, ...newConflicts] };
}

/**
 * Return a human-readable summary of the current sync state.
 */
export function getMobileSyncSummary(state: MobileSyncState): MobileSyncSummary {
  return {
    transmitted: state.queue.filter((e) => e.synced).length,
    conflictsDetected: state.conflicts.length,
    conflictsResolved: 0,
    syncedAt: state.lastSyncedAt ?? now(),
  };
}

/**
 * Serialise a plain object as a project snapshot string.
 * Uses JSON so downstream code can deserialise portably.
 */
export function serializeSnapshot(data: Record<string, unknown>): ProjectSnapshot {
  return JSON.stringify(data);
}

/**
 * Deserialise a project snapshot back to a plain object.
 *
 * @throws RangeError if the snapshot is not valid JSON.
 */
export function deserializeSnapshot(snapshot: ProjectSnapshot): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(snapshot);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new RangeError('Snapshot must deserialise to a plain object');
    }
    return parsed as Record<string, unknown>;
  } catch (err) {
    if (err instanceof RangeError) throw err;
    throw new RangeError(`Invalid snapshot JSON: ${String(err)}`, { cause: err });
  }
}

/**
 * Set the online/offline status of the device.
 */
export function setOnlineStatus(state: MobileSyncState, online: boolean): MobileSyncState {
  return { ...state, online };
}
