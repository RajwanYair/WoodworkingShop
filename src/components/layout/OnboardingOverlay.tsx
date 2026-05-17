import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { IconSettings, IconEye, IconRuler, IconHammer, IconDocument, IconHelp } from './Icons';

const SEEN_KEY = 'onboarding-seen';

type StepIcon = React.ReactElement;
const STEPS: { icon: StepIcon; titleKey: string; descKey: string }[] = [
  { icon: <IconSettings size={22} />, titleKey: 'onboarding.stepConfigure', descKey: 'onboarding.descConfigure' },
  { icon: <IconEye size={22} />, titleKey: 'onboarding.stepPreview', descKey: 'onboarding.descPreview' },
  { icon: <IconRuler size={22} />, titleKey: 'onboarding.stepOptimize', descKey: 'onboarding.descOptimize' },
  { icon: <IconHammer size={22} />, titleKey: 'onboarding.stepAssembly', descKey: 'onboarding.descAssembly' },
  { icon: <IconDocument size={22} />, titleKey: 'onboarding.stepPdf', descKey: 'onboarding.descPdf' },
];

export function OnboardingOverlay() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(SEEN_KEY)) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(SEEN_KEY, '1');
    setVisible(false);
  };

  const dialogRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      dismiss();
      return;
    }
    // Focus trap
    if (e.key === 'Tab' && dialogRef.current) {
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        aria-label={t('onboarding.dismissBackdrop')}
        className="absolute inset-0 w-full h-full cursor-default"
        onClick={dismiss}
        tabIndex={-1}
      />
      <div className="relative bg-white dark:bg-wood-800 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 space-y-5">
        <h2 id="onboarding-title" className="text-lg font-bold text-wood-700 dark:text-wood-100 text-center">
          {t('onboarding.title')}
        </h2>
        <p className="text-sm text-wood-500 dark:text-wood-400 text-center">{t('onboarding.subtitle')}</p>
        <ol className="space-y-3">
          {STEPS.map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="text-wood-500 dark:text-wood-300 mt-0.5 shrink-0">{s.icon}</span>
              <div>
                <div className="text-sm font-semibold text-wood-700 dark:text-wood-200">{t(s.titleKey)}</div>
                <div className="text-xs text-wood-500 dark:text-wood-400">{t(s.descKey)}</div>
              </div>
            </li>
          ))}
        </ol>
        <button
          onClick={dismiss}
          className="w-full rounded bg-wood-500 px-4 py-2 text-sm font-medium text-white hover:bg-wood-600 transition-colors"
          ref={(el) => el?.focus()}
        >
          {t('onboarding.getStarted')}
        </button>
      </div>
    </div>
  );
}

/** Small help button that re-opens the overlay */
export function HelpButton() {
  const { t } = useTranslation();

  const open = () => {
    localStorage.removeItem(SEEN_KEY);
    // Force re-render by dispatching storage event
    window.dispatchEvent(new Event('show-onboarding'));
  };

  return (
    <button
      onClick={open}
      className="text-wood-300 hover:text-white transition-colors flex items-center"
      aria-label={t('onboarding.help')}
      title={t('onboarding.help')}
    >
      <IconHelp size={16} />
    </button>
  );
}

/** Wrapper that listens for re-open events */
export function OnboardingManager() {
  const [key, setKey] = useState(0);

  useEffect(() => {
    const handler = () => setKey((k) => k + 1);
    window.addEventListener('show-onboarding', handler);
    return () => window.removeEventListener('show-onboarding', handler);
  }, []);

  return <OnboardingOverlay key={key} />;
}
