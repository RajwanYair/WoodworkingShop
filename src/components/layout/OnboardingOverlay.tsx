import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { IconSettings, IconRuler, IconDocument, IconHelp } from './Icons';

const SEEN_KEY = 'onboarding-seen';
const TOTAL_STEPS = 3;

const WIZARD_STEPS: { icon: React.ReactElement; titleKey: string; descKey: string }[] = [
  { icon: <IconSettings size={32} />, titleKey: 'onboarding.wizardStep1Title', descKey: 'onboarding.wizardStep1Desc' },
  { icon: <IconRuler size={32} />, titleKey: 'onboarding.wizardStep2Title', descKey: 'onboarding.wizardStep2Desc' },
  { icon: <IconDocument size={32} />, titleKey: 'onboarding.wizardStep3Title', descKey: 'onboarding.wizardStep3Desc' },
];

function OnboardingOverlay() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

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

  // Sprint 8 — focus trap (Tab cycling + Escape = dismiss) via shared hook
  useFocusTrap(dialogRef, visible, dismiss);

  if (!visible) return null;

  const current = WIZARD_STEPS[step];
  const isLast = step === TOTAL_STEPS - 1;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <button
        type="button"
        aria-label={t('onboarding.dismissBackdrop')}
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={dismiss}
        tabIndex={-1}
      />
      <div className="dark:bg-wood-800 relative mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
        {/* Progress dots */}
        <div
          className="mb-5 flex justify-center gap-2"
          aria-label={t('onboarding.stepOf', { step: step + 1, total: TOTAL_STEPS })}
        >
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span
              key={i}
              className={`block h-2 w-2 rounded-full transition-colors ${i === step ? 'bg-wood-600 dark:bg-wood-300' : 'bg-wood-200 dark:bg-wood-600'}`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-wood-600 dark:text-wood-300">{current.icon}</span>
          <h2 id="onboarding-title" className="text-wood-700 dark:text-wood-100 text-base font-bold">
            {t(current.titleKey)}
          </h2>
          <p className="text-wood-600 dark:text-wood-300 text-sm">{t(current.descKey)}</p>
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between gap-2">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-50 dark:hover:bg-wood-700 rounded border px-3 py-1.5 text-sm transition-colors"
            >
              {t('onboarding.back')}
            </button>
          ) : (
            <button
              type="button"
              onClick={dismiss}
              className="text-wood-400 hover:text-wood-600 dark:text-wood-500 dark:hover:text-wood-300 rounded px-3 py-1.5 text-sm transition-colors"
            >
              {t('onboarding.skip')}
            </button>
          )}

          {isLast ? (
            <button
              type="button"
              onClick={dismiss}
              className="bg-wood-600 hover:bg-wood-700 rounded px-4 py-1.5 text-sm font-medium text-white transition-colors"
            >
              {t('onboarding.getStarted')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="bg-wood-600 hover:bg-wood-700 rounded px-4 py-1.5 text-sm font-medium text-white transition-colors"
            >
              {t('onboarding.next')}
            </button>
          )}
        </div>
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
      className="text-wood-300 flex items-center transition-colors hover:text-white"
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
