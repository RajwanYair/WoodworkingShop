import { afterEach, describe, expect, it, vi } from 'vitest';
import { getFetch } from '../../../src/platform/network/fetch';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getFetch', () => {
  it('returns an available fetch function and null when it is unavailable', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(getFetch()).toBe(fetchMock);

    vi.stubGlobal('fetch', undefined);
    expect(getFetch()).toBeNull();
  });
});
