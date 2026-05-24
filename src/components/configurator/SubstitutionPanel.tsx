import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { findSubstitutions } from '../../engine/substitution';
import { getMaterial } from '../../engine/materials';
import type { Lang, MaterialSubstitution } from '../../engine/types';

/** Benefit category badge colour map */
const BENEFIT_CLASSES: Record<MaterialSubstitution['benefit'], string> = {
  deflection: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700',
  weight:
    'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700',
  cost: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700',
};

/**
 * Collapsible panel shown in the configurator when the engine detects material
 * substitution opportunities (deflection safety, weight reduction, cost saving).
 *
 * Calls `findSubstitutions(config)` from the engine and renders each suggestion
 * with its benefit badge and quantitative rationale numbers.
 */
export function SubstitutionPanel() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;
  const { config, setConfig } = useCabinetStore();
  const [open, setOpen] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const suggestions = useMemo(() => findSubstitutions(config), [config]);
  const visible = suggestions.filter((s) => !dismissed.has(`${s.currentKey}→${s.suggestedKey}`));

  if (visible.length === 0) return null;

  return (
    <section
      className="border-wood-200 dark:border-wood-700 dark:bg-wood-900 overflow-hidden rounded-xl border bg-white"
      aria-label={t('substitution.title')}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-wood-800 dark:text-wood-100 hover:bg-wood-50 dark:hover:bg-wood-800 flex w-full items-center justify-between px-4 py-3 text-sm font-semibold transition-colors"
        aria-expanded={open}
      >
        <span>💡 {t('substitution.title')}</span>
        <span className="text-wood-500 dark:text-wood-400 text-[10px] font-normal">{visible.length}</span>
      </button>

      {open && (
        <ul className="space-y-3 px-4 pb-4">
          {visible.map((s) => {
            const key = `${s.currentKey}→${s.suggestedKey}`;
            let suggestedMat;
            try {
              suggestedMat = getMaterial(s.suggestedKey);
            } catch {
              return null;
            }
            const qr = s.quantitativeRationale;

            return (
              <li key={key} className="border-wood-100 dark:border-wood-700 space-y-2 rounded-lg border p-3">
                {/* Benefit badge + suggested material name */}
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${BENEFIT_CLASSES[s.benefit]}`}
                  >
                    {t(`substitution.benefit.${s.benefit}`)}
                  </span>
                  <span className="text-wood-700 dark:text-wood-200 text-xs font-medium">
                    {suggestedMat.name[lang]}
                  </span>
                  {/* Quantitative rationale */}
                  {qr?.savedKgPerSheet !== undefined && (
                    <span className="text-wood-600 dark:text-wood-400 text-[10px]">
                      {t('substitution.quant.savedKgPerSheet', { value: qr.savedKgPerSheet })}
                    </span>
                  )}
                  {qr?.deflectionReductionPct !== undefined && (
                    <span className="text-wood-600 dark:text-wood-400 text-[10px]">
                      {t('substitution.quant.deflectionReductionPct', { value: qr.deflectionReductionPct })}
                    </span>
                  )}
                  {qr?.costDeltaPct !== undefined && (
                    <span className="text-wood-600 dark:text-wood-400 text-[10px]">
                      {t('substitution.quant.costDeltaPct', { value: qr.costDeltaPct })}
                    </span>
                  )}
                </div>

                {/* Reason text */}
                <p className="text-wood-600 dark:text-wood-300 text-[11px]">{s.reason[lang]}</p>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfig({ carcassMaterial: s.suggestedKey })}
                    className="bg-wood-700 dark:bg-wood-200 dark:text-wood-800 hover:bg-wood-800 dark:hover:bg-wood-100 rounded px-2 py-1 text-[10px] font-medium text-white transition-colors"
                  >
                    {t('substitution.switchShort')}
                  </button>
                  <button
                    onClick={() => setDismissed((d) => new Set([...d, key]))}
                    className="border-wood-200 dark:border-wood-700 text-wood-500 dark:text-wood-400 hover:bg-wood-50 dark:hover:bg-wood-800 rounded border px-2 py-1 text-[10px] transition-colors"
                    aria-label={`Dismiss suggestion for ${suggestedMat.name[lang]}`}
                  >
                    ✕
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
