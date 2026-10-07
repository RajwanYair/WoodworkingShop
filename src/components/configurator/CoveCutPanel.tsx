/**
 * Sprint 240 — Table-Saw Cove Cut Calculator Panel
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatMillimeters, formatNumber } from '../../i18n/format';
import { calculateCoveCut } from '../../engine/cove-cut';

export function CoveCutPanel() {
  const { t, i18n } = useTranslation();

  const [copeWidthMm, setCopeWidthMm] = useState(100);
  const [copeDepthMm, setCopeDepthMm] = useState(15);
  const [bladeDiameterMm, setBladeDiameterMm] = useState(250);
  const [bladeKerfMm, setBladeKerfMm] = useState(2.5);
  const [maxPassDepthMm, setMaxPassDepthMm] = useState(1.5);

  const result = useMemo(() => {
    try {
      return {
        data: calculateCoveCut({ copeWidthMm, copeDepthMm, bladeDiameterMm, bladeKerfMm, maxPassDepthMm }),
        error: null,
      };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [copeWidthMm, copeDepthMm, bladeDiameterMm, bladeKerfMm, maxPassDepthMm]);

  return (
    <section aria-label={t('coveCut.title')} className="space-y-3">
      <h3 className="text-wood-700 dark:text-wood-200 text-sm font-semibold tracking-wide uppercase">
        🪵 {t('coveCut.title')}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('coveCut.copeWidth')} (mm)</span>
          <input
            type="number"
            min={1}
            max={249}
            step={1}
            value={copeWidthMm}
            onChange={(e) => setCopeWidthMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-accent rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('coveCut.copeDepth')} (mm)</span>
          <input
            type="number"
            min={1}
            max={100}
            step={0.5}
            value={copeDepthMm}
            onChange={(e) => setCopeDepthMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-accent rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('coveCut.bladeDiameter')} (mm)</span>
          <input
            type="number"
            min={100}
            max={500}
            step={1}
            value={bladeDiameterMm}
            onChange={(e) => setBladeDiameterMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-accent rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('coveCut.bladeKerf')} (mm)</span>
          <input
            type="number"
            min={1}
            max={5}
            step={0.1}
            value={bladeKerfMm}
            onChange={(e) => setBladeKerfMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-accent rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('coveCut.maxPassDepth')} (mm)</span>
          <input
            type="number"
            min={0.5}
            max={5}
            step={0.25}
            value={maxPassDepthMm}
            onChange={(e) => setMaxPassDepthMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-accent rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
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
          <dt className="text-wood-500 dark:text-wood-400">{t('coveCut.fenceAngle')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {formatNumber(result.data.fenceAngleDeg, i18n.language, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
            °
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('coveCut.passCount')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {formatNumber(result.data.passCount, i18n.language)}
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('coveCut.depthPerPass')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {formatMillimeters(result.data.depthPerPassMm, i18n.language, 2)}
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('coveCut.bladeHeight')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {formatMillimeters(result.data.bladeHeightMm, i18n.language, 0)}
          </dd>
        </dl>
      )}
    </section>
  );
}
