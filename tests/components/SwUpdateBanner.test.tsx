import { renderHook, render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSwUpdate } from '../../src/hooks/useSwUpdate';
import { SwUpdateBanner } from '../../src/components/layout/SwUpdateBanner';
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
    expect(mockUpdateSW).toHaveBeenCalledOnce();
  });

  it.each<[boolean, number]>([
    [false, 0],
    [true, 1],
  ])(
    'onNeedReload: user triggered reload first=%s → window.location.reload called %i time(s)',
    async (userTriggeredFirst, expectedCalls) => {
      const reloadMock = vi.fn();
      vi.stubGlobal('location', { reload: reloadMock });

      let capturedOpts: Parameters<typeof registerSW>[0] | undefined;
      const mockUpdateSW = vi.fn(async () => undefined);
      vi.mocked(registerSW).mockImplementation((opts) => {
        capturedOpts = opts;
        opts?.onNeedRefresh?.();
        return mockUpdateSW;
      });
      const { result } = renderHook(() => useSwUpdate());
      await act(async () => {
        await Promise.resolve();
      });
      if (userTriggeredFirst) {
        act(() => {
          result.current.reload();
        });
      }
      act(() => {
        capturedOpts?.onNeedReload?.();
      });
      expect(reloadMock).toHaveBeenCalledTimes(expectedCalls);
      vi.unstubAllGlobals();
    },
  );
});

describe('SwUpdateBanner component', () => {
  beforeEach(() => {
    vi.mocked(registerSW).mockImplementation((opts) => {
      opts?.onNeedRefresh?.();
      return async () => undefined;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the update card when updateAvailable=true', () => {
    render(<SwUpdateBanner />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('hides the card when the Later button is clicked', () => {
    render(<SwUpdateBanner />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Later'));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('hides the card when the × dismiss button is clicked', () => {
    render(<SwUpdateBanner />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss update notification' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('renders nothing when no update is available', () => {
    vi.mocked(registerSW).mockReturnValue(async () => undefined);
    render(<SwUpdateBanner />);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
