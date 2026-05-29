/**
 * Sprint 242 — Rafter Length & Birdsmouth Calculator Panel
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateRafterLength } from '../../engine/rafter-length';

export function RafterLengthPanel() {
  const { t } = useTranslation();

  const [totalSpanMm, setTotalSpanMm] = useState(6000);
  const [pitchRatio, setPitchRatio] = useState(0.5);
  const [plateWidthMm, setPlateWidthMm] = useState(89);
  const [overhangMm, setOverhangMm] = useState(450);
  const [shedRoof, setShedRoof] = useState(false);

  const result = useMemo(() => {
    try {
      return {
        data: calculateRafterLength({ totalSpanMm, pitchRatio, plateWidthMm, overhangMm, shedRoof }),
        error: null,
      };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [totalSpanMm, pitchRatio, plateWidthMm, overhangMm, shedRoof]);

  return (
    <section aria-label={t('rafterLength.title')} className="space-y-3">
      <h3 className="text-wood-700 dark:text-wood-200 text-sm font-semibold tracking-wide uppercase">
        🏠 {t('rafterLength.title')}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('rafterLength.totalSpan')} (mm)</span>
          <input
            type="number"
            min={500}
            max={30000}
            step={100}
            value={totalSpanMm}
            onChange={(e) => setTotalSpanMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('rafterLength.pitchRatio')} (rise/run)</span>
          <input
            type="number"
            min={0.1}
            max={3}
            step={0.1}
            value={pitchRatio}
            onChange={(e) => setPitchRatio(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('rafterLength.plateWidth')} (mm)</span>
          <input
            type="number"
            min={38}
            max={200}
            step={1}
            value={plateWidthMm}
            onChange={(e) => setPlateWidthMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('rafterLength.overhang')} (mm)</span>
          <input
            type="number"
            min={0}
            max={2000}
            step={50}
            value={overhangMm}
            onChange={(e) => setOverhangMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 col-span-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={shedRoof}
            onChange={(e) => setShedRoof(e.target.checked)}
            className="accent-wood-600"
          />
          <span>{t('rafterLength.shedRoof')}</span>
        </label>
      </div>

      {result.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {result.error}
        </p>
      )}

      {result.data && (
        <dl className="bg-wood-50 dark:bg-wood-900/40 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg p-3 text-sm">
          <dt className="text-wood-500 dark:text-wood-400">{t('rafterLength.run')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.runMm.toFixed(0)} mm
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('rafterLength.rise')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.riseMm.toFixed(1)} mm
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('rafterLength.rafterLength')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.rafterLengthMm.toFixed(1)} mm
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('rafterLength.totalLength')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.totalLengthMm.toFixed(1)} mm
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('rafterLength.plumbCut')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.plumbCutAngleDeg.toFixed(2)}°
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('rafterLength.seatCut')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.seatCutAngleDeg.toFixed(2)}°
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('rafterLength.birdsmouthDepth')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.birdsmouthDepthMm.toFixed(1)} mm
          </dd>
        </dl>
      )}
    </section>
  );
}
