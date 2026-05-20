import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getStorageEstimate } from '../../src/utils/indexed-db-storage';

// Mock the idb-keyval internals — we only care about getStorageEstimate here
vi.mock('idb-keyval', () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => {}),
  del: vi.fn(async () => {}),
  keys: vi.fn(async () => []),
  createStore: vi.fn(() => ({})),
}));

describe('getStorageEstimate', () => {
  beforeEach(() => {
    // Reset navigator.storage mock
    Object.defineProperty(globalThis, 'navigator', {
      value: { ...globalThis.navigator },
      writable: true,
      configurable: true,
    });
  });

  it('returns zero-filled fallback when navigator.storage is unavailable', async () => {
    Object.defineProperty(navigator, 'storage', { value: undefined, configurable: true });
    const est = await getStorageEstimate();
    expect(est.usedBytes).toBe(0);
    expect(est.quotaBytes).toBe(0);
    expect(est.percentUsed).toBe(0);
    expect(est.nearLimit).toBe(false);
  });

  it('calculates percentUsed and nearLimit correctly', async () => {
    const usedBytes = 100 * 1024 * 1024; // 100 MB
    const quotaBytes = 120 * 1024 * 1024; // 120 MB → 83%
    Object.defineProperty(navigator, 'storage', {
      value: { estimate: vi.fn(async () => ({ usage: usedBytes, quota: quotaBytes })) },
      configurable: true,
    });
    const est = await getStorageEstimate();
    expect(est.usedBytes).toBe(usedBytes);
    expect(est.quotaBytes).toBe(quotaBytes);
    expect(est.percentUsed).toBe(83);
    expect(est.nearLimit).toBe(true);
  });

  it('returns nearLimit false when below 80%', async () => {
    const usedBytes = 50 * 1024 * 1024; // 50 MB
    const quotaBytes = 120 * 1024 * 1024; // 120 MB → 41%
    Object.defineProperty(navigator, 'storage', {
      value: { estimate: vi.fn(async () => ({ usage: usedBytes, quota: quotaBytes })) },
      configurable: true,
    });
    const est = await getStorageEstimate();
    expect(est.nearLimit).toBe(false);
    expect(est.usedKb).toBe(Math.round(usedBytes / 1024));
    expect(est.quotaMb).toBe(Math.round(quotaBytes / (1024 * 1024)));
  });

  it('handles estimate() throwing gracefully', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: {
        estimate: vi.fn(async () => {
          throw new Error('unavailable');
        }),
      },
      configurable: true,
    });
    const est = await getStorageEstimate();
    expect(est.usedBytes).toBe(0);
    expect(est.nearLimit).toBe(false);
  });
});
