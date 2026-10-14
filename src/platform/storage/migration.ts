export function readLegacyArray<T>(key: string, dataLabel: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    const data: unknown = raw === null ? [] : JSON.parse(raw);
    if (!Array.isArray(data)) throw new TypeError(`Legacy ${dataLabel} data must be an array`);
    return data as T[];
  } catch (error) {
    throw new Error(`Unable to migrate legacy ${dataLabel} data from localStorage`, { cause: error });
  }
}
