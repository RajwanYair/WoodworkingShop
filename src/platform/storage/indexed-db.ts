import { createStore, del, entries, get, keys, set } from 'idb-keyval';
import type { StorageAdapter } from './adapter';

function assertIndexedDBAvailable(): void {
  if (typeof indexedDB === 'undefined') throw new Error('IndexedDB is unavailable');
}

export function createIndexedDbAdapter(databaseName: string, storeName: string): StorageAdapter {
  const store = createStore(databaseName, storeName);

  return {
    async get<T>(key: string): Promise<T | undefined> {
      assertIndexedDBAvailable();
      return get<T>(key, store);
    },
    async set<T>(key: string, value: T): Promise<void> {
      assertIndexedDBAvailable();
      await set(key, value, store);
    },
    async delete(key: string): Promise<void> {
      assertIndexedDBAvailable();
      await del(key, store);
    },
    async keys(): Promise<IDBValidKey[]> {
      assertIndexedDBAvailable();
      return keys(store);
    },
    async entries<T>(): Promise<[IDBValidKey, T][]> {
      assertIndexedDBAvailable();
      return entries<IDBValidKey, T>(store);
    },
  };
}
