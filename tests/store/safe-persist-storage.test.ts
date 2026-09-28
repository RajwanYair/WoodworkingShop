import { afterEach, describe, expect, it, vi } from 'vitest';
import { safePersistStorage } from '../../src/store/safe-persist-storage';

function getSafePersistStorage() {
  if (!safePersistStorage) throw new Error('Safe persistence storage is unavailable in this test environment.');
  return safePersistStorage;
}

describe('safePersistStorage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('treats unavailable reads as an empty persisted state', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable', 'SecurityError');
    });

    expect(getSafePersistStorage().getItem('woodworkingshop:test')).toBeNull();
  });

  it('ignores storage failures while writing or removing persisted state', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable', 'SecurityError');
    });

    const storage = getSafePersistStorage();
    expect(() => storage.setItem('woodworkingshop:test', { state: { ready: true }, version: 0 })).not.toThrow();
    expect(() => storage.removeItem?.('woodworkingshop:test')).not.toThrow();
  });
});
