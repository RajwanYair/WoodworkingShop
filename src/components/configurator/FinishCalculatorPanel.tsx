/**
 * Sprint 88 — Finish / Paint Calculator Panel
 *
 * Shown in the Configurator tab below MeasurementHintsPanel.
 * Lets users select a finish type + coat count and see litres needed
 * plus the recommended combination of standard can sizes.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { calculateFinish, computeFinishAreaM2, FINISH_SPECS, type FinishType } from '../../engine/finish-calculator';

const FINISH_TYPES: FinishType[] = ['primer', 'stain', 'paint', 'varnish', 'oil', 'lacquer'];

export function FinishCalculatorPanel() {
  const { t } = useTranslation();
  const parts = useCabinetStore((s) => s.parts);

  const [finishType, setFinishType] = useState<FinishType>('paint');
  const [coats, setCoats] = useState(FINISH_SPECS.paint.defaultCoats);

  const areaM2 = useMemo(() => computeFinishAreaM2(parts), [parts]);

  const estimate = useMemo(() => calculateFinish(areaM2, finishType, coats), [areaM2, finishType, coats]);

  const handleFinishChange = (ft: FinishType) => {
    setFinishType(ft);
    setCoats(FINISH_SPECS[ft].defaultCoats);
  };

  return (
    <section aria-label={t('finish.title')} className="space-y-3">
      <h3 className="text-wood-700 dark:text-wood-200 text-sm font-semibold tracking-wide uppercase">
        🎨 {t('finish.title')}
      </h3>

      {/* Finish type selector */}
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('finish.typeLabel')}>
        {FINISH_TYPES.map((ft) => (
          <button
            key={ft}
            onClick={() => handleFinishChange(ft)}
            aria-pressed={finishType === ft}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              finishType === ft
                ? 'bg-wood-600 text-white'
                : 'bg-wood-100 dark:bg-wood-800 text-wood-600 dark:text-wood-300 hover:bg-wood-200 dark:hover:bg-wood-700'
            }`}
          >
            {t(`finish.${ft}`)}
          </button>
        ))}
      </div>

      {/* Coat count */}
      <label className="text-wood-600 dark:text-wood-300 flex items-center gap-3 text-sm">
        <span className="w-28 shrink-0">{t('finish.coats')}</span>
        <input
          type="range"
          min={1}
          max={5}
          value={coats}
          onChange={(e) => setCoats(Number(e.target.value))}
          aria-label={t('finish.coats')}
          className="accent-wood-500 flex-1"
        />
        <span className="w-4 text-center font-mono">{coats}</span>
      </label>

      {/* Summary */}
      <div className="bg-wood-50 dark:bg-wood-800/60 space-y-1.5 rounded-lg p-3 text-sm">
        <div className="text-wood-600 dark:text-wood-300 flex justify-between">
          <span>{t('finish.surfaceArea')}</span>
          <span className="font-mono font-medium">{areaM2.toFixed(2)} m²</span>
        </div>
        <div className="text-wood-600 dark:text-wood-300 flex justify-between">
          <span>{t('finish.litresNeeded')}</span>
          <span className="font-mono font-medium">{estimate.litresNeeded.toFixed(2)} L</span>
        </div>
        {/* Can sizes */}
        <div className="border-wood-200 dark:border-wood-700 border-t pt-1.5">
          <p className="text-wood-600 dark:text-wood-400 mb-1 text-xs">{t('finish.recommendedCans')}</p>
          <div className="flex flex-wrap gap-2">
            {estimate.canSizes.map(({ size, count }) => (
              <span
                key={size}
                className="bg-wood-200 dark:bg-wood-700 text-wood-700 dark:text-wood-200 rounded px-2 py-0.5 font-mono text-xs"
              >
                {count}×{size}L
              </span>
            ))}
            <span className="text-wood-600 dark:text-wood-500 text-xs">
              ({t('finish.totalCans', { litres: estimate.totalCanLitres.toFixed(2) })})
            </span>
          </div>
        </div>
        {/* Advisory note */}
        <p className="text-wood-600 dark:text-wood-500 text-xs italic">{t(FINISH_SPECS[finishType].noteKey)}</p>
      </div>
    </section>
  );
}
