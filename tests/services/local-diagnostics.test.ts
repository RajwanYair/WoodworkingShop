import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDiagnosticBundle, EMPTY_WEB_VITALS, observeWebVitals } from '../../src/services/local-diagnostics';

vi.mock('../../src/utils/indexed-db-storage', () => ({
  getStorageEstimate: vi.fn().mockResolvedValue({ usedBytes: 1024, quotaBytes: 4096 }),
}));

describe('local diagnostics', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exports only aggregate storage, worker availability, Web Vitals, and sanitized errors', async () => {
    const bundle = await createDiagnosticBundle({ lcpMs: 1200, cls: 0.02, inpMs: 30 });

    expect(bundle).toMatchObject({
      webVitals: { lcpMs: 1200, cls: 0.02, inpMs: 30 },
      storage: { usedBytes: 1024, quotaBytes: 4096 },
      workers: { cutOptimizer: false, costEstimator: false, assembly: false },
      errors: [],
    });
    expect(JSON.stringify(bundle)).not.toMatch(/cabinet|projectName|projectId/i);
  });

  it('collects LCP, CLS session windows, and per-interaction INP', () => {
    const callback = vi.fn();
    const observers: Array<{
      callback: PerformanceObserverCallback;
      disconnect: ReturnType<typeof vi.fn>;
      options: PerformanceObserverInit | undefined;
    }> = [];
    class ObserverStub {
      static supportedEntryTypes = ['largest-contentful-paint', 'layout-shift', 'event'];
      disconnect = vi.fn();
      callback: PerformanceObserverCallback;
      options: PerformanceObserverInit | undefined;
      constructor(observerCallback: PerformanceObserverCallback) {
        this.callback = observerCallback;
        observers.push(this);
      }
      observe(options?: PerformanceObserverInit) {
        this.options = options;
      }
    }
    vi.stubGlobal('PerformanceObserver', ObserverStub);

    const stop = observeWebVitals(callback);
    const makeEntry = (entryType: string, startTime: number, extra: Record<string, unknown> = {}) =>
      Object.assign({ name: '', entryType, startTime, duration: 0, toJSON: () => ({}) }, extra) as PerformanceEntry;
    const entries = [
      [makeEntry('largest-contentful-paint', 120)],
      [
        makeEntry('layout-shift', 100, { value: 0.1, hadRecentInput: false }),
        makeEntry('layout-shift', 500, { value: 0.1, hadRecentInput: false }),
        makeEntry('layout-shift', 1_600, { value: 0.2, hadRecentInput: false }),
        makeEntry('layout-shift', 1_700, { value: 0.5, hadRecentInput: true }),
      ],
      [
        makeEntry('event', 0, { duration: 20, interactionId: 1 }),
        makeEntry('event', 0, { duration: 35, interactionId: 1 }),
        makeEntry('event', 0, { duration: 12, interactionId: 2 }),
      ],
    ];
    observers.forEach((observer, index) => {
      const observerEntries = entries[index] ?? [];
      observer.callback(
        { getEntries: () => observerEntries } as PerformanceObserverEntryList,
        observer as unknown as PerformanceObserver,
      );
    });

    expect(callback).toHaveBeenLastCalledWith({ lcpMs: 120, cls: 0.2, inpMs: 35 });
    expect(observers[2]?.options).toMatchObject({ durationThreshold: 16, buffered: true });
    stop();
    expect(observers.every((observer) => observer.disconnect.mock.calls.length === 1)).toBe(true);
    expect(EMPTY_WEB_VITALS).toEqual({ lcpMs: null, cls: null, inpMs: null });
  });
});
