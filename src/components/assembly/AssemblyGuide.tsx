import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { useCustomMaterialsStore } from '../../store/custom-materials-store';
import { computePartWeightKg, getMaterial } from '../../engine/materials';
import type { AssemblyStep } from '../../engine/assembly';
import type { Lang, Part, HardwareItem } from '../../engine/types';
import { triggerDownload } from '../../utils/download';
import { IconPrint, IconLightbulb, IconDownload } from '../layout/Icons';
import { WebSerialPanel } from './WebSerialPanel';
import { CameraCapture } from './CameraCapture';

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
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const toggleStep = (index: number) =>
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });

  const resetProgress = () => setCompletedSteps(new Set());
  const totalMinutes = steps.reduce((sum, s) => sum + s.estimatedMinutes, 0);

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
      `Assembly Checklist — ${new Date().toLocaleDateString()}`,
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
            · {t('assembly.totalWeight')}: {totalWeightKg.toFixed(1)} {t('assembly.kg')}
          </span>
        </h2>
        <div className="flex items-center gap-2">
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

          <StepCard step={steps[activeStep]} stepCount={steps.length} parts={parts} lang={lang} t={t} />

          {/* All steps hidden on screen but shown when printing in paginated mode */}
          <div className="hidden space-y-4 print:block">
            {steps.map((s, i) => (
              <StepCard key={i} step={s} stepCount={steps.length} parts={parts} lang={lang} t={t} />
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
              className="bg-wood-600 hover:bg-wood-700 rounded px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-30"
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
                      t={t}
                      completed={completedSteps.has(steps.indexOf(s))}
                      onToggleComplete={() => toggleStep(steps.indexOf(s))}
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
                    t={t}
                    completed={completedSteps.has(idx)}
                    onToggleComplete={() => toggleStep(idx)}
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

      {/* ── Hardware Checklist (Sprint 158) ── */}
      {hardware.length > 0 && <HardwareChecklist hardware={hardware} lang={lang} t={t} />}
      {/* Sprint 74 — WebSerial CNC sender panel */}
      <WebSerialPanel />
      {/* Sprint 81 — room photo reference */}
      <CameraCapture />
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
                className="accent-wood-500 print:border-wood-400 h-4 w-4 cursor-pointer rounded print:border"
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
  t: (key: string) => string;
  /** Sprint 52 — whether this step is marked complete in the checklist */
  completed?: boolean;
  /** Sprint 52 — callback to toggle completion */
  onToggleComplete?: () => void;
  /** Sprint 84 — when false, tips are hidden (only in all-steps view) */
  showTips?: boolean;
}

function StepCard({
  step,
  stepIndex,
  stepCount,
  parts,
  lang,
  t,
  completed = false,
  onToggleComplete,
  showTips = true,
}: StepCardProps) {
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
            onChange={onToggleComplete}
            className="accent-wood-500 h-4 w-4 cursor-pointer rounded"
          />
          <label htmlFor={checkboxId} className="text-wood-500 dark:text-wood-400 cursor-pointer text-xs select-none">
            {completed ? t('assembly.stepDone') : t('assembly.markStepDone')}
          </label>
        </div>
      )}
      <div className="flex items-start gap-4">
        <span className="text-3xl" role="img" aria-hidden="true">
          {step.icon}
        </span>
        <div className="flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="bg-wood-600 rounded-full px-2 py-0.5 text-xs font-bold text-white">
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
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:underline dark:text-red-400"
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
