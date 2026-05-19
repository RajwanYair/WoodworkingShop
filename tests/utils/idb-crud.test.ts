/**
 * Integration tests for idb-keyval CRUD helpers in indexed-db-storage.ts.
 * Uses fake-indexeddb (imported globally via tests/setup.ts) — no mocking of idb-keyval.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  idbLoadProjects,
  idbSaveProjects,
  idbLoadConfigs,
  idbSaveConfigs,
  idbLoadSnapshots,
  idbSaveSnapshots,
  idbDeleteSnapshot,
  idbGet,
  idbSet,
  idbDel,
  idbKeys,
} from '../../src/utils/indexed-db-storage';

// Each test suite clears the stores via save([]) to ensure isolation.

describe('idbLoadProjects / idbSaveProjects', () => {
  beforeEach(async () => {
    await idbSaveProjects([]);
  });

  it('returns empty array when store is empty', async () => {
    const result = await idbLoadProjects();
    expect(result).toEqual([]);
  });

  it('round-trips an array of projects', async () => {
    const projects = [{ id: 'p1', name: 'Alpha' }, { id: 'p2', name: 'Beta' }];
    await idbSaveProjects(projects);
    const loaded = await idbLoadProjects();
    expect(loaded).toEqual(projects);
  });

  it('overwrites previous data on second save', async () => {
    await idbSaveProjects([{ id: 'old', name: 'Old' }]);
    await idbSaveProjects([{ id: 'new', name: 'New' }]);
    const loaded = await idbLoadProjects();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]).toMatchObject({ id: 'new' });
  });
});

describe('idbLoadConfigs / idbSaveConfigs', () => {
  beforeEach(async () => {
    await idbSaveConfigs([]);
  });

  it('returns empty array when store is empty', async () => {
    const result = await idbLoadConfigs();
    expect(result).toEqual([]);
  });

  it('round-trips an array of configs', async () => {
    const configs = [{ name: 'Config A', data: { width: 600 } }];
    await idbSaveConfigs(configs);
    const loaded = await idbLoadConfigs();
    expect(loaded).toEqual(configs);
  });
});

describe('idbLoadSnapshots / idbSaveSnapshots / idbDeleteSnapshot', () => {
  beforeEach(async () => {
    await idbSaveSnapshots([]);
  });

  it('returns empty array when store is empty', async () => {
    const result = await idbLoadSnapshots();
    expect(result).toEqual([]);
  });

  it('round-trips an array of snapshots', async () => {
    const snaps = [
      { id: 's1', name: 'Snap 1', cabinets: [], timestamp: '2025-01-01T00:00:00Z' },
      { id: 's2', name: 'Snap 2', cabinets: [], timestamp: '2025-01-02T00:00:00Z' },
    ];
    await idbSaveSnapshots(snaps);
    const loaded = await idbLoadSnapshots();
    expect(loaded).toHaveLength(2);
    expect(loaded[0]).toMatchObject({ id: 's1' });
  });

  it('idbDeleteSnapshot removes the matching snapshot by id', async () => {
    const snaps = [
      { id: 'del-me', name: 'Delete', cabinets: [], timestamp: '2025-01-01T00:00:00Z' },
      { id: 'keep-me', name: 'Keep', cabinets: [], timestamp: '2025-01-02T00:00:00Z' },
    ];
    await idbSaveSnapshots(snaps);
    await idbDeleteSnapshot('del-me');
    const loaded = await idbLoadSnapshots<{ id: string; name: string; cabinets: []; timestamp: string }>();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('keep-me');
  });

  it('idbDeleteSnapshot is a no-op for unknown id', async () => {
    await idbSaveSnapshots([{ id: 'only', name: 'Only', cabinets: [], timestamp: '2025-01-01T00:00:00Z' }]);
    await idbDeleteSnapshot('ghost');
    const loaded = await idbLoadSnapshots();
    expect(loaded).toHaveLength(1);
  });
});

describe('idbGet / idbSet / idbDel / idbKeys', () => {
  it('set and get a value', async () => {
    await idbSet('test-key', { foo: 42 });
    const val = await idbGet<{ foo: number }>('test-key');
    expect(val).toEqual({ foo: 42 });
  });

  it('get returns undefined for unknown key', async () => {
    const val = await idbGet('no-such-key');
    expect(val).toBeUndefined();
  });

  it('del removes the key', async () => {
    await idbSet('ephemeral', 'hello');
    await idbDel('ephemeral');
    const val = await idbGet('ephemeral');
    expect(val).toBeUndefined();
  });

  it('keys lists stored keys', async () => {
    await idbSet('key-a', 1);
    await idbSet('key-b', 2);
    const k = await idbKeys();
    expect(k).toContain('key-a');
    expect(k).toContain('key-b');
  });
});
