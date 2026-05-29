/**
 * Sprint 237 — Crown Moulding Cut Calculator Panel
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateCrownMoulding } from '../../engine/crown-moulding';
import type { CrownCutMethod } from '../../engine/crown-moulding';

export function CrownMouldingPanel() {
  const { t } = useTranslation();

  const [cornerAngleDeg, setCornerAngleDeg] = useState(90);
  const [springAngleDeg, setSpringAngleDeg] = useState(38);
  const [cuttingMethod, setCuttingMethod] = useState<CrownCutMethod>('flat');

  const result = useMemo(() => {
    try {
      return {
        data: calculateCrownMoulding({ cornerAngleDeg, springAngleDeg, cuttingMethod }),
        error: null,
      };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [cornerAngleDeg, springAngleDeg, cuttingMethod]);

  return (
    <section aria-label={t('crownMoulding.title')} className="space-y-3">
      <h3 className="text-wood-700 dark:text-wood-200 text-sm font-semibold tracking-wide uppercase">
        🏛️ {t('crownMoulding.title')}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('crownMoulding.cornerAngle')} (°)</span>
          <input
            type="number"
            min={60}
            max={175}
            step={1}
            value={cornerAngleDeg}
            onChange={(e) => setCornerAngleDeg(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('crownMoulding.springAngle')} (°)</span>
          <input
            type="number"
            min={30}
            max={55}
            step={1}
            value={springAngleDeg}
            onChange={(e) => setSpringAngleDeg(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 col-span-2 flex flex-col gap-1 text-sm">
          <span>{t('crownMoulding.cuttingMethod')}</span>
          <select
            value={cuttingMethod}
            onChange={(e) => setCuttingMethod(e.target.value as CrownCutMethod)}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 text-sm focus:ring-2 focus:outline-none"
          >
            <option value="flat">{t('crownMoulding.methods.flat')}</option>
            <option value="in_position">{t('crownMoulding.methods.in_position')}</option>
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
          <dt className="text-wood-500 dark:text-wood-400">{t('crownMoulding.miterAngle')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.miterAngleDeg.toFixed(1)}°
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('crownMoulding.bevelAngle')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.bevelAngleDeg.toFixed(1)}°
          </dd>
        </dl>
      )}

      <p className="text-wood-500 dark:text-wood-400 text-xs">{t('crownMoulding.note38deg')}</p>
    </section>
  );
}
