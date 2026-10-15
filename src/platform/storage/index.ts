export type { StorageAdapter } from './adapter';
export { assertIndexedDBAvailable, createIndexedDbAdapter } from './indexed-db';
export { getStorageEstimate } from './estimate';
export type { StorageEstimate } from './estimate';
export { readLegacyArray } from './migration';
export { browserLocalStorage } from './local-storage';
export { createLocalStorageAdapter } from './local-storage-adapter';
