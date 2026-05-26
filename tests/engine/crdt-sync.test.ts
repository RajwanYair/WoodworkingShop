import { describe, expect, it } from 'vitest';
import {
  applyOperation,
  createCollabState,
  createOperation,
  evictStalePeers,
  incrementClock,
  mergeStates,
  readValues,
} from '../../src/engine/crdt-sync';
import type { CrdtOperation, CrdtState } from '../../src/engine/crdt-sync';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeState(peerId = 'alice', displayName = 'Alice') {
  return createCollabState(peerId, displayName);
}

function makeOp(peerId: string, counter: number, field: string, value: unknown): CrdtOperation {
  return {
    id: `${peerId}:${counter}`,
    stamp: { counter, peerId },
    field,
    value,
  };
}

// ---------------------------------------------------------------------------
// createCollabState
// ---------------------------------------------------------------------------

describe('createCollabState', () => {
  it('creates state with local peer and counter=0', () => {
    const s = makeState('alice', 'Alice');
    expect(s.localPeerId).toBe('alice');
    expect(s.localCounter).toBe(0);
    expect(s.peers['alice']).toBeDefined();
    expect(s.peers['alice'].displayName).toBe('Alice');
    expect(s.registers).toEqual({});
  });

  it('throws RangeError for empty peerId', () => {
    expect(() => createCollabState('', 'Alice')).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// incrementClock
// ---------------------------------------------------------------------------

describe('incrementClock', () => {
  it('increments localCounter by 1', () => {
    const s = makeState();
    const s2 = incrementClock(s);
    expect(s2.localCounter).toBe(1);
  });

  it('updates the peer entry counter', () => {
    const s = incrementClock(makeState('alice'));
    expect(s.peers['alice'].counter).toBe(1);
  });

  it('does not mutate original state', () => {
    const s = makeState();
    incrementClock(s);
    expect(s.localCounter).toBe(0);
  });

  it('is idempotent-by-accumulation: 3 increments → counter=3', () => {
    let s = makeState();
    s = incrementClock(incrementClock(incrementClock(s)));
    expect(s.localCounter).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// createOperation
// ---------------------------------------------------------------------------

describe('createOperation', () => {
  it('creates operation with correct id and stamp', () => {
    let s = makeState('alice');
    s = incrementClock(s);
    const op = createOperation(s, 'config.width', 800);
    expect(op.id).toBe('alice:1');
    expect(op.stamp.counter).toBe(1);
    expect(op.stamp.peerId).toBe('alice');
    expect(op.field).toBe('config.width');
    expect(op.value).toBe(800);
  });

  it('throws RangeError for empty field', () => {
    const s = incrementClock(makeState('alice'));
    expect(() => createOperation(s, '', 800)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// applyOperation
// ---------------------------------------------------------------------------

describe('applyOperation', () => {
  it('stores a new operation in registers', () => {
    const s = applyOperation(makeState('alice'), makeOp('bob', 1, 'config.width', 800));
    expect(s.registers['config.width']?.op.value).toBe(800);
  });

  it('newer stamp wins over older stamp (LWW)', () => {
    let s = makeState('alice');
    s = applyOperation(s, makeOp('bob', 1, 'config.width', 800));
    s = applyOperation(s, makeOp('bob', 2, 'config.width', 900));
    expect(s.registers['config.width']?.op.value).toBe(900);
  });

  it('older stamp does NOT overwrite newer (LWW)', () => {
    let s = makeState('alice');
    s = applyOperation(s, makeOp('bob', 5, 'config.width', 999));
    s = applyOperation(s, makeOp('bob', 2, 'config.width', 100));
    expect(s.registers['config.width']?.op.value).toBe(999);
  });

  it('tie-break: higher peerId wins when counter is equal', () => {
    let s = makeState('alice');
    s = applyOperation(s, makeOp('alice', 3, 'config.width', 100));
    s = applyOperation(s, makeOp('bob', 3, 'config.width', 200)); // 'bob' > 'alice'
    expect(s.registers['config.width']?.op.value).toBe(200);
  });

  it('advances localCounter following Lamport rule', () => {
    const s = applyOperation(makeState('alice'), makeOp('bob', 10, 'x', 1));
    expect(s.localCounter).toBe(11); // max(0, 10) + 1
  });

  it('adds unknown peer to presence map', () => {
    const s = applyOperation(makeState('alice'), makeOp('carol', 1, 'x', 1));
    expect(s.peers['carol']).toBeDefined();
    expect(s.peers['carol'].peerId).toBe('carol');
  });

  it('does not mutate original state', () => {
    const s = makeState('alice');
    applyOperation(s, makeOp('bob', 1, 'x', 1));
    expect(s.registers).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// mergeStates
// ---------------------------------------------------------------------------

describe('mergeStates', () => {
  it('union of disjoint fields', () => {
    const a: CrdtState = { x: { op: makeOp('alice', 1, 'x', 10) } };
    const b: CrdtState = { y: { op: makeOp('bob', 1, 'y', 20) } };
    const m = mergeStates(a, b);
    expect(m['x']?.op.value).toBe(10);
    expect(m['y']?.op.value).toBe(20);
  });

  it('newer stamp wins for conflicting field', () => {
    const a: CrdtState = { x: { op: makeOp('alice', 5, 'x', 50) } };
    const b: CrdtState = { x: { op: makeOp('bob', 3, 'x', 30) } };
    const m = mergeStates(a, b);
    expect(m['x']?.op.value).toBe(50); // alice counter=5 > bob counter=3
  });

  it('b wins when b stamp is newer', () => {
    const a: CrdtState = { x: { op: makeOp('alice', 1, 'x', 10) } };
    const b: CrdtState = { x: { op: makeOp('bob', 9, 'x', 90) } };
    const m = mergeStates(a, b);
    expect(m['x']?.op.value).toBe(90);
  });

  it('is commutative: merge(a,b) == merge(b,a) values', () => {
    const a: CrdtState = { x: { op: makeOp('alice', 2, 'x', 'A') } };
    const b: CrdtState = { x: { op: makeOp('bob', 4, 'x', 'B') } };
    expect(mergeStates(a, b)['x']?.op.value).toBe(mergeStates(b, a)['x']?.op.value);
  });
});

// ---------------------------------------------------------------------------
// readValues
// ---------------------------------------------------------------------------

describe('readValues', () => {
  it('extracts field values from registers', () => {
    const state: CrdtState = {
      'config.width': { op: makeOp('alice', 1, 'config.width', 800) },
      'config.height': { op: makeOp('alice', 2, 'config.height', 720) },
    };
    const vals = readValues(state);
    expect(vals['config.width']).toBe(800);
    expect(vals['config.height']).toBe(720);
  });

  it('returns empty object for empty state', () => {
    expect(readValues({})).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// evictStalePeers
// ---------------------------------------------------------------------------

describe('evictStalePeers', () => {
  it('keeps local peer regardless of age', () => {
    let s = makeState('alice');
    // Manually set lastSeenMs far in the past
    s = {
      ...s,
      peers: {
        alice: { ...s.peers['alice'], lastSeenMs: 0 },
      },
    };
    const result = evictStalePeers(s, 1000);
    expect(result.peers['alice']).toBeDefined();
  });

  it('removes stale remote peer', () => {
    let s = makeState('alice');
    s = applyOperation(s, makeOp('bob', 1, 'x', 1));
    // Force bob's lastSeenMs to ancient past
    s = {
      ...s,
      peers: {
        ...s.peers,
        bob: { ...s.peers['bob'], lastSeenMs: 0 },
      },
    };
    const result = evictStalePeers(s, 1000);
    expect(result.peers['bob']).toBeUndefined();
  });

  it('keeps fresh remote peer', () => {
    let s = makeState('alice');
    s = applyOperation(s, makeOp('bob', 1, 'x', 1));
    const result = evictStalePeers(s, 60000);
    expect(result.peers['bob']).toBeDefined();
  });

  it('throws RangeError for timeoutMs <= 0', () => {
    const s = makeState('alice');
    expect(() => evictStalePeers(s, 0)).toThrow(RangeError);
    expect(() => evictStalePeers(s, -1)).toThrow(RangeError);
  });
});
