/**
 * CRDT sync layer — Sprint 21 tests
 */
import { describe, it, expect } from 'vitest';
import {
  createCrdtDocument,
  crdtSet,
  crdtDelete,
  crdtGet,
  crdtKeys,
  crdtToObject,
  applyOp,
  mergeOps,
  serializeOps,
  deserializeOps,
  exportSnapshot,
  importSnapshot,
} from '../../src/utils/crdt-sync';

describe('createCrdtDocument', () => {
  it('initialises with clock 0', () => {
    const doc = createCrdtDocument('client-a');
    expect(doc.clock).toBe(0);
  });

  it('stores clientId', () => {
    const doc = createCrdtDocument('client-x');
    expect(doc.clientId).toBe('client-x');
  });

  it('starts with empty fields', () => {
    const doc = createCrdtDocument('c');
    expect(crdtKeys(doc)).toHaveLength(0);
  });
});

describe('crdtSet', () => {
  it('advances clock', () => {
    const doc = createCrdtDocument('a');
    crdtSet(doc, '/width', 600);
    expect(doc.clock).toBe(1);
    crdtSet(doc, '/height', 800);
    expect(doc.clock).toBe(2);
  });

  it('returns an op with correct path and value', () => {
    const doc = createCrdtDocument('a');
    const op = crdtSet(doc, '/material', 'plywood');
    expect(op.path).toBe('/material');
    expect(op.value).toBe('plywood');
    expect(op.clientId).toBe('a');
    expect(op.clock).toBe(1);
  });

  it('makes value readable via crdtGet', () => {
    const doc = createCrdtDocument('a');
    crdtSet(doc, '/depth', 560);
    expect(crdtGet(doc, '/depth')).toBe(560);
  });

  it('overwrite returns new value', () => {
    const doc = createCrdtDocument('a');
    crdtSet(doc, '/width', 600);
    crdtSet(doc, '/width', 700);
    expect(crdtGet(doc, '/width')).toBe(700);
  });
});

describe('crdtDelete', () => {
  it('creates a tombstone op', () => {
    const doc = createCrdtDocument('a');
    crdtSet(doc, '/x', 1);
    const op = crdtDelete(doc, '/x');
    expect(op.value).toBeNull();
  });

  it('field returns undefined after delete', () => {
    const doc = createCrdtDocument('a');
    crdtSet(doc, '/x', 1);
    crdtDelete(doc, '/x');
    expect(crdtGet(doc, '/x')).toBeUndefined();
  });

  it('deleted field is not in crdtKeys', () => {
    const doc = createCrdtDocument('a');
    crdtSet(doc, '/a', 1);
    crdtSet(doc, '/b', 2);
    crdtDelete(doc, '/a');
    expect(crdtKeys(doc)).toEqual(['/b']);
  });
});

describe('crdtToObject', () => {
  it('returns all live fields', () => {
    const doc = createCrdtDocument('a');
    crdtSet(doc, '/width', 600);
    crdtSet(doc, '/height', 800);
    expect(crdtToObject(doc)).toEqual({ '/width': 600, '/height': 800 });
  });

  it('excludes tombstoned fields', () => {
    const doc = createCrdtDocument('a');
    crdtSet(doc, '/width', 600);
    crdtDelete(doc, '/width');
    expect(crdtToObject(doc)).toEqual({});
  });
});

