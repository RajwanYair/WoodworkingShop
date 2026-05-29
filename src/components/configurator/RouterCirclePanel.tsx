/**
 * Sprint 238 — Router Circle Jig Calculator Panel
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateRouterCircle } from '../../engine/router-circle';
import type { CircleCutMode } from '../../engine/router-circle';

export function RouterCirclePanel() {
  const { t } = useTranslation();

  const [targetDiameterMm, setTargetDiameterMm] = useState(300);
  const [bitDiameterMm, setBitDiameterMm] = useState(12);
  const [pivotHoleDiameterMm, setPivotHoleDiameterMm] = useState(6);
  const [cutMode, setCutMode] = useState<CircleCutMode>('disc');

  const result = useMemo(() => {
    try {
      return {
        data: calculateRouterCircle({
          targetDiameterMm,
          bitDiameterMm,
          pivotHoleDiameterMm,
          cutMode,
        }),
        error: null,
      };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [targetDiameterMm, bitDiameterMm, pivotHoleDiameterMm, cutMode]);

  return (
    <section aria-label={t('routerCircle.title')} className="space-y-3">
      <h3 className="text-wood-700 dark:text-wood-200 text-sm font-semibold tracking-wide uppercase">
        ⭕ {t('routerCircle.title')}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('routerCircle.targetDiameter')} (mm)</span>
          <input
            type="number"
            min={20}
            max={3000}
            step={1}
            value={targetDiameterMm}
            onChange={(e) => setTargetDiameterMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('routerCircle.bitDiameter')} (mm)</span>
          <input
            type="number"
            min={2}
            max={50}
            step={0.1}
            value={bitDiameterMm}
            onChange={(e) => setBitDiameterMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('routerCircle.pivotHoleDiameter')} (mm)</span>
          <input
            type="number"
            min={1}
            max={20}
            step={0.1}
            value={pivotHoleDiameterMm}
            onChange={(e) => setPivotHoleDiameterMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('routerCircle.cutMode')}</span>
          <select
            value={cutMode}
            onChange={(e) => setCutMode(e.target.value as CircleCutMode)}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 text-sm focus:ring-2 focus:outline-none"
          >
            <option value="disc">{t('routerCircle.modes.disc')}</option>
            <option value="hole">{t('routerCircle.modes.hole')}</option>
          </select>
        </label>
      </div>

      {result.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {result.error}
        </p>
      )}

      {result.data && (
        <dl className="bg-wood-50 dark:bg-wood-900/40 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg p-3 text-sm">
          <dt className="text-wood-500 dark:text-wood-400">{t('routerCircle.armLength')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.armLengthMm.toFixed(1)} mm
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('routerCircle.circumference')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.circumferenceMm.toFixed(1)} mm
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('routerCircle.area')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.areaMm2.toFixed(1)} mm²
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('routerCircle.pivotOffset')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.pivotOffsetMm.toFixed(1)} mm
          </dd>
        </dl>
      )}
    </section>
  );
}
