import { useState } from 'react';
import type { AssemblyStep } from '../../engine/assembly/assembly';
import type { HardwareItem, Lang, Part } from '../../engine/core/types';
import type { StringTranslator } from '../../i18n/translate';
import { IconLightbulb } from '../../ui/Icons';

export function HardwareChecklist({
  hardware,
  lang,
  t,
}: Readonly<{
  hardware: HardwareItem[];
  lang: Lang;
  t: StringTranslator;
}>) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  return (
    <div className="border-wood-200 dark:border-wood-700 print-keep rounded-lg border p-5">
      <h3 className="text-wood-700 dark:text-wood-200 mb-3 text-base font-semibold">
        {t('assembly.hardwareChecklist')}
      </h3>
      <p className="text-wood-400 dark:text-wood-500 mb-4 text-xs">{t('assembly.hardwareChecklistDesc')}</p>
      <ul className="space-y-2">
        {hardware.map((hw) => {
          const id = `${hw.id}-${hw.qty}`;
          const isChecked = checked.has(id);
          return (
            <li key={id} className="flex items-center gap-3">
              <input
                type="checkbox"
                id={id}
                checked={isChecked}
                onChange={() => toggle(id)}
                className="accent-accent print:border-wood-400 h-4 w-4 cursor-pointer rounded print:border"
              />
              <label
                htmlFor={id}
                className={`cursor-pointer text-sm transition-colors select-none ${
                  isChecked ? 'text-wood-300 dark:text-wood-600 line-through' : 'text-wood-600 dark:text-wood-300'
                }`}
              >
                <span className="font-medium">×{hw.qty}</span> {typeof hw.name === 'object' ? hw.name[lang] : hw.name}
              </label>
            </li>
          );
        })}
      </ul>
      {checked.size === hardware.length && hardware.length > 0 && (
        <p className="mt-4 text-xs font-semibold text-green-600 dark:text-green-400">
          ✓ {t('assembly.hardwareChecklistDone')}
        </p>
      )}
    </div>
  );
}

// ── Step card ─────────────────────────────────────────────────────────────────

interface StepCardProps {
  step: AssemblyStep;
  stepIndex?: number;
  stepCount: number;
  parts: Part[];
  lang: Lang;
  t: StringTranslator;
  /** Sprint 52 — whether this step is marked complete in the checklist */
  completed?: boolean;
  /** Sprint 52 — callback to toggle completion */
  onToggleComplete?: () => void;
  completionBlocked?: boolean;
  /** Sprint 84 — when false, tips are hidden (only in all-steps view) */
  showTips?: boolean;
}

export function StepCard({
  step,
  stepIndex,
  stepCount,
  parts,
  lang,
  t,
  completed = false,
  onToggleComplete,
  completionBlocked = false,
  showTips = true,
}: Readonly<StepCardProps>) {
  const highlightedParts = new Set(step.parts);
  const checkboxId = stepIndex !== undefined ? `step-complete-${stepIndex}` : undefined;
  return (
    <div
      className={`print-keep rounded-lg border p-5 transition-colors ${
        completed
          ? 'border-green-300 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10'
          : 'border-wood-200 dark:border-wood-700'
      }`}
      data-assembly-step="true"
    >
      {/* Sprint 52 — completion checkbox */}
      {onToggleComplete && checkboxId && (
        <div className="mb-3 flex items-center gap-2 print:hidden">
          <input
            type="checkbox"
            id={checkboxId}
            checked={completed}
            disabled={completionBlocked}
            aria-describedby={completionBlocked ? `${checkboxId}-prerequisites` : undefined}
            title={completionBlocked ? t('assembly.requiredStepsFirst') : undefined}
            onChange={onToggleComplete}
            className="accent-accent h-4 w-4 cursor-pointer rounded"
          />
          <label htmlFor={checkboxId} className="text-wood-500 dark:text-wood-400 cursor-pointer text-xs select-none">
            {completed ? t('assembly.stepDone') : t('assembly.markStepDone')}
          </label>
          {completionBlocked && (
            <span id={`${checkboxId}-prerequisites`} className="sr-only">
              {t('assembly.requiredStepsFirst')}
            </span>
          )}
        </div>
      )}
      <div className="flex items-start gap-4">
        <span className="text-3xl" role="img" aria-hidden="true">
          {step.icon}
        </span>
        <div className="flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="bg-accent rounded-full px-2 py-0.5 text-xs font-bold text-white">
              {step.stepNumber}/{stepCount}
            </span>
            <h3 className="text-wood-700 dark:text-wood-200 text-base font-semibold">{step.title[lang]}</h3>
            {/* Sprint 14 — risk level badge */}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                step.riskLevel === 'high'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  : step.riskLevel === 'medium'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              }`}
              aria-label={`${t('assembly.riskLabel')}: ${t(`assembly.risk.${step.riskLevel}`)}`}
            >
              {t(`assembly.risk.${step.riskLevel}`)}
            </span>
          </div>
          <p className="text-wood-600 dark:text-wood-300 text-sm leading-relaxed">{step.description[lang]}</p>
          {showTips && step.tip && (
            <div className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-900/20">
              <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                <IconLightbulb size={13} className="mt-0.5 shrink-0" />
                {step.tip[lang]}
              </p>
            </div>
          )}
          {step.videoKeyword && (
            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(step.videoKeyword)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-red-700 hover:underline dark:text-red-400"
            >
              ▶ {t('assembly.watchVideo')}
            </a>
          )}
        </div>
      </div>

      {/* Parts involved in this step */}
      {step.parts.length > 0 && (
        <div className="border-wood-100 dark:border-wood-800 mt-4 border-t pt-3">
          <p className="text-wood-600 dark:text-wood-300 mb-2 text-xs font-medium">{t('assembly.partsInStep')}</p>
          <div className="flex flex-wrap gap-2">
            {parts
              .filter((p) => highlightedParts.has(p.id))
              .map((p) => (
                <span
                  key={p.id}
                  className="bg-wood-100 dark:bg-wood-800 text-wood-600 dark:text-wood-300 rounded px-2 py-1 text-xs"
                >
                  {p.id}: {p.name[lang]} ({p.length}×{p.width} mm)
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
