import { describe, it, expect } from 'vitest';
import {
  createMobileSyncState,
  enqueuePendingChange,
  dequeueChanges,
  markSynced,
  detectConflicts,
  resolveConflict,
  applyConflictResolution,
  addConflicts,
  getMobileSyncSummary,
  serializeSnapshot,
  deserializeSnapshot,
  setOnlineStatus,
} from '../../src/engine/mobile-sync';
import type { SyncConflict } from '../../src/engine/mobile-sync';

// ─── createMobileSyncState ────────────────────────────────────────────────────

describe('createMobileSyncState', () => {
  it('returns initial state with empty queue and conflicts', () => {
    const state = createMobileSyncState('device-1', 'ios');
    expect(state.deviceId).toBe('device-1');
    expect(state.platform).toBe('ios');
    expect(state.online).toBe(false);
    expect(state.queue).toHaveLength(0);
    expect(state.conflicts).toHaveLength(0);
    expect(state.lastSyncedAt).toBeNull();
    expect(state.nextSeq).toBe(1);
  });

  it('throws RangeError for empty deviceId', () => {
    expect(() => createMobileSyncState('', 'android')).toThrow(RangeError);
  });

  it.each([['ios'], ['android'], ['web']] as const)('accepts platform %s', (platform) => {
    const state = createMobileSyncState('d1', platform);
    expect(state.platform).toBe(platform);
  });
});

// ─── enqueuePendingChange ─────────────────────────────────────────────────────

describe('enqueuePendingChange', () => {
  it('adds an entry to the queue with incremented seq', () => {
    let state = createMobileSyncState('d1', 'web');
    state = enqueuePendingChange(state, 'proj-1', 'payload-a');
    expect(state.queue).toHaveLength(1);
    expect(state.queue[0]?.seq).toBe(1);
    expect(state.nextSeq).toBe(2);
  });

  it('increments seq across multiple enqueues', () => {
    let state = createMobileSyncState('d1', 'web');
    state = enqueuePendingChange(state, 'proj-1', 'a');
    state = enqueuePendingChange(state, 'proj-1', 'b');
    expect(state.queue[1]?.seq).toBe(2);
  });

  it('throws RangeError for empty projectId', () => {
    const state = createMobileSyncState('d1', 'web');
    expect(() => enqueuePendingChange(state, '', 'payload')).toThrow(RangeError);
  });

  it('marks newly enqueued entries as not synced', () => {
    let state = createMobileSyncState('d1', 'web');
    state = enqueuePendingChange(state, 'proj-1', 'p');
    expect(state.queue[0]?.synced).toBe(false);
  });
});

// ─── dequeueChanges ───────────────────────────────────────────────────────────

describe('dequeueChanges', () => {
  it('returns only un-synced entries', () => {
    let state = createMobileSyncState('d1', 'web');
    state = enqueuePendingChange(state, 'proj-1', 'a');
    state = enqueuePendingChange(state, 'proj-2', 'b');
    state = markSynced(state, [1]);
    expect(dequeueChanges(state)).toHaveLength(1);
    expect(dequeueChanges(state)[0]?.seq).toBe(2);
  });
});

// ─── markSynced ───────────────────────────────────────────────────────────────

describe('markSynced', () => {
  it('marks specified seqs as synced and updates lastSyncedAt', () => {
    let state = createMobileSyncState('d1', 'web');
    state = enqueuePendingChange(state, 'proj-1', 'a');
    state = markSynced(state, [1]);
    expect(state.queue[0]?.synced).toBe(true);
    expect(state.lastSyncedAt).not.toBeNull();
  });

  it('leaves unspecified entries unsynced', () => {
    let state = createMobileSyncState('d1', 'web');
    state = enqueuePendingChange(state, 'p1', 'a');
    state = enqueuePendingChange(state, 'p2', 'b');
    state = markSynced(state, [1]);
    expect(state.queue[1]?.synced).toBe(false);
  });
});

// ─── detectConflicts ──────────────────────────────────────────────────────────

