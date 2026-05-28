/**
 * Sprint 224 — Screw Pull-Out Strength Estimator Panel
 *
 * Shown in the Configurator tab. Estimates screw withdrawal force
 * from diameter, thread engagement length, and wood density class.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateScrewPullout, type WoodDensityClass } from '../../engine/screw-pullout';

const DENSITY_CLASSES: WoodDensityClass[] = ['low', 'medium', 'high', 'sheet'];

export function ScrewPulloutPanel() {
  const { t } = useTranslation();

  const [screwDiameterMm, setScrewDiameterMm] = useState(4);
  const [threadLengthMm, setThreadLengthMm] = useState(30);
  const [densityClass, setDensityClass] = useState<WoodDensityClass>('medium');

  const result = useMemo(() => {
    try {
      return {
        data: calculateScrewPullout({ screwDiameterMm, threadLengthMm, densityClass }),
        error: null,
      };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [screwDiameterMm, threadLengthMm, densityClass]);

  const ratingColor =
    result.data?.safetyRating === 'adequate'
      ? 'text-green-700 dark:text-green-400'
      : result.data?.safetyRating === 'marginal'
        ? 'text-amber-700 dark:text-amber-400'
        : 'text-red-700 dark:text-red-400';

  return (
    <section aria-label={t('screwPullout.title')} className="space-y-3">
      <h3 className="text-wood-700 dark:text-wood-200 text-sm font-semibold tracking-wide uppercase">
        🔩 {t('screwPullout.title')}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Screw diameter */}
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('screwPullout.screwDiameter')} (mm)</span>
          <input
            type="number"
            min={1}
            max={12}
            step={0.5}
            value={screwDiameterMm}
            onChange={(e) => setScrewDiameterMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        {/* Thread length */}
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('screwPullout.threadLength')} (mm)</span>
          <input
            type="number"
            min={5}
            max={100}
            value={threadLengthMm}
            onChange={(e) => setThreadLengthMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>
      </div>

      {/* Density class button group */}
      <fieldset>
        <legend className="text-wood-600 dark:text-wood-300 mb-1 text-sm">{t('screwPullout.species')}</legend>
        <div className="flex flex-wrap gap-1">
          {DENSITY_CLASSES.map((cls) => (
            <button
              key={cls}
              type="button"
              onClick={() => setDensityClass(cls)}
              className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                densityClass === cls
                  ? 'bg-wood-600 text-white'
                  : 'bg-wood-100 text-wood-700 dark:bg-wood-700 dark:text-wood-200 hover:bg-wood-200 dark:hover:bg-wood-600'
              }`}
            >
              {t(`screwPullout.${cls}`)}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Results */}
      {result.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {result.error}
        </p>
      )}

      {result.data && (
        <dl
          aria-live="polite"
          aria-label={t('screwPullout.title')}
          className="bg-wood-50 dark:bg-wood-800 grid grid-cols-2 gap-x-4 gap-y-1 rounded-md p-3 text-sm"
        >
          <dt className="text-wood-500 dark:text-wood-400">{t('screwPullout.pulloutForceN')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.pulloutForceN.toFixed(1)} N
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('screwPullout.pulloutForceLbf')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.pulloutForceLbf.toFixed(1)} lbf
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('screwPullout.withdrawalResistance')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.withdrawalResistanceMPa.toFixed(3)} MPa
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('screwPullout.safetyRating')}</dt>
          <dd className={`font-semibold ${ratingColor}`}>{t(`screwPullout.${result.data.safetyRating}`)}</dd>
        </dl>
      )}
    </section>
  );
}
