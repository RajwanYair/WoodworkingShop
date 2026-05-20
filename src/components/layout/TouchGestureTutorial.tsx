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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gesture-tutorial-title"
        className="dark:bg-wood-900 animate-slide-up w-full max-w-sm space-y-4 rounded-t-2xl bg-white p-5 shadow-2xl sm:animate-none sm:rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 id="gesture-tutorial-title" className="text-wood-800 dark:text-wood-100 text-sm font-semibold">
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

        <p className="text-wood-600 dark:text-wood-400 text-xs">{t('gestures.subtitle')}</p>

        <ul className="space-y-2.5">
          {hints.map((h) => (
            <li key={h.textKey} className="text-wood-700 dark:text-wood-200 flex items-center gap-3 text-sm">
              <span className="w-7 text-center text-xl leading-none" aria-hidden="true">
                {h.emoji}
              </span>
              <span>{t(h.textKey)}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={dismiss}
          className="bg-wood-600 hover:bg-wood-700 w-full rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          {t('gestures.gotIt')}
        </button>
      </div>
    </div>
  );
}