describe('detectConflicts', () => {
  it('detects conflict when local and remote payloads differ', () => {
    let state = createMobileSyncState('d1', 'web');
    state = enqueuePendingChange(state, 'proj-1', 'local-v2');
    const conflicts = detectConflicts(state, { 'proj-1': 'remote-v3' }, { 'proj-1': '2026-01-02T00:00:00Z' });
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.projectId).toBe('proj-1');
  });

  it('returns no conflicts when local and remote match', () => {
    let state = createMobileSyncState('d1', 'web');
    state = enqueuePendingChange(state, 'proj-1', 'same');
    const conflicts = detectConflicts(state, { 'proj-1': 'same' }, {});
    expect(conflicts).toHaveLength(0);
  });

  it('ignores projects not in remote snapshots', () => {
    let state = createMobileSyncState('d1', 'web');
    state = enqueuePendingChange(state, 'proj-1', 'local');
    const conflicts = detectConflicts(state, {}, {});
    expect(conflicts).toHaveLength(0);
  });

  it('deduplicates conflicts for the same projectId', () => {
    let state = createMobileSyncState('d1', 'web');
    state = enqueuePendingChange(state, 'proj-1', 'v1');
    state = enqueuePendingChange(state, 'proj-1', 'v2');
    const conflicts = detectConflicts(state, { 'proj-1': 'remote' }, { 'proj-1': '2026-01-02T00:00:00Z' });
    expect(conflicts).toHaveLength(1);
  });
});

// ─── resolveConflict ──────────────────────────────────────────────────────────

describe('resolveConflict', () => {
  const conflict: SyncConflict = {
    projectId: 'p1',
    local: 'local-payload',
    remote: 'remote-payload',
    localTimestamp: '2026-01-02T10:00:00Z',
    remoteTimestamp: '2026-01-01T10:00:00Z',
  };

  it.each([
    ['local-wins', 'local-payload'],
    ['remote-wins', 'remote-payload'],
    ['newest-wins', 'local-payload'], // local is newer
  ] as const)('strategy %s returns %s', (strategy, expected) => {
    expect(resolveConflict(conflict, strategy)).toBe(expected);
  });

  it('newest-wins picks remote when remote is newer', () => {
    const c: SyncConflict = {
      ...conflict,
      localTimestamp: '2026-01-01T00:00:00Z',
      remoteTimestamp: '2026-01-02T00:00:00Z',
    };
    expect(resolveConflict(c, 'newest-wins')).toBe('remote-payload');
  });
});

// ─── applyConflictResolution ──────────────────────────────────────────────────

describe('applyConflictResolution', () => {
  it('removes the conflict from state after resolution', () => {
    let state = createMobileSyncState('d1', 'web');
    state = enqueuePendingChange(state, 'proj-1', 'local');
    const conflict: SyncConflict = {
      projectId: 'proj-1',
      local: 'local',
      remote: 'remote',
      localTimestamp: '2026-01-01T00:00:00Z',
      remoteTimestamp: '2026-01-01T00:00:00Z',
    };
    state = addConflicts(state, [conflict]);
    state = applyConflictResolution(state, 'proj-1', 'local-wins');
    expect(state.conflicts).toHaveLength(0);
  });

  it('throws RangeError for unknown projectId', () => {
    const state = createMobileSyncState('d1', 'web');
    expect(() => applyConflictResolution(state, 'ghost', 'local-wins')).toThrow(RangeError);
  });
});

// ─── getMobileSyncSummary ─────────────────────────────────────────────────────

describe('getMobileSyncSummary', () => {
  it('reports transmitted and conflict counts', () => {
    let state = createMobileSyncState('d1', 'web');
    state = enqueuePendingChange(state, 'p1', 'a');
    state = enqueuePendingChange(state, 'p2', 'b');
    state = markSynced(state, [1]);
    const summary = getMobileSyncSummary(state);
    expect(summary.transmitted).toBe(1);
    expect(summary.conflictsDetected).toBe(0);
  });
});

// ─── serializeSnapshot / deserializeSnapshot ──────────────────────────────────

describe('serializeSnapshot / deserializeSnapshot', () => {
  it('round-trips a plain object', () => {
    const data = { width: 800, height: 720, material: 'plywood' };
    const snap = serializeSnapshot(data);
    expect(typeof snap).toBe('string');
    expect(deserializeSnapshot(snap)).toEqual(data);
  });

  it('throws RangeError for invalid JSON', () => {
    expect(() => deserializeSnapshot('not-json')).toThrow(RangeError);
  });

  it('throws RangeError when snapshot is an array', () => {
    expect(() => deserializeSnapshot('[1,2,3]')).toThrow(RangeError);
  });
});

// ─── setOnlineStatus ──────────────────────────────────────────────────────────

describe('setOnlineStatus', () => {
  it('updates online flag', () => {
    let state = createMobileSyncState('d1', 'ios');
    state = setOnlineStatus(state, true);
    expect(state.online).toBe(true);
    state = setOnlineStatus(state, false);
    expect(state.online).toBe(false);
  });
});
