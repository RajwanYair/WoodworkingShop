import { asStringTranslator } from '../../i18n/translate';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { useCustomMaterialsStore } from '../../store/custom-materials-store';
import { computePartWeightKg, getMaterial } from '../../engine/materials/materials';
import type { AssemblyStep } from '../../engine/assembly/assembly';
import type { Lang } from '../../engine/core/types';
import { triggerDownload } from '../../utils/download';
import { formatDate, formatNumber } from '../../i18n/format';
import { IconPrint, IconLightbulb, IconDownload } from '../../ui/Icons';
import { WebSerialPanel } from './WebSerialPanel';
import { CameraCapture } from './CameraCapture';
import { BuildLogPanel } from './BuildLogPanel';
import { HardwareChecklist, StepCard } from './assembly-guide-cards';

type ViewMode = 'paginated' | 'all';

/**
 * Phase 12 / Sprint 10 — group consecutive parallel steps into sub-arrays.
 * Steps with `parallel: true` that share identical dependencies are placed
 * together; all other steps form singleton groups.
 */
function groupParallelSteps(steps: AssemblyStep[]): AssemblyStep[][] {
  const groups: AssemblyStep[][] = [];
  for (const step of steps) {
    if (step.parallel) {
      const depKey = (step.dependencies ?? []).slice().sort().join(',');
      const last = groups.at(-1);
      if (last && last[0].parallel) {
        const lastDepKey = (last[0].dependencies ?? []).slice().sort().join(',');
        if (lastDepKey === depKey) {
          last.push(step);
          continue;
        }
      }
    }
    groups.push([step]);
  }
  return groups;
}

