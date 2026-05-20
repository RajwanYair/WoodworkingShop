import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSwUpdate } from '../../src/hooks/useSwUpdate';

type SwStateChangeListener = (this: ServiceWorker) => void;

function makeServiceWorker(state: ServiceWorkerState = 'installed'): ServiceWorker {
  return {
    state,
    postMessage: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onerror: null,
    onstatechange: null,
    scriptURL: '',
  } as unknown as ServiceWorker;
}

function makeRegistration(overrides: Partial<ServiceWorkerRegistration> = {}): ServiceWorkerRegistration {
  return {
    waiting: null,
    installing: null,
    active: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    ...overrides,
  } as unknown as ServiceWorkerRegistration;
}

describe('useSwUpdate (Sprint 44)', () => {
  let originalSW: typeof navigator.serviceWorker | undefined;

  beforeEach(() => {
    originalSW = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker')?.value;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalSW !== undefined) {
      Object.defineProperty(navigator, 'serviceWorker', { value: originalSW, configurable: true });
    }
  });

  it('returns updateAvailable=false when serviceWorker.ready rejects', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { ready: Promise.reject(new Error('SW unavailable')), controller: null },
      configurable: true,
    });
    const { result } = renderHook(() => useSwUpdate());
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.updateAvailable).toBe(false);
  });

  it('returns updateAvailable=false initially when no waiting SW', async () => {
    const reg = makeRegistration({ waiting: null });
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { ready: Promise.resolve(reg), controller: {} },
      configurable: true,
    });
    const { result } = renderHook(() => useSwUpdate());
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.updateAvailable).toBe(false);
  });

  it('sets updateAvailable=true when a waiting SW already exists', async () => {
    const waiting = makeServiceWorker('installed');
    const reg = makeRegistration({ waiting });
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { ready: Promise.resolve(reg), controller: {} },
      configurable: true,
    });
    const { result } = renderHook(() => useSwUpdate());
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.updateAvailable).toBe(true);
  });

  it('detects waiting SW via updatefound + statechange', async () => {
    let updateFoundCb: (() => void) | null = null;
    let stateChangeCb: SwStateChangeListener | null = null;
    const installing = makeServiceWorker('installing');
    (installing.addEventListener as ReturnType<typeof vi.fn>).mockImplementation(
      (evt: string, cb: SwStateChangeListener) => {
        if (evt === 'statechange') stateChangeCb = cb;
      },
    );

    const reg = makeRegistration({
      installing,
      waiting: null,
      addEventListener: vi.fn((evt: string, cb: () => void) => {
        if (evt === 'updatefound') updateFoundCb = cb;
      }) as unknown as ServiceWorkerRegistration['addEventListener'],
    });

    Object.defineProperty(navigator, 'serviceWorker', {
      value: { ready: Promise.resolve(reg), controller: {} },
      configurable: true,
    });

    const { result } = renderHook(() => useSwUpdate());
    await act(async () => {
      await Promise.resolve();
    });

    // Simulate updatefound → statechange to 'installed'
    act(() => {
      (installing as { state: ServiceWorkerState }).state = 'installed';
      updateFoundCb?.();
      stateChangeCb?.call(installing);
    });

    expect(result.current.updateAvailable).toBe(true);
  });

  it('reload() calls postMessage(SKIP_WAITING) and reloads', async () => {
    const waiting = makeServiceWorker('installed');
    const reg = makeRegistration({ waiting });
    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadSpy },
      configurable: true,
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { ready: Promise.resolve(reg), controller: {} },
      configurable: true,
    });

    const { result } = renderHook(() => useSwUpdate());
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.reload();
    });

    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(reloadSpy).toHaveBeenCalled();
  });
});
