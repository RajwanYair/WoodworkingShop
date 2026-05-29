/**
 * Sprint 236 — Honing Guide Calculator Panel
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateHoningGuide } from '../../engine/honing-guide';

export function HoningGuidePanel() {
  const { t } = useTranslation();

  const [bevelAngleDeg, setBevelAngleDeg] = useState(25);
  const [guideHeightMm, setGuideHeightMm] = useState(25);
  const [microbevelDeg, setMicrobevelDeg] = useState(0);

  const result = useMemo(() => {
    try {
      return {
        data: calculateHoningGuide({ bevelAngleDeg, guideHeightMm, microbevelDeg }),
        error: null,
      };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [bevelAngleDeg, guideHeightMm, microbevelDeg]);

  return (
    <section aria-label={t('honingGuide.title')} className="space-y-3">
      <h3 className="text-wood-700 dark:text-wood-200 text-sm font-semibold tracking-wide uppercase">
        🪚 {t('honingGuide.title')}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('honingGuide.bevelAngle')} (°)</span>
          <input
            type="number"
            min={15}
            max={45}
            step={1}
            value={bevelAngleDeg}
            onChange={(e) => setBevelAngleDeg(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('honingGuide.guideHeight')} (mm)</span>
          <input
            type="number"
            min={15}
            max={35}
            step={1}
            value={guideHeightMm}
            onChange={(e) => setGuideHeightMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 col-span-2 flex flex-col gap-1 text-sm">
          <span>{t('honingGuide.microbevel')} (°)</span>
          <input
            type="number"
            min={0}
            max={10}
            step={1}
            value={microbevelDeg}
            onChange={(e) => setMicrobevelDeg(Number(e.target.value))}
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
        <dl className="bg-wood-50 dark:bg-wood-900/40 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg p-3 text-sm">
          <dt className="text-wood-500 dark:text-wood-400">{t('honingGuide.projection')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.projectionMm.toFixed(1)} mm
          </dd>

          {result.data.microbevelProjectionMm !== null && (
            <>
              <dt className="text-wood-500 dark:text-wood-400">{t('honingGuide.microbevelProjection')}</dt>
              <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
                {result.data.microbevelProjectionMm.toFixed(1)} mm
              </dd>
            </>
          )}

          <dt className="text-wood-500 dark:text-wood-400">{t('honingGuide.bevelAngle')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.actualBevelAngleDeg}°
          </dd>
        </dl>
      )}
    </section>
  );
}
