import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { generateAssemblySteps } from '../../engine/assembly';
import type { AssemblyStep } from '../../engine/assembly';
import type { Lang, Part, HardwareItem } from '../../engine/types';
import { IconPrint, IconLightbulb } from '../layout/Icons';

type ViewMode = 'paginated' | 'all';

export function AssemblyGuide() {
  const { t, i18n } = useTranslation();
  const { config, parts, hardware, cabinets, activeCabinetIndex } = useCabinetStore();
  const lang = i18n.language as Lang;
  const steps = generateAssemblySteps(config);
  const [activeStep, setActiveStep] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const notes = cabinets[activeCabinetIndex]?.notes ?? '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-bold text-wood-700 dark:text-wood-200">
          {t('assembly.title')}
          {/* Sprint 169 — step count badge */}
          <span className="ms-2 text-sm font-normal text-wood-400 dark:text-wood-500">
            ({steps.length} {t('assembly.stepsCount')})
          </span>
        </h2>
        <div className="flex items-center gap-2">
          {/* Sprint 127 — print button */}
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 text-xs rounded border border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-100 dark:hover:bg-wood-800 transition-colors print:hidden flex items-center gap-1.5"
            title={t('assembly.print')}
            aria-label={t('assembly.print')}
          >
            <IconPrint size={13} /> {t('assembly.print')}
          </button>
          {/* View mode toggle */}
          <div
            className="inline-flex rounded-md border border-wood-200 dark:border-wood-700 overflow-hidden text-xs print:hidden"
            role="group"
            aria-label="Assembly view mode"
          >
            <button
              type="button"
              onClick={() => setViewMode('paginated')}
              className={`px-3 py-1.5 transition-colors ${
                viewMode === 'paginated'
                  ? 'bg-wood-600 text-white'
                  : 'bg-wood-50 dark:bg-wood-800 text-wood-600 dark:text-wood-300 hover:bg-wood-100 dark:hover:bg-wood-700'
              }`}
              aria-pressed={viewMode === 'paginated' ? 'true' : 'false'}
            >
              {t('assembly.viewStepByStep')}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 transition-colors ${
                viewMode === 'all'
                  ? 'bg-wood-600 text-white'
                  : 'bg-wood-50 dark:bg-wood-800 text-wood-600 dark:text-wood-300 hover:bg-wood-100 dark:hover:bg-wood-700'
              }`}
              aria-pressed={viewMode === 'all' ? 'true' : 'false'}
            >
              {t('assembly.viewAll')}
            </button>
          </div>
        </div>
      </div>

      {/* Sprint 161 — Cabinet notes banner */}
      {notes.trim() && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 text-sm text-amber-800 dark:text-amber-200 print-keep whitespace-pre-wrap">
          <span className="font-semibold block mb-1">{t('assembly.cabinetNotes')}</span>
          {notes.trim()}
        </div>
      )}

      {viewMode === 'paginated' ? (
        <>
          {/* Step progress bar — hidden on print */}
          <div className="flex gap-1 print:hidden" data-assembly-controls="true">
            {steps.map((s, i) => (
              <button
                key={i}
                onClick={() => setActiveStep(i)}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  i === activeStep
                    ? 'bg-wood-500'
                    : i < activeStep
                      ? 'bg-wood-300 dark:bg-wood-600'
                      : 'bg-wood-100 dark:bg-wood-800'
                }`}
                aria-label={`Step ${i + 1}: ${s.title[lang]}`}
              />
            ))}
          </div>

          <StepCard step={steps[activeStep]} stepCount={steps.length} parts={parts} lang={lang} t={t} />

          {/* All steps hidden on screen but shown when printing in paginated mode */}
          <div className="hidden print:block space-y-4">
            {steps.map((s, i) => (
              <StepCard key={i} step={s} stepCount={steps.length} parts={parts} lang={lang} t={t} />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between print:hidden" data-assembly-controls="true">
            <button
              onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
              disabled={activeStep === 0}
              className="px-4 py-2 rounded text-sm font-medium bg-wood-100 dark:bg-wood-800 text-wood-600 dark:text-wood-300 hover:bg-wood-200 dark:hover:bg-wood-700 disabled:opacity-30 transition-colors"
            >
              ← {t('assembly.prev')}
            </button>
            <span className="text-xs text-wood-400 self-center">
              {activeStep + 1} / {steps.length}
            </span>
            <button
              onClick={() => setActiveStep(Math.min(steps.length - 1, activeStep + 1))}
              disabled={activeStep === steps.length - 1}
              className="px-4 py-2 rounded text-sm font-medium bg-wood-600 text-white hover:bg-wood-700 disabled:opacity-30 transition-colors"
            >
              {t('assembly.next')} →
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          {steps.map((s, i) => (
            <StepCard key={i} step={s} stepCount={steps.length} parts={parts} lang={lang} t={t} />
          ))}
        </div>
      )}

      {/* ── Hardware Checklist (Sprint 158) ── */}
      {hardware.length > 0 && <HardwareChecklist hardware={hardware} lang={lang} t={t} />}
    </div>
  );
}

