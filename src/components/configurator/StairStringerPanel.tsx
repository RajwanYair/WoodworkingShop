/**
 * Sprint 231 — Stair Stringer Calculator Panel
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateStairStringer } from '../../engine/stair-stringer';

export function StairStringerPanel() {
  const { t } = useTranslation();

  const [totalRiseMm, setTotalRiseMm] = useState(2800);
  const [treadDepthMm, setTreadDepthMm] = useState(280);
  const [idealRiserMm, setIdealRiserMm] = useState(175);

  const result = useMemo(() => {
    try {
      return {
        data: calculateStairStringer({ totalRiseMm, treadDepthMm, idealRiserMm }),
        error: null,
      };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [totalRiseMm, treadDepthMm, idealRiserMm]);

  return (
    <section aria-label={t('stairStringer.title')} className="space-y-3">
      <h3 className="text-wood-700 dark:text-wood-200 text-sm font-semibold tracking-wide uppercase">
        🪜 {t('stairStringer.title')}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('stairStringer.totalRise')} (mm)</span>
          <input
            type="number"
            min={300}
            max={6000}
            step={10}
            value={totalRiseMm}
            onChange={(e) => setTotalRiseMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('stairStringer.treadDepth')} (mm)</span>
          <input
            type="number"
            min={150}
            max={500}
            step={5}
            value={treadDepthMm}
            onChange={(e) => setTreadDepthMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 col-span-2 flex flex-col gap-1 text-sm">
          <span>{t('stairStringer.idealRiser')} (mm)</span>
          <input
            type="number"
            min={100}
            max={220}
            step={5}
            value={idealRiserMm}
            onChange={(e) => setIdealRiserMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>
      </div>

      {result.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {result.error}
        </p>
      )}

      {result.data && (
        <>
          <dl className="bg-wood-50 dark:bg-wood-900 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg p-3 text-sm">
            <dt className="text-wood-500 dark:text-wood-400">{t('stairStringer.riserCount')}</dt>
            <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">{result.data.riserCount}</dd>

            <dt className="text-wood-500 dark:text-wood-400">{t('stairStringer.actualRiser')}</dt>
            <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">{result.data.actualRiserMm} mm</dd>

            <dt className="text-wood-500 dark:text-wood-400">{t('stairStringer.treadCount')}</dt>
            <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">{result.data.treadCount}</dd>

            <dt className="text-wood-500 dark:text-wood-400">{t('stairStringer.totalRun')}</dt>
            <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">{result.data.totalRunMm} mm</dd>

            <dt className="text-wood-500 dark:text-wood-400">{t('stairStringer.stringerLength')}</dt>
            <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
              {result.data.stringerLengthMm} mm
            </dd>

            <dt className="text-wood-500 dark:text-wood-400">{t('stairStringer.stringerAngle')}</dt>
            <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
              {result.data.stringerAngleDeg}°
            </dd>
          </dl>

          {result.data.warningKey && (
            <p role="alert" className="text-sm text-amber-600 dark:text-amber-400">
              ⚠ {t(`stairStringer.${result.data.warningKey}`)}
            </p>
          )}

          {result.data.passesIrc && (
            <p className="text-sm text-green-600 dark:text-green-400">✓ {t('stairStringer.ircPass')}</p>
          )}
        </>
      )}
    </section>
  );
}
