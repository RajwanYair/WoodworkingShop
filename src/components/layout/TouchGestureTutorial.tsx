import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { IconX } from './Icons';

const TOURED_KEY = 'woodworkingshop:preview-toured';

/** Returns true if the device supports touch events (uses the modern maxTouchPoints API). */
function isTouchDevice(): boolean {
  return navigator.maxTouchPoints > 0;
}

export function TouchGestureTutorial() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isTouchDevice() && !localStorage.getItem(TOURED_KEY)) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(TOURED_KEY, '1');
    setVisible(false);
  };

  useFocusTrap(dialogRef, visible, dismiss);

  if (!visible) return null;

  const hints: { emoji: string; textKey: string }[] = [
    { emoji: '🤏', textKey: 'gestures.pinchZoom' },
    { emoji: '☝️', textKey: 'gestures.panDrag' },
    { emoji: '👆', textKey: 'gestures.doubleTap' },
    { emoji: '👈', textKey: 'gestures.swipeTabs' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/50 sm:items-center">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gesture-tutorial-title"
        className="w-full max-w-sm bg-white dark:bg-wood-900 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 space-y-4 animate-slide-up sm:animate-none"
      >
        <div className="flex items-center justify-between">
          <h2 id="gesture-tutorial-title" className="text-sm font-semibold text-wood-800 dark:text-wood-100">
            {t('gestures.title')}
          </h2>
          <button
            type="button"
            onClick={dismiss}
            className="text-wood-400 hover:text-wood-700 dark:hover:text-wood-200 transition-colors"
            aria-label={t('gestures.dismiss')}
          >
            <IconX size={16} />
          </button>
        </div>

        <p className="text-xs text-wood-600 dark:text-wood-400">{t('gestures.subtitle')}</p>

        <ul className="space-y-2.5">
          {hints.map((h) => (
            <li key={h.textKey} className="flex items-center gap-3 text-sm text-wood-700 dark:text-wood-200">
              <span className="text-xl leading-none w-7 text-center" aria-hidden="true">
                {h.emoji}
              </span>
              <span>{t(h.textKey)}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={dismiss}
          className="w-full rounded-lg bg-wood-600 px-4 py-2 text-sm font-medium text-white hover:bg-wood-700 transition-colors"
        >
          {t('gestures.gotIt')}
        </button>
      </div>
    </div>
  );
}