export function AssemblyGuide() {
  const { t, i18n } = useTranslation();
  const { assemblySteps: steps, parts, hardware, cabinets, activeCabinetIndex } = useCabinetStore();
  const lang = i18n.language as Lang;
  const [activeStep, setActiveStep] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  // Sprint 84 — show/hide tips toggle (only applies in all-steps view)
  const [showTips, setShowTips] = useState(true);
  const notes = cabinets[activeCabinetIndex]?.notes ?? '';
  // Sprint 52 — step completion checklist
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const toggleStep = (stepId: string) =>
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
        let removedDependent = true;
        while (removedDependent) {
          removedDependent = false;
          for (const step of steps) {
            if (!next.has(step.id) || !(step.dependencies ?? []).some((dependency) => !next.has(dependency))) continue;
            next.delete(step.id);
            removedDependent = true;
          }
        }
      } else {
        next.add(stepId);
      }
      return next;
    });

  const resetProgress = () => setCompletedSteps(new Set());
  const totalMinutes = steps.reduce((sum, s) => sum + s.estimatedMinutes, 0);
  const blockedStepIds = new Set(
    steps
      .filter((step) => step.dependencies?.some((dependency) => !completedSteps.has(dependency)))
      .map((step) => step.id),
  );

  // Sprint 18 — total assembly weight (sum of all parts' computed weights).
  const customMaterials = useCustomMaterialsStore((s) => s.materials);
  const totalWeightKg = parts.reduce((sum, p) => {
    const mat = getMaterial(p.material, customMaterials);
    const density = mat.densityKgM3 ?? 0;
    return sum + computePartWeightKg(p.length, p.width, p.thickness, p.qty, density);
  }, 0);

  /** Sprint 78 — generate plain-text assembly checklist and trigger download. */
  const downloadChecklist = () => {
    const lines: string[] = [
      `Assembly Checklist — ${formatDate(new Date(), i18n.language)}`,
      `Steps: ${steps.length}  |  Estimated time: ${totalMinutes} min`,
      '',
      ...steps.map(
        (s, i) =>
          `[ ] Step ${i + 1}: ${s.title[lang]}\n    ${s.description[lang]}${s.tip?.[lang] ? `\n    Tip: ${s.tip[lang]}` : ''}`,
      ),
    ];
    triggerDownload(lines.join('\n'), 'text/plain;charset=utf-8', 'assembly-checklist.txt');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-wood-700 dark:text-wood-200 text-lg font-bold">
          {t('assembly.title')}
          {/* Sprint 169 — step count badge */}
          <span className="text-wood-400 dark:text-wood-500 ms-2 text-sm font-normal">
            ({steps.length} {t('assembly.stepsCount')})
          </span>
          {/* Sprint 64 — total estimated time */}
          <span className="text-wood-400 dark:text-wood-500 ms-2 text-xs font-normal">
            · {t('assembly.estimatedTime')}: {totalMinutes} {t('assembly.minutes')}
          </span>
          {/* Sprint 18 — total assembly weight */}
          <span className="text-wood-400 dark:text-wood-500 ms-2 text-xs font-normal">
            · {t('assembly.totalWeight')}:{' '}
            {formatNumber(totalWeightKg, i18n.language, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}{' '}
            {t('assembly.kg')}
          </span>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {/* Sprint 52 — progress indicator + reset */}
          {completedSteps.size > 0 && (
            <>
              <span className="text-wood-500 dark:text-wood-400 text-xs" aria-live="polite" aria-atomic="true">
                {completedSteps.size}/{steps.length} {t('assembly.stepsCompleted')}
              </span>
              <button
                type="button"
                onClick={resetProgress}
                className="border-wood-300 dark:border-wood-600 text-wood-500 dark:text-wood-400 hover:bg-wood-100 dark:hover:bg-wood-800 rounded border px-2 py-1 text-xs transition-colors print:hidden"
                aria-label={t('assembly.resetProgress')}
              >
                {t('assembly.resetProgress')}
              </button>
            </>
          )}
          {/* Sprint 127 — print button */}
          <button
            type="button"
            onClick={() => window.print()}
            className="border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-100 dark:hover:bg-wood-800 flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs transition-colors print:hidden"
            title={t('assembly.print')}
            aria-label={t('assembly.print')}
          >
            <IconPrint size={13} /> {t('assembly.print')}
          </button>
          {/* Sprint 78 — download checklist as plain text */}
          <button
            type="button"
            onClick={downloadChecklist}
            className="border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-100 dark:hover:bg-wood-800 flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs transition-colors print:hidden"
            title={t('assembly.downloadChecklist')}
            aria-label={t('assembly.downloadChecklist')}
          >
            <IconDownload size={13} /> {t('assembly.downloadChecklist')}
          </button>
          {/* Sprint 84 — show/hide tips toggle (visible in all-steps view only) */}
          {viewMode === 'all' && (
            <button
              type="button"
              onClick={() => setShowTips((v) => !v)}
              className="border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-100 dark:hover:bg-wood-800 flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs transition-colors print:hidden"
              aria-pressed={showTips}
              aria-label={showTips ? t('assembly.hideTips') : t('assembly.showTips')}
            >
              <IconLightbulb size={13} />
              {showTips ? t('assembly.hideTips') : t('assembly.showTips')}
            </button>
          )}
          {/* View mode toggle */}
          <div
            className="border-wood-200 dark:border-wood-700 inline-flex overflow-hidden rounded-md border text-xs print:hidden"
            role="group"
            aria-label="Assembly view mode"
          >
            <button
              type="button"
              onClick={() => setViewMode('paginated')}
              className={`px-3 py-1.5 transition-colors ${
                viewMode === 'paginated'
                  ? 'bg-accent text-white'
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
                  ? 'bg-accent text-white'
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
        <div className="print-keep rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm whitespace-pre-wrap text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          <span className="mb-1 block font-semibold">{t('assembly.cabinetNotes')}</span>
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
                className={`h-2 flex-1 rounded-full transition-colors ${
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

          <StepCard
            step={steps[activeStep]}
            stepCount={steps.length}
            parts={parts}
            lang={lang}
            t={asStringTranslator(t)}
          />

          {/* All steps hidden on screen but shown when printing in paginated mode */}
          <div className="hidden space-y-4 print:block">
            {steps.map((s, i) => (
              <StepCard key={i} step={s} stepCount={steps.length} parts={parts} lang={lang} t={asStringTranslator(t)} />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between print:hidden" data-assembly-controls="true">
            <button
              onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
              disabled={activeStep === 0}
              className="bg-wood-100 dark:bg-wood-800 text-wood-600 dark:text-wood-300 hover:bg-wood-200 dark:hover:bg-wood-700 rounded px-4 py-2 text-sm font-medium transition-colors disabled:opacity-30"
            >
              ← {t('assembly.prev')}
            </button>
            <span className="text-wood-400 self-center text-xs">
              {activeStep + 1} / {steps.length}
            </span>
            <button
              onClick={() => setActiveStep(Math.min(steps.length - 1, activeStep + 1))}
              disabled={activeStep === steps.length - 1}
              className="bg-accent hover:bg-accent-hover rounded px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-30"
            >
              {t('assembly.next')} →
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          {groupParallelSteps(steps).map((group, gi) =>
            group.length > 1 ? (
              <div
                key={gi}
                className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 dark:border-blue-800 dark:bg-blue-900/10"
              >
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                  ⇄ {t('assembly.parallelGroup')}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {group.map((s, i) => (
                    <StepCard
                      key={i}
                      step={s}
                      stepIndex={steps.indexOf(s)}
                      stepCount={steps.length}
                      parts={parts}
                      lang={lang}
                      t={asStringTranslator(t)}
                      completed={completedSteps.has(s.id)}
                      completionBlocked={blockedStepIds.has(s.id)}
                      onToggleComplete={() => toggleStep(s.id)}
                      showTips={showTips}
                    />
                  ))}
                </div>
              </div>
            ) : (
              group.map((s) => {
                const idx = steps.indexOf(s);
                return (
                  <StepCard
                    key={idx}
                    step={s}
                    stepIndex={idx}
                    stepCount={steps.length}
                    parts={parts}
                    lang={lang}
                    t={asStringTranslator(t)}
                    completed={completedSteps.has(s.id)}
                    completionBlocked={blockedStepIds.has(s.id)}
                    onToggleComplete={() => toggleStep(s.id)}
                    showTips={showTips}
                  />
                );
              })
            ),
          )}
          {completedSteps.size === steps.length && steps.length > 0 && (
            <p className="py-2 text-center text-sm font-semibold text-green-600 dark:text-green-400" role="status">
              ✓ {t('assembly.allStepsDone')}
            </p>
          )}
        </div>
      )}

      {hardware.length > 0 && <HardwareChecklist hardware={hardware} lang={lang} t={asStringTranslator(t)} />}
      <WebSerialPanel />
      <CameraCapture />
      <BuildLogPanel />
    </div>
  );
}
