import { getLocalErrorReports } from './error-reporter';
import { getStorageEstimate } from '../utils/indexed-db-storage';
import { getWorkerHealth } from '../store/worker-schedule';

export interface WebVitalsSnapshot {
  lcpMs: number | null;
  cls: number | null;
  inpMs: number | null;
}

export interface DiagnosticBundle {
  generatedAt: string;
  appVersion: string;
  webVitals: WebVitalsSnapshot;
  workers: ReturnType<typeof getWorkerHealth>;
  storage: { usedBytes: number; quotaBytes: number };
  errors: ReturnType<typeof getLocalErrorReports>;
}

export const EMPTY_WEB_VITALS: WebVitalsSnapshot = {
  lcpMs: null,
  cls: null,
  inpMs: null,
};

export function observeWebVitals(onUpdate: (vitals: WebVitalsSnapshot) => void): () => void {
  if (typeof PerformanceObserver === 'undefined') return () => {};

  const vitals = { ...EMPTY_WEB_VITALS };
  let clsWindowStart = 0;
  let lastLayoutShift = 0;
  let clsWindowValue = 0;
  let maxClsWindowValue = 0;
  const interactions = new Map<number, number>();
  const observers: PerformanceObserver[] = [];
  const observe = (type: string, consume: (entry: PerformanceEntry) => void, withEventThreshold = false) => {
    if (!PerformanceObserver.supportedEntryTypes?.includes(type)) return;
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) consume(entry);
        onUpdate({ ...vitals });
      });
      observer.observe({ type, buffered: true, ...(withEventThreshold ? { durationThreshold: 16 } : {}) });
      observers.push(observer);
    } catch {
      // Unsupported observer options are omitted from this local snapshot.
    }
  };

  observe('largest-contentful-paint', (entry) => {
    vitals.lcpMs = Math.max(vitals.lcpMs ?? 0, entry.startTime);
  });
  observe('layout-shift', (entry) => {
    const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
    if (shift.hadRecentInput) return;
    if (
      clsWindowStart === 0 ||
      entry.startTime - lastLayoutShift >= 1_000 ||
      entry.startTime - clsWindowStart >= 5_000
    ) {
      clsWindowStart = entry.startTime;
      clsWindowValue = 0;
    }
    clsWindowValue += shift.value;
    maxClsWindowValue = Math.max(maxClsWindowValue, clsWindowValue);
    lastLayoutShift = entry.startTime;
    vitals.cls = maxClsWindowValue;
  });
  observe(
    'event',
    (entry) => {
      const interaction = entry as PerformanceEntry & { interactionId: number };
      if (interaction.interactionId <= 0) return;
      interactions.set(
        interaction.interactionId,
        Math.max(interactions.get(interaction.interactionId) ?? 0, entry.duration),
      );
      const ranked = [...interactions.values()].sort((a, b) => b - a);
      vitals.inpMs = ranked[Math.floor(ranked.length / 50)] ?? null;
    },
    true,
  );

  return () => observers.forEach((observer) => observer.disconnect());
}

export async function createDiagnosticBundle(webVitals: WebVitalsSnapshot): Promise<DiagnosticBundle> {
  const storage = await getStorageEstimate();
  return {
    generatedAt: new Date().toISOString(),
    appVersion: ((globalThis as Record<string, unknown>)['__APP_VERSION__'] as string) ?? 'unknown',
    webVitals: { ...webVitals },
    workers: getWorkerHealth(),
    storage: { usedBytes: storage.usedBytes, quotaBytes: storage.quotaBytes },
    errors: getLocalErrorReports(),
  };
}
