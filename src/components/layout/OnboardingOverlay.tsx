import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusTrap } from '../../hooks/useFocusTrap';
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

  // Sprint 8 — focus trap (Tab cycling + Escape = dismiss) via shared hook
  useFocusTrap(dialogRef, visible, dismiss);

  if (!visible) return null;

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
      <div className="dark:bg-wood-800 relative mx-4 w-full max-w-md space-y-5 rounded-xl bg-white p-6 shadow-2xl">
        <h2 id="onboarding-title" className="text-wood-700 dark:text-wood-100 text-center text-lg font-bold">
          {t('onboarding.title')}
        </h2>
        <p className="text-wood-600 dark:text-wood-300 text-center text-sm">{t('onboarding.subtitle')}</p>
        <ol className="space-y-3">
          {STEPS.map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="text-wood-600 dark:text-wood-300 mt-0.5 shrink-0">{s.icon}</span>
              <div>
                <div className="text-wood-700 dark:text-wood-200 text-sm font-semibold">{t(s.titleKey)}</div>
                <div className="text-wood-600 dark:text-wood-300 text-xs">{t(s.descKey)}</div>
              </div>
            </li>
          ))}
        </ol>
        <button
          onClick={dismiss}
          className="bg-wood-600 hover:bg-wood-700 w-full rounded px-4 py-2 text-sm font-medium text-white transition-colors"
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
