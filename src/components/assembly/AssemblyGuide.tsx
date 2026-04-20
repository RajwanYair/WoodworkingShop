import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { generateAssemblySteps } from '../../engine/assembly';
import type { Lang } from '../../engine/types';

export function AssemblyGuide() {
  const { t, i18n } = useTranslation();
  const { config, parts } = useCabinetStore();
  const lang = i18n.language as Lang;
  const steps = generateAssemblySteps(config);
  const [activeStep, setActiveStep] = useState(0);

  const step = steps[activeStep];
  const highlightedParts = new Set(step.parts);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-wood-700 dark:text-wood-200">
        {t('assembly.title')}
      </h2>

      {/* Step progress bar */}
      <div className="flex gap-1">
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

      {/* Active step card */}
      <div className="border border-wood-200 dark:border-wood-700 rounded-lg p-5">
        <div className="flex items-start gap-4">
          <span className="text-3xl" role="img" aria-hidden="true">{step.icon}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold bg-wood-500 text-white px-2 py-0.5 rounded-full">
                {step.stepNumber}/{steps.length}
              </span>
              <h3 className="text-base font-semibold text-wood-700 dark:text-wood-200">
                {step.title[lang]}
              </h3>
            </div>
            <p className="text-sm text-wood-600 dark:text-wood-300 leading-relaxed">
              {step.description[lang]}
            </p>
            {step.tip && (
              <div className="mt-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded px-3 py-2">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  💡 {step.tip[lang]}
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
            <p className="text-xs font-medium text-wood-500 dark:text-wood-400 mb-2">
              {t('assembly.partsInStep')}
            </p>
            <div className="flex flex-wrap gap-2">
              {parts.filter(p => highlightedParts.has(p.id)).map(p => (
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

      {/* Navigation buttons */}
      <div className="flex justify-between">
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
          className="px-4 py-2 rounded text-sm font-medium bg-wood-500 text-white hover:bg-wood-600 disabled:opacity-30 transition-colors"
        >
          {t('assembly.next')} →
        </button>
      </div>
    </div>
  );
}
