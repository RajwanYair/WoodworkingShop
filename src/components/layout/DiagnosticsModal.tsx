import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { createDiagnosticBundle, EMPTY_WEB_VITALS, observeWebVitals } from '../../services/local-diagnostics';
import type { WebVitalsSnapshot } from '../../services/local-diagnostics';
import { getStorageEstimate, type StorageEstimate } from '../../utils/indexed-db-storage';
import { getWorkerHealth } from '../../store/worker-schedule';
import { getLocalErrorReports } from '../../services/error-reporter';

interface DiagnosticsModalProps {
  readonly onClose: () => void;
}

function formatMetric(value: number | null, suffix: string): string {
  if (value === null) return '—';
  const precision = suffix === 'ms' ? 0 : 3;
  return `${value.toFixed(precision)} ${suffix}`;
}

export function DiagnosticsModal({ onClose }: DiagnosticsModalProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [vitals, setVitals] = useState<WebVitalsSnapshot>(EMPTY_WEB_VITALS);
  const [storage, setStorage] = useState<StorageEstimate | null>(null);
  const [exported, setExported] = useState(false);
  const workers = getWorkerHealth();

  useFocusTrap(dialogRef, true, onClose);

  useEffect(() => {
    const stopObserving = observeWebVitals(setVitals);
    void getStorageEstimate().then(setStorage);
    return stopObserving;
  }, []);

  const exportBundle = async () => {
    const bundle = await createDiagnosticBundle(vitals);
    const url = URL.createObjectURL(new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'woodworkingshop-diagnostics.json';
    link.click();
    URL.revokeObjectURL(url);
    setExported(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default bg-black/50"
        onClick={onClose}
        aria-label={t('diagnostics.close')}
        tabIndex={-1}
      />
      <dialog
        open
        ref={dialogRef}
        aria-modal="true"
        aria-labelledby="diagnostics-title"
        tabIndex={-1}
        className="dark:bg-wood-900 relative z-10 m-4 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg border-0 bg-white p-0 shadow-2xl outline-none"
      >
        <div className="border-wood-200 dark:border-wood-700 flex items-center justify-between border-b px-5 py-4">
          <h2 id="diagnostics-title" className="text-wood-800 dark:text-wood-100 text-base font-semibold">
            {t('diagnostics.title')}
          </h2>
          <button type="button" onClick={onClose} aria-label={t('diagnostics.close')} className="p-2">
            {t('diagnostics.close')}
          </button>
        </div>
        <div className="space-y-5 p-5 text-sm">
          <section aria-labelledby="diagnostics-vitals">
            <h3 id="diagnostics-vitals" className="mb-2 font-semibold">
              {t('diagnostics.webVitals')}
            </h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              <dt>{t('diagnostics.lcp')}</dt>
              <dd>{formatMetric(vitals.lcpMs, 'ms')}</dd>
              <dt>{t('diagnostics.cls')}</dt>
              <dd>{formatMetric(vitals.cls, '')}</dd>
              <dt>{t('diagnostics.interaction')}</dt>
              <dd>{formatMetric(vitals.inpMs, 'ms')}</dd>
            </dl>
          </section>
          <section aria-labelledby="diagnostics-workers">
            <h3 id="diagnostics-workers" className="mb-2 font-semibold">
              {t('diagnostics.workers')}
            </h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              <dt>{t('diagnostics.cutWorker')}</dt>
              <dd>{t(workers.cutOptimizer ? 'diagnostics.available' : 'diagnostics.unavailable')}</dd>
              <dt>{t('diagnostics.costWorker')}</dt>
              <dd>{t(workers.costEstimator ? 'diagnostics.available' : 'diagnostics.unavailable')}</dd>
              <dt>{t('diagnostics.assemblyWorker')}</dt>
              <dd>{t(workers.assembly ? 'diagnostics.available' : 'diagnostics.unavailable')}</dd>
            </dl>
          </section>
          <section aria-labelledby="diagnostics-storage">
            <h3 id="diagnostics-storage" className="mb-2 font-semibold">
              {t('diagnostics.storage')}
            </h3>
            <p>
              {storage
                ? t('diagnostics.storageUsage', { used: storage.usedBytes, quota: storage.quotaBytes })
                : t('diagnostics.loading')}
            </p>
          </section>
          <p>{t('diagnostics.errorCount', { count: getLocalErrorReports().length })}</p>
          <p className="text-wood-600 dark:text-wood-300">{t('diagnostics.privacy')}</p>
          <button
            type="button"
            className="bg-accent hover:bg-accent-hover rounded px-4 py-2 text-white"
            onClick={() => void exportBundle()}
          >
            {t('diagnostics.export')}
          </button>
          {exported && (
            <p role="status" aria-live="polite">
              {t('diagnostics.exported')}
            </p>
          )}
        </div>
      </dialog>
    </div>
  );
}
