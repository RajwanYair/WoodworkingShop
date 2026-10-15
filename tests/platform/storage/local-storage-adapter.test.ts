import { describe, expect, it } from 'vitest';
import { createLocalStorageAdapter } from '../../../src/platform/storage/local-storage-adapter';

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe('createLocalStorageAdapter', () => {
  it('writes synchronously so a debounced save is readable before the promise settles', () => {
    const storage = memoryStorage();
    const adapter = createLocalStorageAdapter(storage);

    const pending = adapter.set('session', { width: 812 });

    expect(adapter.readSync<{ width: number }>('session')).toEqual({ width: 812 });
    expect(storage.getItem('session')).toBe('{"width":812}');
    return expect(pending).resolves.toBeUndefined();
  });

  it('returns undefined for absent keys and malformed JSON', () => {
    const storage = memoryStorage();
    storage.setItem('broken', '{bad json');
    const adapter = createLocalStorageAdapter(storage);

    expect(adapter.readSync('missing')).toBeUndefined();
    expect(() => adapter.readSync('broken')).toThrow(SyntaxError);
    return expect(adapter.get('broken')).resolves.toBeUndefined();
  });

  it('swallows quota errors and still resolves the write', async () => {
    const storage = memoryStorage();
    storage.setItem = () => {
      throw new Error('quota');
    };
    const adapter = createLocalStorageAdapter(storage);

    await expect(adapter.set('session', { width: 1 })).resolves.toBeUndefined();
    expect(adapter.readSync('session')).toBeUndefined();
  });

  it('lists readable entries and skips corrupt rows', async () => {
    const storage = memoryStorage();
    const adapter = createLocalStorageAdapter(storage);
    await adapter.set('kept', { ok: true });
    storage.setItem('corrupt', '{bad');

    await expect(adapter.keys()).resolves.toEqual(['kept', 'corrupt']);
    await expect(adapter.entries<{ ok: boolean }>()).resolves.toEqual([['kept', { ok: true }]]);
    await adapter.delete('kept');
    expect(adapter.readSync('kept')).toBeUndefined();
  });
});
