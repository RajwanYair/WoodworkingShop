import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSwUpdate } from '../../src/hooks/useSwUpdate';
import { registerSW } from 'virtual:pwa-register';

vi.mock('virtual:pwa-register', () => ({
  registerSW: vi.fn(() => async () => undefined),
}));

describe('useSwUpdate (Sprint 44)', () => {
  beforeEach(() => {
    vi.mocked(registerSW).mockReturnValue(async () => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns updateAvailable=false by default when registerSW does not fire onNeedRefresh', async () => {
    const { result } = renderHook(() => useSwUpdate());
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.updateAvailable).toBe(false);
  });

  it('sets updateAvailable=true when registerSW fires onNeedRefresh', async () => {
    vi.mocked(registerSW).mockImplementation((opts) => {
      opts?.onNeedRefresh?.();
      return async () => undefined;
    });
    const { result } = renderHook(() => useSwUpdate());
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.updateAvailable).toBe(true);
  });

  it('sets updateAvailable=true when onNeedRefresh fires after mount', async () => {
    let capturedOpts: Parameters<typeof registerSW>[0] | undefined;
    vi.mocked(registerSW).mockImplementation((opts) => {
      capturedOpts = opts;
      return async () => undefined;
    });
    const { result } = renderHook(() => useSwUpdate());
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.updateAvailable).toBe(false);
    act(() => {
      capturedOpts?.onNeedRefresh?.();
    });
    expect(result.current.updateAvailable).toBe(true);
  });

  it('reload() invokes the updateSW function returned by registerSW', async () => {
    const mockUpdateSW = vi.fn(async () => undefined);
    vi.mocked(registerSW).mockImplementation((opts) => {
      opts?.onNeedRefresh?.();
      return mockUpdateSW;
    });
    const { result } = renderHook(() => useSwUpdate());
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      result.current.reload();
    });
    expect(mockUpdateSW).toHaveBeenCalledWith(true);
  });
});
