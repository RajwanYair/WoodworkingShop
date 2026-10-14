import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as idbKeyval from 'idb-keyval';
import { createIndexedDbAdapter } from '../../../src/platform/storage/indexed-db';

vi.mock('idb-keyval', () => ({
  createStore: vi.fn(() => ({})),
  del: vi.fn(async () => {}),
  get: vi.fn(async () => undefined),
  keys: vi.fn(async () => []),
  set: vi.fn(async () => {}),
}));

describe('createIndexedDbAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('indexedDB', {});
  });

  it('binds CRUD and key operations to its named store and rejects when IndexedDB is unavailable', async () => {
    const store = createIndexedDbAdapter('projects-db', 'projects');
    const value = { id: 'project-1' };
    vi.mocked(idbKeyval.get).mockResolvedValueOnce(value);
    vi.mocked(idbKeyval.keys).mockResolvedValueOnce(['project-1']);

    await expect(store.get('project-1')).resolves.toEqual(value);
    await store.set('project-1', value);
    await store.delete('project-1');
    await expect(store.keys()).resolves.toEqual(['project-1']);

    expect(idbKeyval.createStore).toHaveBeenCalledWith('projects-db', 'projects');
    const backingStore = vi.mocked(idbKeyval.createStore).mock.results[0]?.value;
    expect(idbKeyval.get).toHaveBeenCalledWith('project-1', backingStore);
    expect(idbKeyval.set).toHaveBeenCalledWith('project-1', value, backingStore);
    expect(idbKeyval.del).toHaveBeenCalledWith('project-1', backingStore);
    expect(idbKeyval.keys).toHaveBeenCalledWith(backingStore);

    vi.stubGlobal('indexedDB', undefined);
    await expect(store.get('project-1')).rejects.toThrow('IndexedDB is unavailable');
  });
});
