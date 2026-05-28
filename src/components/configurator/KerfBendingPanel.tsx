/**
 * Sprint 225 — Kerf Bending Calculator Panel
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateKerfBending, type KerfMaterial } from '../../engine/kerf-bending';

const MATERIALS: KerfMaterial[] = ['plywood', 'mdf', 'softwood', 'hardwood'];

export function KerfBendingPanel() {
  const { t } = useTranslation();

  const [thicknessMm, setThicknessMm] = useState(18);
  const [bendRadiusMm, setBendRadiusMm] = useState(150);
  const [kerfWidthMm, setKerfWidthMm] = useState(3.2);
  const [material, setMaterial] = useState<KerfMaterial>('plywood');

  const result = useMemo(() => {
    try {
      return {
        data: calculateKerfBending({ thicknessMm, bendRadiusMm, kerfWidthMm, material }),
        error: null,
      };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [thicknessMm, bendRadiusMm, kerfWidthMm, material]);

  return (
    <section aria-label={t('kerfBending.title')} className="space-y-3">
      <h3 className="text-wood-700 dark:text-wood-200 text-sm font-semibold tracking-wide uppercase">
        🪚 {t('kerfBending.title')}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('kerfBending.thickness')} (mm)</span>
          <input
            type="number"
            min={6}
            max={50}
            step={1}
            value={thicknessMm}
            onChange={(e) => setThicknessMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('kerfBending.bendRadius')} (mm)</span>
          <input
            type="number"
            min={50}
            max={1000}
            step={10}
            value={bendRadiusMm}
            onChange={(e) => setBendRadiusMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('kerfBending.kerfWidth')} (mm)</span>
          <input
            type="number"
            min={1}
            max={8}
            step={0.1}
            value={kerfWidthMm}
            onChange={(e) => setKerfWidthMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>
      </div>

      <fieldset>
        <legend className="text-wood-600 dark:text-wood-300 mb-1 text-sm">{t('kerfBending.material')}</legend>
        <div className="flex flex-wrap gap-1">
          {MATERIALS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMaterial(m)}
              className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                material === m
                  ? 'bg-wood-600 text-white'
                  : 'bg-wood-100 text-wood-700 dark:bg-wood-700 dark:text-wood-200 hover:bg-wood-200 dark:hover:bg-wood-600'
              }`}
            >
              {t(`kerfBending.${m}`)}
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
          {result.data.warningKey && (
            <p role="alert" className="text-sm text-amber-700 dark:text-amber-400">
              ⚠ {t(`kerfBending.${result.data.warningKey}`)}
            </p>
          )}
          {result.data.isFeasible && (
            <dl
              aria-live="polite"
              aria-label={t('kerfBending.title')}
              className="bg-wood-50 dark:bg-wood-800 grid grid-cols-2 gap-x-4 gap-y-1 rounded-md p-3 text-sm"
            >
              <dt className="text-wood-500 dark:text-wood-400">{t('kerfBending.kerfSpacing')}</dt>
              <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
                {result.data.kerfSpacingMm.toFixed(1)} mm
              </dd>

              <dt className="text-wood-500 dark:text-wood-400">{t('kerfBending.kerfDepth')}</dt>
              <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
                {result.data.kerfDepthMm.toFixed(1)} mm
              </dd>

              <dt className="text-wood-500 dark:text-wood-400">{t('kerfBending.remainingThickness')}</dt>
              <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
                {result.data.remainingThicknessMm.toFixed(1)} mm
              </dd>

              <dt className="text-wood-500 dark:text-wood-400">{t('kerfBending.kerfCount')}</dt>
              <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">{result.data.kerfCount}</dd>
            </dl>
          )}
        </>
      )}
    </section>
  );
}
