import { getLocalErrorReports } from './error-reporter';
import { getStorageEstimate } from '../utils/indexed-db-storage';
import { getWorkerHealth } from '../store/worker-schedule';
import type { WebVitalsSnapshot } from '../platform/diagnostics/index';

export { EMPTY_WEB_VITALS, observeWebVitals } from '../platform/diagnostics/index';
export type { WebVitalsSnapshot } from '../platform/diagnostics/index';

export interface DiagnosticBundle {
  generatedAt: string;
  appVersion: string;
  webVitals: WebVitalsSnapshot;
  workers: ReturnType<typeof getWorkerHealth>;
  storage: { usedBytes: number; quotaBytes: number };
  errors: ReturnType<typeof getLocalErrorReports>;
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
