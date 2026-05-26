import { describe, expect, it } from 'vitest';
import {
  computeSyncDelta,
  createSyncEntry,
  createSyncQueue,
  dequeueSyncEntry,
  enqueueSyncEntry,
  getSyncStatus,
  markSyncError,
  mergeSyncQueues,
} from '../../src/engine/project-sync';
import type { SyncQueue } from '../../src/engine/project-sync';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface Payload {
  name: string;
}

function entry(id: string, name: string, createdAt = 1000) {
  return createSyncEntry<Payload>(id, { name }, createdAt);
}

function queueWith(...ids: string[]): SyncQueue<Payload> {
  let q = createSyncQueue<Payload>();
  for (const id of ids) {
    q = enqueueSyncEntry(q, entry(id, `item-${id}`));
  }
  return q;
}

// ---------------------------------------------------------------------------
// createSyncEntry
// ---------------------------------------------------------------------------

describe('createSyncEntry', () => {
  it('creates entry with correct id, data and errorCount=0', () => {
    const e = entry('abc', 'desk', 5000);
    expect(e.meta.id).toBe('abc');
    expect(e.meta.createdAt).toBe(5000);
    expect(e.meta.errorCount).toBe(0);
    expect(e.data.name).toBe('desk');
  });

  it.each([
    ['empty id', '', 'desk', 1000],
    ['whitespace id', '   ', 'desk', 1000],
  ])('%s → RangeError', (_, id, name, ts) => {
    expect(() => createSyncEntry(id, { name }, ts)).toThrow(RangeError);
  });

  it('negative createdAt → RangeError', () => {
    expect(() => createSyncEntry('x', { name: 'x' }, -1)).toThrow(RangeError);
  });

  it('NaN createdAt → RangeError', () => {
    expect(() => createSyncEntry('x', { name: 'x' }, NaN)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// createSyncQueue
// ---------------------------------------------------------------------------

describe('createSyncQueue', () => {
  it('returns empty queue with status idle', () => {
    const q = createSyncQueue<Payload>();
    expect(q.entries).toHaveLength(0);
    expect(q.status).toBe('idle');
  });
});

// ---------------------------------------------------------------------------
// enqueueSyncEntry
// ---------------------------------------------------------------------------

describe('enqueueSyncEntry', () => {
  it('adds entry and sets status pending', () => {
    const q = enqueueSyncEntry(createSyncQueue<Payload>(), entry('a', 'desk'));
    expect(q.entries).toHaveLength(1);
    expect(q.status).toBe('pending');
  });

  it('preserves insertion order', () => {
    const q = queueWith('first', 'second', 'third');
    expect(q.entries.map((e) => e.meta.id)).toEqual(['first', 'second', 'third']);
  });

  it('duplicate id → RangeError', () => {
    const q = queueWith('dup');
    expect(() => enqueueSyncEntry(q, entry('dup', 'x'))).toThrow(RangeError);
  });

  it('does not mutate original queue', () => {
    const q0 = createSyncQueue<Payload>();
    enqueueSyncEntry(q0, entry('a', 'x'));
    expect(q0.entries).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// dequeueSyncEntry
// ---------------------------------------------------------------------------

describe('dequeueSyncEntry', () => {
  it('removes an existing entry', () => {
    const q = dequeueSyncEntry(queueWith('a', 'b'), 'a');
    expect(q.entries.map((e) => e.meta.id)).toEqual(['b']);
  });

  it('transitions to idle when queue empties', () => {
    const q = dequeueSyncEntry(queueWith('only'), 'only');
    expect(q.status).toBe('idle');
    expect(q.entries).toHaveLength(0);
  });

  it('returns same reference when id not found', () => {
    const q = queueWith('a');
    expect(dequeueSyncEntry(q, 'missing')).toBe(q);
  });

  it('empty id → RangeError', () => {
    expect(() => dequeueSyncEntry(queueWith('a'), '')).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// markSyncError
// ---------------------------------------------------------------------------

describe('markSyncError', () => {
  it('increments errorCount and sets status to error', () => {
    const q = markSyncError(queueWith('x'), 'x');
    expect(q.status).toBe('error');
    expect(q.entries[0].meta.errorCount).toBe(1);
  });

  it('accumulates error count across multiple calls', () => {
    let q = queueWith('x');
    q = markSyncError(markSyncError(q, 'x'), 'x');
    expect(q.entries[0].meta.errorCount).toBe(2);
  });

  it('returns same queue if id not found', () => {
    const q = queueWith('a');
    expect(markSyncError(q, 'missing')).toBe(q);
  });
});

// ---------------------------------------------------------------------------
// getSyncStatus
// ---------------------------------------------------------------------------

describe('getSyncStatus', () => {
  it.each([
    ['idle', createSyncQueue<Payload>()],
    ['pending', queueWith('a')],
  ] as const)('returns %s for corresponding queue', (expected, q) => {
    expect(getSyncStatus(q)).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// computeSyncDelta
// ---------------------------------------------------------------------------

describe('computeSyncDelta', () => {
  it('identifies local-only entries', () => {
    const local = queueWith('a', 'b');
    const remote = queueWith('b');
    const delta = computeSyncDelta(local, remote);
    expect(delta.localOnly.map((e) => e.meta.id)).toContain('a');
    expect(delta.remoteOnly).toHaveLength(0);
  });

  it('identifies remote-only entries', () => {
    const local = queueWith('a');
    const remote = queueWith('a', 'c');
    const delta = computeSyncDelta(local, remote);
    expect(delta.remoteOnly.map((e) => e.meta.id)).toContain('c');
  });

  it('identifies in-sync entries', () => {
    const e = entry('shared', 'cabinet', 2000);
    let local = createSyncQueue<Payload>();
    let remote = createSyncQueue<Payload>();
    local = enqueueSyncEntry(local, e);
    remote = enqueueSyncEntry(remote, e);
    const delta = computeSyncDelta(local, remote);
    expect(delta.inSync.map((e2) => e2.meta.id)).toContain('shared');
  });

  it('data divergence counts as local-only (needs push)', () => {
    const e1 = createSyncEntry<Payload>('x', { name: 'v1' }, 1000);
    const e2 = createSyncEntry<Payload>('x', { name: 'v2' }, 1000);
    const local = enqueueSyncEntry(createSyncQueue<Payload>(), e1);
    const remote = enqueueSyncEntry(createSyncQueue<Payload>(), e2);
    const delta = computeSyncDelta(local, remote);
    expect(delta.localOnly.map((e) => e.meta.id)).toContain('x');
    expect(delta.inSync).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// mergeSyncQueues
// ---------------------------------------------------------------------------

describe('mergeSyncQueues', () => {
  it('unions disjoint entries from both queues', () => {
    const merged = mergeSyncQueues(queueWith('a'), queueWith('b'));
    expect(merged.entries.map((e) => e.meta.id).sort()).toEqual(['a', 'b']);
    expect(merged.status).toBe('pending');
  });

  it('newer createdAt wins for same id', () => {
    const old = createSyncEntry<Payload>('x', { name: 'old' }, 1000);
    const newer = createSyncEntry<Payload>('x', { name: 'newer' }, 9999);
    const local = enqueueSyncEntry(createSyncQueue<Payload>(), old);
    const remote = enqueueSyncEntry(createSyncQueue<Payload>(), newer);
    const merged = mergeSyncQueues(local, remote);
    expect(merged.entries[0].data.name).toBe('newer');
    expect(merged.entries).toHaveLength(1);
  });

  it('returns idle queue when both inputs are empty', () => {
    const merged = mergeSyncQueues(createSyncQueue<Payload>(), createSyncQueue<Payload>());
    expect(merged.status).toBe('idle');
    expect(merged.entries).toHaveLength(0);
  });

  it('entries sorted by createdAt ascending', () => {
    const e1 = createSyncEntry<Payload>('z', { name: 'late' }, 3000);
    const e2 = createSyncEntry<Payload>('a', { name: 'early' }, 1000);
    const local = enqueueSyncEntry(createSyncQueue<Payload>(), e1);
    const remote = enqueueSyncEntry(createSyncQueue<Payload>(), e2);
    const merged = mergeSyncQueues(local, remote);
    expect(merged.entries[0].meta.id).toBe('a');
    expect(merged.entries[1].meta.id).toBe('z');
  });
});
