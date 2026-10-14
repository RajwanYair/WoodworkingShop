/** Engine-agnostic asynchronous storage contract for platform persistence. */
export interface StorageAdapter {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<IDBValidKey[]>;
  entries<T>(): Promise<[IDBValidKey, T][]>;
}
