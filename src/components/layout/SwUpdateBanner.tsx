import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSwUpdate } from '../../hooks/useSwUpdate';
import { IconDownload, IconX } from './Icons';

/**
 * Dismissible bottom-corner card that appears when a new Service Worker is
 * waiting. The user chooses when to apply the update — clicking "Update now"
 * sends SKIP_WAITING and reloads the page; "Later" hides the card for the
 * rest of the current browser-tab session (sessionStorage key persists
 * across hard-reloads within the same tab so the user is not nagged, but
 * is cleared automatically when the tab is closed).
 */

const SESSION_DISMISS_KEY = 'swUpdate:dismissed';

export function SwUpdateBanner() {
  const { t } = useTranslation();
  const { updateAvailable, reload } = useSwUpdate();
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(SESSION_DISMISS_KEY) === 'true');

  if (!updateAvailable || dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(SESSION_DISMISS_KEY, 'true');
    setDismissed(true);
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed end-4 bottom-4 z-50 w-72 rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-600 dark:bg-gray-800"
    >
      <div className="flex items-start gap-3 p-4">
        <span className="text-wood-600 dark:text-wood-400 mt-0.5 shrink-0">
          <IconDownload size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('swUpdate.available')}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('swUpdate.description')}</p>
        </div>
        <button
          onClick={handleDismiss}
          aria-label={t('swUpdate.dismiss')}
          className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <IconX size={14} />
        </button>
      </div>
      <div className="flex gap-2 border-t border-gray-100 px-4 py-3 dark:border-gray-700">
        <button
          onClick={reload}
          className="bg-wood-600 hover:bg-wood-700 flex-1 rounded px-3 py-1.5 text-xs font-semibold text-white transition-colors"
        >
          {t('swUpdate.reload')}
        </button>
        <button
          onClick={handleDismiss}
          className="flex-1 rounded border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          {t('swUpdate.later')}
        </button>
      </div>
    </div>
  );
}
