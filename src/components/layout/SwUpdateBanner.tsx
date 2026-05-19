import { useTranslation } from 'react-i18next';
import { useSwUpdate } from '../../hooks/useSwUpdate';

/**
 * Sticky top banner that appears when a new Service Worker is waiting.
 * Clicking "Reload" sends SKIP_WAITING and reloads the page to activate the
 * new version.
 */
export function SwUpdateBanner() {
  const { t } = useTranslation();
  const { updateAvailable, reload } = useSwUpdate();

  if (!updateAvailable) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed top-0 start-0 end-0 z-50 flex items-center justify-center gap-3 bg-wood-600 px-4 py-2 text-sm text-white shadow-md"
    >
      <span>{t('swUpdate.available')}</span>
      <button
        onClick={reload}
        className="rounded bg-white px-3 py-1 text-xs font-semibold text-wood-700 hover:bg-wood-100 transition-colors"
      >
        {t('swUpdate.reload')}
      </button>
    </div>
  );
}
