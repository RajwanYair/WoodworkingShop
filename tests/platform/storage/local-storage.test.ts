import { afterEach, describe, expect, it, vi } from 'vitest';
import { browserLocalStorage } from '../../../src/platform/storage/local-storage';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('browserLocalStorage', () => {
  it('delegates string reads, writes, and removals to the browser store', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => values.set(key, value)),
      removeItem: vi.fn((key: string) => values.delete(key)),
    };
    vi.stubGlobal('localStorage', storage);

    browserLocalStorage.setItem('recent', '["open"]');
    expect(browserLocalStorage.getItem('recent')).toBe('["open"]');
    browserLocalStorage.removeItem('recent');
    expect(browserLocalStorage.getItem('recent')).toBeNull();
    expect(storage.setItem).toHaveBeenCalledWith('recent', '["open"]');
  });
});
