import type { StorageAdapter } from './adapter';
import { browserLocalStorage } from './local-storage';

type StoragePort = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type IndexedStoragePort = StoragePort & Pick<Storage, 'key' | 'length'>;

function isIndexedStorage(storage: StoragePort): storage is IndexedStoragePort {
  const candidate: object = storage;
  return (
    'key' in candidate &&
    typeof candidate.key === 'function' &&
    'length' in candidate &&
    typeof candidate.length === 'number'
  );
}

export interface SyncStorageAdapter extends StorageAdapter {
  /** Synchronous read for store startup. Returns undefined when the key is absent. */
  readSync<T>(key: string): T | undefined;
}

function storageKeys(storage: StoragePort): string[] {
  if (!isIndexedStorage(storage)) return [];
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key !== null) keys.push(key);
  }
  return keys;
}

/**
 * Local storage adapter for versioned session and slice persistence.
 * Writes complete before the returned promise resolves so debounced saves stay observable.
 */
export function createLocalStorageAdapter(storage: StoragePort = browserLocalStorage): SyncStorageAdapter {
  return {
    readSync<T>(key: string): T | undefined {
      const raw = storage.getItem(key);
      if (raw === null) return undefined;
      return JSON.parse(raw) as T;
    },
    get<T>(key: string): Promise<T | undefined> {
      try {
        return Promise.resolve(this.readSync<T>(key));
      } catch {
        return Promise.resolve(undefined);
      }
    },
    set<T>(key: string, value: T): Promise<void> {
      try {
        storage.setItem(key, JSON.stringify(value));
      } catch {
        // Quota or privacy blocks leave the in-memory store authoritative.
      }
      return Promise.resolve();
    },
    delete(key: string): Promise<void> {
      try {
        storage.removeItem(key);
      } catch {
        // Removal is best-effort.
      }
      return Promise.resolve();
    },
    keys(): Promise<IDBValidKey[]> {
      return Promise.resolve(storageKeys(storage));
    },
    entries<T>(): Promise<[IDBValidKey, T][]> {
      const rows: [IDBValidKey, T][] = [];
      for (const key of storageKeys(storage)) {
        const raw = storage.getItem(key);
        if (raw === null) continue;
        try {
          rows.push([key, JSON.parse(raw) as T]);
        } catch {
          // Skip corrupt entries; callers still receive the readable rows.
        }
      }
      return Promise.resolve(rows);
    },
  };
}
