/**
 * Sprint 228 — Wood Turning Speed Calculator Panel
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateWoodTurning, type TurningOperation } from '../../engine/wood-turning';

const OPERATIONS: TurningOperation[] = ['roughing', 'finishing', 'sanding'];

export function WoodTurningPanel() {
  const { t } = useTranslation();

  const [blankDiameterMm, setBlankDiameterMm] = useState(100);
  const [operation, setOperation] = useState<TurningOperation>('finishing');

  const result = useMemo(() => {
    try {
      return {
        data: calculateWoodTurning({ blankDiameterMm, operation }),
        error: null,
      };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [blankDiameterMm, operation]);

  return (
    <section aria-label={t('woodTurning.title')} className="space-y-3">
      <h3 className="text-wood-700 dark:text-wood-200 text-sm font-semibold tracking-wide uppercase">
        🪵 {t('woodTurning.title')}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('woodTurning.blankDiameter')} (mm)</span>
          <input
            type="number"
            min={25}
            max={600}
            step={5}
            value={blankDiameterMm}
            onChange={(e) => setBlankDiameterMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>
      </div>

      <fieldset>
        <legend className="text-wood-600 dark:text-wood-300 mb-1 text-sm">{t('woodTurning.operation')}</legend>
        <div className="flex flex-wrap gap-1">
          {OPERATIONS.map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => setOperation(op)}
              className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                operation === op
                  ? 'bg-wood-600 text-white'
                  : 'bg-wood-100 text-wood-700 dark:bg-wood-700 dark:text-wood-200 hover:bg-wood-200 dark:hover:bg-wood-600'
              }`}
            >
              {t(`woodTurning.${op}`)}
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
        <>
          <dl
            aria-live="polite"
            aria-label={t('woodTurning.title')}
            className="bg-wood-50 dark:bg-wood-800 grid grid-cols-2 gap-x-4 gap-y-1 rounded-md p-3 text-sm"
          >
            <dt className="text-wood-500 dark:text-wood-400">{t('woodTurning.recommendedRpm')}</dt>
            <dd className="text-wood-800 dark:text-wood-100 font-mono text-base font-semibold">
              {result.data.recommendedRpm.toLocaleString()} RPM
            </dd>

            <dt className="text-wood-500 dark:text-wood-400">{t('woodTurning.minRpm')}</dt>
            <dd className="text-wood-800 dark:text-wood-100 font-mono">{result.data.minRpm.toLocaleString()} RPM</dd>

            <dt className="text-wood-500 dark:text-wood-400">{t('woodTurning.maxRpm')}</dt>
            <dd className="text-wood-800 dark:text-wood-100 font-mono">{result.data.maxRpm.toLocaleString()} RPM</dd>

            <dt className="text-wood-500 dark:text-wood-400">{t('woodTurning.surfaceSpeed')}</dt>
            <dd className="text-wood-800 dark:text-wood-100 font-mono">
              {result.data.surfaceSpeedMPerMin.toFixed(0)} m/min
            </dd>
          </dl>

          <p className="text-xs text-amber-700 dark:text-amber-400">⚠ {t('woodTurning.safetyNote')}</p>
        </>
      )}
    </section>
  );
}
