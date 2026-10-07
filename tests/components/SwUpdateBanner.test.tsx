import { renderHook, render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useSwUpdate } from '../../src/hooks/useSwUpdate';
import { SwUpdateBanner } from '../../src/components/layout/SwUpdateBanner';

const originalServiceWorkerDescriptor = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');

function createServiceWorker(state: ServiceWorkerState = 'installed') {
  const worker = new EventTarget() as ServiceWorker;
  Object.defineProperty(worker, 'state', { configurable: true, value: state });
  return worker;
}

function installServiceWorkerMock(
  options: {
    waiting?: ServiceWorker | null;
    installing?: ServiceWorker | null;
    controller?: ServiceWorker | null;
  } = {},
) {
  const container = new EventTarget() as ServiceWorkerContainer;
  const registration = new EventTarget() as ServiceWorkerRegistration;
  Object.defineProperties(registration, {
    active: { configurable: true, value: options.controller ?? null },
    waiting: { configurable: true, value: options.waiting ?? null },
    installing: { configurable: true, value: options.installing ?? null },
  });
  Object.defineProperty(container, 'controller', { configurable: true, value: options.controller ?? null });
  Object.defineProperty(container, 'register', {
    configurable: true,
    value: vi.fn(async () => registration),
  });
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: container });
  return { container, registration };
}

describe('useSwUpdate (Sprint 44)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    if (originalServiceWorkerDescriptor) {
      Object.defineProperty(navigator, 'serviceWorker', originalServiceWorkerDescriptor);
    } else {
      Reflect.deleteProperty(navigator, 'serviceWorker');
    }
  });

  it('returns updateAvailable=false when no service worker update is waiting', async () => {
    const { container } = installServiceWorkerMock();
    const { result } = renderHook(() => useSwUpdate());
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.updateAvailable).toBe(false);
    expect(container.register).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
    });
  });

  it('sets updateAvailable=true when a waiting worker exists at registration', async () => {
    const waiting = createServiceWorker();
    installServiceWorkerMock({ waiting, controller: createServiceWorker('activated') });
    const { result } = renderHook(() => useSwUpdate());
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.updateAvailable).toBe(true);
  });

  it('sets updateAvailable=true when an installing worker reaches installed state', async () => {
    const installing = createServiceWorker('installing');
    const { registration } = installServiceWorkerMock({ installing, controller: createServiceWorker('activated') });
    const { result } = renderHook(() => useSwUpdate());
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.updateAvailable).toBe(false);
    act(() => {
      Object.defineProperty(installing, 'state', { configurable: true, value: 'installed' });
      registration.dispatchEvent(new Event('updatefound'));
      installing.dispatchEvent(new Event('statechange'));
    });
    expect(result.current.updateAvailable).toBe(true);
  });

  it('sends SKIP_WAITING only after the user requests an update', async () => {
    const waiting = createServiceWorker();
    const postMessage = vi.fn();
    Object.defineProperty(waiting, 'postMessage', { configurable: true, value: postMessage });
    installServiceWorkerMock({ waiting, controller: createServiceWorker('activated') });
    const { result } = renderHook(() => useSwUpdate());
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      result.current.reload();
    });
    expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });

  it.each<[boolean, number]>([
    [false, 0],
    [true, 1],
  ])('reloads on controllerchange only after a user request=%s', async (userTriggeredFirst, expectedCalls) => {
    const reloadMock = vi.fn();
    vi.stubGlobal('location', { reload: reloadMock });
    const waiting = createServiceWorker();
    Object.defineProperty(waiting, 'postMessage', { configurable: true, value: vi.fn() });
    const { container } = installServiceWorkerMock({ waiting, controller: createServiceWorker('activated') });
    const { result } = renderHook(() => useSwUpdate());
    await act(async () => {
      await Promise.resolve();
    });
    if (userTriggeredFirst) act(() => result.current.reload());
    act(() => container.dispatchEvent(new Event('controllerchange')));
    expect(reloadMock).toHaveBeenCalledTimes(expectedCalls);
  });
});

describe('SwUpdateBanner component', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('renders the update card when updateAvailable=true', async () => {
    render(<SwUpdateBanner reload={vi.fn()} />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('hides the card and writes sessionStorage when the Later button is clicked', async () => {
    render(<SwUpdateBanner reload={vi.fn()} />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Later'));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(sessionStorage.getItem('swUpdate:dismissed')).toBe('true');
  });

  it('hides the card and writes sessionStorage when the dismiss button is clicked', async () => {
    render(<SwUpdateBanner reload={vi.fn()} />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss update notification' }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(sessionStorage.getItem('swUpdate:dismissed')).toBe('true');
  });

  it('does not render when sessionStorage flag is already set (same-tab reload scenario)', () => {
    sessionStorage.setItem('swUpdate:dismissed', 'true');
    render(<SwUpdateBanner reload={vi.fn()} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('invokes the supplied reload callback when Reload is clicked', () => {
    const reload = vi.fn();
    render(<SwUpdateBanner reload={reload} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(reload).toHaveBeenCalledOnce();
  });
});
