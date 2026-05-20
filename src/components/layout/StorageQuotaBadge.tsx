import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getStorageEstimate, type StorageEstimate } from '../../utils/indexed-db-storage';

const REFRESH_INTERVAL_MS = 30_000; // poll every 30 s — quota rarely changes

/**
 * Displays a compact storage usage badge: "X KB / Y MB".
 * Turns amber when usage exceeds 80% of available quota.
 * Returns null until the estimate resolves.
 */
export function StorageQuotaBadge() {
  const { t } = useTranslation();
  const [est, setEst] = useState<StorageEstimate | null>(null);

  useEffect(() => {
    let mounted = true;
    const refresh = () => {
      void getStorageEstimate().then((e) => {
        if (mounted) setEst(e);
      });
    };
    refresh();
    const id = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  if (!est || est.quotaBytes === 0) return null;

  const label = t('storage.usageLabel', { used: est.usedKb, quota: est.quotaMb });
  const warningLabel = t('storage.nearLimitWarning');

  return (
    <div
      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
        est.nearLimit
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
          : 'bg-wood-100 text-wood-500 dark:bg-wood-700 dark:text-wood-400'
      }`}
      title={est.nearLimit ? warningLabel : label}
      aria-label={est.nearLimit ? warningLabel : label}
      role="status"
    >
      <span className="font-mono">{label}</span>
      {est.nearLimit && (
        <span className="font-bold" aria-hidden="true">
          ⚠
        </span>
      )}
    </div>
  );
}