// ── Hardware Checklist (Sprint 158) ──────────────────────────────────────────
function HardwareChecklist({
  hardware,
  lang,
  t,
}: {
  hardware: HardwareItem[];
  lang: Lang;
  t: (key: string) => string;
}) {
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
    <div className="border border-wood-200 dark:border-wood-700 rounded-lg p-5 print-keep">
      <h3 className="text-base font-semibold text-wood-700 dark:text-wood-200 mb-3">
        {t('assembly.hardwareChecklist')}
      </h3>
      <p className="text-xs text-wood-400 dark:text-wood-500 mb-4">{t('assembly.hardwareChecklistDesc')}</p>
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
                className="w-4 h-4 rounded accent-wood-500 print:border print:border-wood-400 cursor-pointer"
              />
              <label
                htmlFor={id}
                className={`text-sm cursor-pointer select-none transition-colors ${
                  isChecked ? 'line-through text-wood-300 dark:text-wood-600' : 'text-wood-600 dark:text-wood-300'
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
  stepCount: number;
  parts: Part[];
  lang: Lang;
  t: (key: string) => string;
}

function StepCard({ step, stepCount, parts, lang, t }: StepCardProps) {
  const highlightedParts = new Set(step.parts);
  return (
    <div className="border border-wood-200 dark:border-wood-700 rounded-lg p-5 print-keep" data-assembly-step="true">
      <div className="flex items-start gap-4">
        <span className="text-3xl" role="img" aria-hidden="true">
          {step.icon}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-bold bg-wood-600 text-white px-2 py-0.5 rounded-full">
              {step.stepNumber}/{stepCount}
            </span>
            <h3 className="text-base font-semibold text-wood-700 dark:text-wood-200">{step.title[lang]}</h3>
            {/* Sprint 14 — risk level badge */}
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                step.riskLevel === 'high'
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  : step.riskLevel === 'medium'
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                    : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              }`}
              aria-label={`${t('assembly.riskLabel')}: ${t(`assembly.risk.${step.riskLevel}`)}`}
            >
              {t(`assembly.risk.${step.riskLevel}`)}
            </span>
          </div>
          <p className="text-sm text-wood-600 dark:text-wood-300 leading-relaxed">{step.description[lang]}</p>
          {step.tip && (
            <div className="mt-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded px-3 py-2">
              <p className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
                <IconLightbulb size={13} className="shrink-0 mt-0.5" />
                {step.tip[lang]}
              </p>
            </div>
          )}
          {step.videoKeyword && (
            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(step.videoKeyword)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
            >
              ▶ {t('assembly.watchVideo')}
            </a>
          )}
        </div>
      </div>

      {/* Parts involved in this step */}
      {step.parts.length > 0 && (
        <div className="mt-4 pt-3 border-t border-wood-100 dark:border-wood-800">
          <p className="text-xs font-medium text-wood-600 dark:text-wood-300 mb-2">{t('assembly.partsInStep')}</p>
          <div className="flex flex-wrap gap-2">
            {parts
              .filter((p) => highlightedParts.has(p.id))
              .map((p) => (
                <span
                  key={p.id}
                  className="text-xs bg-wood-100 dark:bg-wood-800 text-wood-600 dark:text-wood-300 px-2 py-1 rounded"
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
