import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { translateKey } from '../i18n/translate';
import { browserLocalStorage } from '../store/platform-boundary';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { inertOutsideDialog } from '../ui/dialog-inert';
import { dispatchCommandAction } from './command-registry';
import { IconSettings, IconRuler, IconDocument, IconHelp } from '../ui/Icons';
import {
  APP_COMMAND_DEFINITIONS,
  createAppCommand,
  registerCommands,
  unregisterCommand,
} from '../utils/command-palette';

const SEEN_KEY = 'onboarding-seen';
const TOTAL_STEPS = 3;
const DISMISSED_EVENT = 'onboarding-dismissed';
const MARGIN = 12;

const TOUR_STEPS: { icon: React.ReactElement; titleKey: string; descKey: string; target: string }[] = [
  {
    icon: <IconSettings size={20} />,
    titleKey: 'onboarding.wizardStep1Title',
    descKey: 'onboarding.wizardStep1Desc',
    target: '[data-tour-step="configurator"]',
  },
  {
    icon: <IconRuler size={20} />,
    titleKey: 'onboarding.wizardStep2Title',
    descKey: 'onboarding.wizardStep2Desc',
    target: '[data-tour-step="optimizer"]',
  },
  {
    icon: <IconDocument size={20} />,
    titleKey: 'onboarding.wizardStep3Title',
    descKey: 'onboarding.wizardStep3Desc',
    target: '[data-tour-step="pdf"]',
  },
];

function popoverSupported(): boolean {
  return typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;
}

interface TourStepPanelProps {
  step: number;
  onDismiss: () => void;
  onBack: () => void;
  onNext: () => void;
}

/** Positioned next to the real control it describes; traps focus and marks the rest of the page inert, like a modal dialog. */
function TourStepPanel({ step, onDismiss, onBack, onNext }: Readonly<TourStepPanelProps>) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const current = TOUR_STEPS[step];
  const isLast = step === TOTAL_STEPS - 1;

  useLayoutEffect(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== panelRef.current) openerRef.current = active;
    const panel = panelRef.current;
    if (panel && popoverSupported() && typeof panel.showPopover === 'function') {
      try {
        panel.showPopover();
      } catch {
        // Already shown — ignore.
      }
    }
  }, []);
  useFocusTrap(panelRef, true, onDismiss);

  // Position next to the real control for this step. getBoundingClientRect already returns
  // viewport-physical px in both LTR and RTL, so no logical-property conversion applies here.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const place = () => {
      const panelRect = panel.getBoundingClientRect();
      const target = document.querySelector(current.target);
      if (!(target instanceof HTMLElement)) {
        setPosition({
          top: Math.max((window.innerHeight - panelRect.height) / 2, MARGIN),
          left: Math.max((window.innerWidth - panelRect.width) / 2, MARGIN),
        });
        return;
      }
      const targetRect = target.getBoundingClientRect();
      const maxLeft = Math.max(window.innerWidth - panelRect.width - MARGIN, MARGIN);
      const maxTop = Math.max(window.innerHeight - panelRect.height - MARGIN, MARGIN);
      setPosition({
        top: Math.min(Math.max(targetRect.bottom + MARGIN, MARGIN), maxTop),
        left: Math.min(Math.max(targetRect.left, MARGIN), maxLeft),
      });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [current.target]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const releaseInert = inertOutsideDialog(panel);
    return () => {
      releaseInert();
      if (popoverSupported() && typeof panel.hidePopover === 'function') {
        try {
          panel.hidePopover();
        } catch {
          // Already hidden — ignore.
        }
      }
      // The focus trap restores the opener before this cleanup runs, so this call is a safe no-op fallback.
      const opener = openerRef.current;
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  return (
    <div
      ref={panelRef}
      popover="manual"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      aria-describedby="onboarding-desc"
      style={
        position
          ? { position: 'fixed', top: position.top, left: position.left, margin: 0 }
          : { position: 'fixed', top: '-9999px', left: '-9999px', margin: 0 }
      }
      className="dark:bg-wood-800 w-full max-w-sm rounded-3xl bg-white p-7 text-start shadow-2xl"
    >
      {/* Progress dots */}
      <div
        className="mb-5 flex justify-center gap-2"
        role="status"
        aria-live="polite"
        aria-label={t('onboarding.stepOf', { step: step + 1, total: TOTAL_STEPS })}
      >
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <span
            key={i}
            className={`block h-2 w-2 rounded-full transition-colors ${i === step ? 'bg-accent dark:bg-accent-text-dark' : 'bg-wood-200 dark:bg-wood-600'}`}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="text-wood-600 dark:text-wood-300">{current.icon}</span>
        <h2 id="onboarding-title" className="text-wood-900 dark:text-wood-50 text-xl font-semibold tracking-tight">
          {translateKey(t, current.titleKey)}
        </h2>
        <p id="onboarding-desc" className="text-wood-600 dark:text-wood-300 text-sm">
          {translateKey(t, current.descKey)}
        </p>
      </div>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between gap-2">
        {step > 0 ? (
          <button
            type="button"
            onClick={onBack}
            className="border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-50 dark:hover:bg-wood-700 rounded border px-3 py-1.5 text-sm transition-colors"
          >
            {t('onboarding.back')}
          </button>
        ) : (
          <button
            type="button"
            onClick={onDismiss}
            className="text-wood-700 hover:text-wood-800 dark:text-wood-300 dark:hover:text-wood-100 rounded px-3 py-1.5 text-sm transition-colors"
          >
            {t('onboarding.skip')}
          </button>
        )}

        {isLast ? (
          <button
            type="button"
            onClick={onDismiss}
            className="bg-accent hover:bg-accent-hover rounded px-4 py-1.5 text-sm font-medium text-white transition-colors"
          >
            {t('onboarding.getStarted')}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className="bg-accent hover:bg-accent-hover rounded px-4 py-1.5 text-sm font-medium text-white transition-colors"
          >
            {t('onboarding.next')}
          </button>
        )}
      </div>
    </div>
  );
}

function OnboardingOverlay() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!browserLocalStorage.getItem(SEEN_KEY)) {
      setVisible(true);
    }
  }, []);

  const dismiss = useCallback(() => {
    browserLocalStorage.setItem(SEEN_KEY, '1');
    setVisible(false);
    window.dispatchEvent(new Event(DISMISSED_EVENT));
  }, []);

  if (!visible) return null;

  return (
    <TourStepPanel
      step={step}
      onDismiss={dismiss}
      onBack={() => setStep((s) => s - 1)}
      onNext={() => setStep((s) => s + 1)}
    />
  );
}

/** Small help button that re-opens the overlay */
export function HelpButton() {
  const { t } = useTranslation();

  const open = useCallback(() => {
    browserLocalStorage.removeItem(SEEN_KEY);
    // Force re-render by dispatching storage event
    window.dispatchEvent(new Event('show-onboarding'));
  }, []);

  useEffect(() => {
    const definition = APP_COMMAND_DEFINITIONS.reopenOnboarding;
    const command = createAppCommand(definition, t(definition.labelKey), t(definition.categoryKey), open);
    registerCommands([command]);
    return () => unregisterCommand(command.id);
  }, [open, t]);

  return (
    <button
      onClick={(event) => {
        event.currentTarget.focus();
        dispatchCommandAction('help.open');
      }}
      className="text-wood-200 flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-white/10 hover:text-white active:bg-white/20"
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
