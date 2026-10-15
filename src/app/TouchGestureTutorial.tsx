import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { translateKey } from '../i18n/translate';
import { browserLocalStorage } from '../store/platform-boundary';
import { Dialog } from '../ui/Dialog';
import { IconX } from '../ui/Icons';

const TOURED_KEY = 'woodworkingshop:preview-toured';
const ONBOARDING_SEEN_KEY = 'onboarding-seen';
const ONBOARDING_DISMISSED_EVENT = 'onboarding-dismissed';

/** True only when touch is the primary input; touch-capable laptops driven by a mouse are excluded. */
function isTouchDevice(): boolean {
  return (
    navigator.maxTouchPoints > 0 &&
    (typeof window.matchMedia !== 'function' || window.matchMedia('(pointer: coarse)').matches)
  );
}

export function TouchGestureTutorial() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showTutorial = () => {
      if (isTouchDevice() && !browserLocalStorage.getItem(TOURED_KEY)) setVisible(true);
    };

    if (browserLocalStorage.getItem(ONBOARDING_SEEN_KEY)) showTutorial();
    window.addEventListener(ONBOARDING_DISMISSED_EVENT, showTutorial);
    return () => window.removeEventListener(ONBOARDING_DISMISSED_EVENT, showTutorial);
  }, []);

  const dismiss = () => {
    browserLocalStorage.setItem(TOURED_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  const hints: { emoji: string; textKey: string }[] = [
    { emoji: '🤏', textKey: 'gestures.pinchZoom' },
    { emoji: '☝️', textKey: 'gestures.panDrag' },
    { emoji: '👆', textKey: 'gestures.doubleTap' },
    { emoji: '👈', textKey: 'gestures.swipeTabs' },
  ];

  return (
    <Dialog
      title={t('gestures.title')}
      onClose={dismiss}
      labelledBy="gesture-tutorial-title"
      showHeader={false}
      className="ui-dialog-sheet dark:bg-wood-900 animate-slide-up w-full max-w-sm space-y-4 rounded-t-2xl bg-white p-5 text-start shadow-2xl sm:animate-none sm:rounded-2xl"
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
            <span>{translateKey(t, h.textKey)}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={dismiss}
        className="bg-accent hover:bg-accent-hover w-full rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
      >
        {t('gestures.gotIt')}
      </button>
    </Dialog>
  );
}
