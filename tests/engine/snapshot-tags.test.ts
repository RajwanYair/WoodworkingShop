import { describe, it, expect } from 'vitest';
import {
  createSnapshotStore,
  addSnapshot,
  removeSnapshot,
  renameSnapshot,
  findSnapshotByLabel,
  getSnapshotsSorted,
  snapshotDiffSummary,
  MAX_SNAPSHOT_LABEL_LENGTH,
} from '../../src/engine/snapshot-tags';

function isError(r: unknown): r is { error: { code: string } } {
  return typeof r === 'object' && r !== null && 'error' in r;
}

describe('createSnapshotStore', () => {
  it('creates empty store', () => {
    expect(createSnapshotStore().tags).toHaveLength(0);
  });
});

describe('addSnapshot', () => {
  it('adds a snapshot', () => {
    const res = addSnapshot(createSnapshotStore(), 'Before kitchen', '3.66.1');
    if (isError(res)) throw new Error('unexpected error');
    expect(res.store.tags).toHaveLength(1);
    expect(res.tag.label).toBe('Before kitchen');
  });

  it('rejects label exceeding max length', () => {
    const res = addSnapshot(createSnapshotStore(), 'x'.repeat(MAX_SNAPSHOT_LABEL_LENGTH + 1), '1.0.0');
    expect(isError(res)).toBe(true);
    if (isError(res)) expect(res.error.code).toBe('LABEL_TOO_LONG');
  });

  it('rejects duplicate label', () => {
    let store = createSnapshotStore();
    const r1 = addSnapshot(store, 'Duplicate', '1.0');
    if (isError(r1)) throw new Error();
    store = r1.store;
    const r2 = addSnapshot(store, 'Duplicate', '1.0');
    expect(isError(r2)).toBe(true);
    if (isError(r2)) expect(r2.error.code).toBe('DUPLICATE_LABEL');
  });

  it('stores the projectVersion', () => {
    const res = addSnapshot(createSnapshotStore(), 'v1', '3.70.0');
    if (isError(res)) throw new Error();
    expect(res.tag.projectVersion).toBe('3.70.0');
  });
});

describe('removeSnapshot', () => {
  it('removes an existing snapshot', () => {
    let store = createSnapshotStore();
    const r1 = addSnapshot(store, 'Snap1', '1.0');
    if (isError(r1)) throw new Error();
    store = r1.store;
    const r2 = removeSnapshot(store, r1.tag.id);
    if (isError(r2)) throw new Error();
    expect(r2.store.tags).toHaveLength(0);
  });

  it('returns SNAPSHOT_NOT_FOUND for unknown id', () => {
    const res = removeSnapshot(createSnapshotStore(), 'ghost');
    expect(isError(res)).toBe(true);
    if (isError(res)) expect(res.error.code).toBe('SNAPSHOT_NOT_FOUND');
  });
});

describe('renameSnapshot', () => {
  it('renames a snapshot', () => {
    let store = createSnapshotStore();
    const r1 = addSnapshot(store, 'OldLabel', '1.0');
    if (isError(r1)) throw new Error();
    store = r1.store;
    const r2 = renameSnapshot(store, r1.tag.id, 'NewLabel');
    if (isError(r2)) throw new Error();
    expect(r2.store.tags[0].label).toBe('NewLabel');
  });

  it('rejects duplicate label on rename', () => {
    let store = createSnapshotStore();
    const r1 = addSnapshot(store, 'A', '1.0');
    if (isError(r1)) throw new Error();
    store = r1.store;
    const r2 = addSnapshot(store, 'B', '1.0');
    if (isError(r2)) throw new Error();
    store = r2.store;
    const r3 = renameSnapshot(store, r1.tag.id, 'B');
    expect(isError(r3)).toBe(true);
    if (isError(r3)) expect(r3.error.code).toBe('DUPLICATE_LABEL');
  });
});

describe('findSnapshotByLabel', () => {
  it('finds a snapshot case-insensitively', () => {
    let store = createSnapshotStore();
    const r = addSnapshot(store, 'Kitchen Draft', '1.0');
    if (isError(r)) throw new Error();
    store = r.store;
    const found = findSnapshotByLabel(store, 'kitchen draft');
    expect(found?.label).toBe('Kitchen Draft');
  });

  it('returns undefined when not found', () => {
    expect(findSnapshotByLabel(createSnapshotStore(), 'nope')).toBeUndefined();
  });
});

describe('getSnapshotsSorted', () => {
  it('returns snapshots newest first', async () => {
    let store = createSnapshotStore();
    const r1 = addSnapshot(store, 'First', '1.0');
    if (isError(r1)) throw new Error();
    store = r1.store;
    // Ensure distinct timestamps
    await new Promise((res) => setTimeout(res, 5));
    const r2 = addSnapshot(store, 'Second', '1.1');
    if (isError(r2)) throw new Error();
    store = r2.store;
    const sorted = getSnapshotsSorted(store);
    expect(sorted[0].label).toBe('Second');
  });
});

describe('snapshotDiffSummary', () => {
  it('includes label and version info', () => {
    const from = { id: 'a', label: 'Before', createdAt: '2024-01-01T00:00:00Z', projectVersion: '1.0' };
    const to = { id: 'b', label: 'After', createdAt: '2024-06-01T00:00:00Z', projectVersion: '2.0' };
    const summary = snapshotDiffSummary(from, to);
    expect(summary).toContain('Before');
    expect(summary).toContain('After');
    expect(summary).toContain('1.0');
    expect(summary).toContain('2.0');
  });
});
