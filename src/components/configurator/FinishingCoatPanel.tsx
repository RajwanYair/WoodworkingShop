/**
 * Sprint 227 — Finishing Coat Calculator Panel
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateFinishingCoat, type FinishType } from '../../engine/finishing-coat';

const FINISH_TYPES: FinishType[] = ['polyurethane', 'lacquer', 'shellac', 'waterbased', 'oil'];

export function FinishingCoatPanel() {
  const { t } = useTranslation();

  const [surfaceAreaM2, setSurfaceAreaM2] = useState(2);
  const [coatCount, setCoatCount] = useState(3);
  const [finishType, setFinishType] = useState<FinishType>('polyurethane');

  const result = useMemo(() => {
    try {
      return {
        data: calculateFinishingCoat({ surfaceAreaM2, coatCount, finishType }),
        error: null,
      };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [surfaceAreaM2, coatCount, finishType]);

  return (
    <section aria-label={t('finishingCoat.title')} className="space-y-3">
      <h3 className="text-wood-700 dark:text-wood-200 text-sm font-semibold tracking-wide uppercase">
        🎨 {t('finishingCoat.title')}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('finishingCoat.surfaceArea')} (m²)</span>
          <input
            type="number"
            min={0.1}
            max={100}
            step={0.1}
            value={surfaceAreaM2}
            onChange={(e) => setSurfaceAreaM2(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('finishingCoat.coatCount')}</span>
          <input
            type="number"
            min={1}
            max={10}
            step={1}
            value={coatCount}
            onChange={(e) => setCoatCount(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>
      </div>

      <fieldset>
        <legend className="text-wood-600 dark:text-wood-300 mb-1 text-sm">{t('finishingCoat.finishType')}</legend>
        <div className="flex flex-wrap gap-1">
          {FINISH_TYPES.map((ft) => (
            <button
              key={ft}
              type="button"
              onClick={() => setFinishType(ft)}
              className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                finishType === ft
                  ? 'bg-wood-600 text-white'
                  : 'bg-wood-100 text-wood-700 dark:bg-wood-700 dark:text-wood-200 hover:bg-wood-200 dark:hover:bg-wood-600'
              }`}
            >
              {t(`finishingCoat.${ft}`)}
            </button>
          ))}
        </div>
      </fieldset>

      {result.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {result.error}
        </p>
      )}

      {result.data && (
        <dl
          aria-live="polite"
          aria-label={t('finishingCoat.title')}
          className="bg-wood-50 dark:bg-wood-800 grid grid-cols-2 gap-x-4 gap-y-1 rounded-md p-3 text-sm"
        >
          <dt className="text-wood-500 dark:text-wood-400">{t('finishingCoat.volumeNeeded')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.volumeLitres.toFixed(2)} L
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('finishingCoat.coveragePerLitre')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.coveragePerLitreM2} m²/L
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('finishingCoat.dryTimeBetweenCoats')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.dryTimeBetweenCoatsMin} min
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('finishingCoat.totalDryTime')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.totalDryTimeHours} h
          </dd>
        </dl>
      )}
    </section>
  );
}