describe('applyOp — conflict resolution', () => {
  it('applies a remote op when it has a higher clock', () => {
    const local = createCrdtDocument('local');
    crdtSet(local, '/width', 600); // clock=1

    const op = { clientId: 'remote', clock: 5, path: '/width', value: 900 };
    const changed = applyOp(local, op);
    expect(changed).toBe(true);
    expect(crdtGet(local, '/width')).toBe(900);
  });

  it('rejects a remote op with lower clock', () => {
    const local = createCrdtDocument('local');
    // local sets at clock=3
    crdtSet(local, '/width', 600);
    crdtSet(local, '/width', 601);
    crdtSet(local, '/width', 602); // clock=3
    local._fields.get('/width')!.clock = 3;

    const op = { clientId: 'remote', clock: 2, path: '/width', value: 999 };
    const changed = applyOp(local, op);
    expect(changed).toBe(false);
    expect(crdtGet(local, '/width')).toBe(602);
  });

  it('tie-break: lexicographically larger clientId wins', () => {
    const local = createCrdtDocument('aaa');
    const op1 = crdtSet(local, '/x', 1); // clock=1, client=aaa
    // Remote has same clock but clientId "zzz" > "aaa"
    const op2 = { clientId: 'zzz', clock: op1.clock, path: '/x', value: 2 };
    const changed = applyOp(local, op2);
    expect(changed).toBe(true);
    expect(crdtGet(local, '/x')).toBe(2);
  });

  it('tie-break: same clientId, same clock = no change', () => {
    const local = createCrdtDocument('abc');
    crdtSet(local, '/x', 1);
    const op = { clientId: 'abc', clock: 1, path: '/x', value: 2 };
    const changed = applyOp(local, op);
    expect(changed).toBe(false);
  });

  it('advances local clock when remote op has higher clock', () => {
    const local = createCrdtDocument('local');
    crdtSet(local, '/x', 1); // clock=1
    applyOp(local, { clientId: 'remote', clock: 10, path: '/y', value: 99 });
    expect(local.clock).toBe(10);
  });
});

describe('mergeOps', () => {
  it('returns count of applied ops', () => {
    const local = createCrdtDocument('local');
    const ops = [
      { clientId: 'r', clock: 1, path: '/a', value: 1 },
      { clientId: 'r', clock: 2, path: '/b', value: 2 },
      { clientId: 'r', clock: 1, path: '/a', value: 99 }, // duplicate, lower clock → no change
    ];
    const count = mergeOps(local, ops);
    expect(count).toBe(2);
  });

  it('two clients converge to same state', () => {
    const a = createCrdtDocument('client-a');
    const b = createCrdtDocument('client-b');

    const op1 = crdtSet(a, '/width', 600);
    const op2 = crdtSet(b, '/width', 700);
    const op3 = crdtSet(b, '/height', 800);

    // Merge b's ops into a, and a's ops into b
    mergeOps(a, [op2, op3]);
    mergeOps(b, [op1]);

    // Both should agree (b wins /width because 'client-b' > 'client-a' at clock tie)
    expect(crdtGet(a, '/height')).toBe(800);
    expect(crdtGet(b, '/height')).toBe(800);
    // /width: both at clock=1, client-b > client-a → 700
    expect(crdtGet(a, '/width')).toBe(700);
    expect(crdtGet(b, '/width')).toBe(700);
  });
});

describe('serializeOps / deserializeOps', () => {
  it('round-trips an op array', () => {
    const ops = [
      { clientId: 'a', clock: 1, path: '/x', value: 42 },
      { clientId: 'b', clock: 2, path: '/y', value: null },
    ];
    const json = serializeOps(ops);
    expect(deserializeOps(json)).toEqual(ops);
  });

  it('throws on invalid JSON', () => {
    expect(() => deserializeOps('{')).toThrow();
  });

  it('throws when root is not an array', () => {
    expect(() => deserializeOps('{"x":1}')).toThrow(TypeError);
  });

  it('throws on invalid op shape', () => {
    expect(() => deserializeOps('[{"clientId":1,"clock":1,"path":"/x"}]')).toThrow(
      TypeError,
    );
  });
});

describe('exportSnapshot / importSnapshot', () => {
  it('round-trips a document', () => {
    const original = createCrdtDocument('snap-client');
    crdtSet(original, '/width', 600);
    crdtSet(original, '/height', 800);
    crdtDelete(original, '/height');

    const snap = exportSnapshot(original);
    const restored = importSnapshot(snap);

    expect(restored.clientId).toBe('snap-client');
    expect(restored.clock).toBe(original.clock);
    expect(crdtGet(restored, '/width')).toBe(600);
    expect(crdtGet(restored, '/height')).toBeUndefined();
  });

  it('snapshot includes deleted field as tombstone', () => {
    const doc = createCrdtDocument('c');
    crdtSet(doc, '/x', 1);
    crdtDelete(doc, '/x');
    const snap = exportSnapshot(doc);
    const deleted = snap.fields.find((f) => f.path === '/x');
    expect(deleted?.deleted).toBe(true);
  });
});
