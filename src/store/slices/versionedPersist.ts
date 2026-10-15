import type { PersistOptions, PersistStorage } from 'zustand/middleware';
import { safePersistStorage } from '../safe-persist-storage';

/** Per-slice persistence version. Version 0 is the unversioned Zustand default. */
export const SLICE_PERSIST_VERSION = 1;

export function versionedPersistOptions<T>(name: string): PersistOptions<T, T> {
  return {
    name,
    version: SLICE_PERSIST_VERSION,
    storage: safePersistStorage as PersistStorage<T, unknown> | undefined,
    migrate: (persistedState, version) => {
      if (version === 0 || version === SLICE_PERSIST_VERSION) return persistedState as T;
      return persistedState as T;
    },
  };
}
