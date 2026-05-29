/**
 * Sprint 233 — Wood Glue Coverage Calculator Panel
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateGlueCoverage } from '../../engine/glue-coverage';
import type { GlueType } from '../../engine/glue-coverage';

const GLUE_TYPES: GlueType[] = ['pva', 'polyurethane', 'epoxy', 'hide', 'ca'];

export function GlueCoveragePanel() {
  const { t } = useTranslation();

  const [surfaceAreaMm2, setSurfaceAreaMm2] = useState(50000);
  const [glueType, setGlueType] = useState<GlueType>('pva');
  const [jointCount, setJointCount] = useState(1);

  const result = useMemo(() => {
    try {
      return {
        data: calculateGlueCoverage({ surfaceAreaMm2, glueType, jointCount }),
        error: null,
      };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [surfaceAreaMm2, glueType, jointCount]);

  return (
    <section aria-label={t('glueCoverage.title')} className="space-y-3">
      <h3 className="text-wood-700 dark:text-wood-200 text-sm font-semibold tracking-wide uppercase">
        🧴 {t('glueCoverage.title')}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('glueCoverage.surfaceArea')} (mm²)</span>
          <input
            type="number"
            min={100}
            max={10000000}
            step={1000}
            value={surfaceAreaMm2}
            onChange={(e) => setSurfaceAreaMm2(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('glueCoverage.jointCount')}</span>
          <input
            type="number"
            min={1}
            max={100}
            step={1}
            value={jointCount}
            onChange={(e) => setJointCount(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 col-span-2 flex flex-col gap-1 text-sm">
          <span>{t('glueCoverage.glueType')}</span>
          <select
            value={glueType}
            onChange={(e) => setGlueType(e.target.value as GlueType)}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 text-sm focus:ring-2 focus:outline-none"
          >
            {GLUE_TYPES.map((gt) => (
              <option key={gt} value={gt}>
                {t(`glueCoverage.types.${gt}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {result.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {result.error}
        </p>
      )}

      {result.data && (
        <dl className="bg-wood-50 dark:bg-wood-900 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg p-3 text-sm">
          <dt className="text-wood-500 dark:text-wood-400">{t('glueCoverage.netVolume')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">{result.data.netVolumeMl} mL</dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('glueCoverage.recommendedVolume')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.recommendedVolumeMl} mL
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('glueCoverage.openTime')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">{result.data.openTimeMin} min</dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('glueCoverage.clampingTime')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.clampingTimeMin} min
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('glueCoverage.cureTime')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">{result.data.cureTimeHours} h</dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('glueCoverage.spreadRate')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.spreadRateM2PerL} m²/L
          </dd>
        </dl>
      )}
    </section>
  );
}
