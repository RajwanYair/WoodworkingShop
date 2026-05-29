/**
 * Sprint 241 — Wood Moisture Content & Shrinkage Calculator Panel
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateMoistureShrinkage } from '../../engine/moisture-shrinkage';
import type { MoistureShrinkageSpecies, WoodGrainDirection } from '../../engine/moisture-shrinkage';

export function MoistureShrinkagePanel() {
  const { t } = useTranslation();

  const [initialMCPct, setInitialMCPct] = useState(25);
  const [targetMCPct, setTargetMCPct] = useState(8);
  const [species, setSpecies] = useState<MoistureShrinkageSpecies>('oak');
  const [dimensionMm, setDimensionMm] = useState(200);
  const [grain, setGrain] = useState<WoodGrainDirection>('tangential');

  const result = useMemo(() => {
    try {
      return {
        data: calculateMoistureShrinkage({ initialMCPct, targetMCPct, species, dimensionMm, grain }),
        error: null,
      };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [initialMCPct, targetMCPct, species, dimensionMm, grain]);

  const speciesOptions: MoistureShrinkageSpecies[] = [
    'oak',
    'maple',
    'cherry',
    'walnut',
    'pine',
    'douglas_fir',
    'cedar',
    'generic_hardwood',
    'generic_softwood',
  ];

  return (
    <section aria-label={t('moistureShrinkage.title')} className="space-y-3">
      <h3 className="text-wood-700 dark:text-wood-200 text-sm font-semibold tracking-wide uppercase">
        💧 {t('moistureShrinkage.title')}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('moistureShrinkage.initialMC')} (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={initialMCPct}
            onChange={(e) => setInitialMCPct(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('moistureShrinkage.targetMC')} (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={targetMCPct}
            onChange={(e) => setTargetMCPct(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('moistureShrinkage.species')}</span>
          <select
            value={species}
            onChange={(e) => setSpecies(e.target.value as MoistureShrinkageSpecies)}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 text-sm focus:ring-2 focus:outline-none"
          >
            {speciesOptions.map((s) => (
              <option key={s} value={s}>
                {t(`moistureShrinkage.species_${s}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('moistureShrinkage.grain')}</span>
          <select
            value={grain}
            onChange={(e) => setGrain(e.target.value as WoodGrainDirection)}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 text-sm focus:ring-2 focus:outline-none"
          >
            <option value="tangential">{t('moistureShrinkage.grains.tangential')}</option>
            <option value="radial">{t('moistureShrinkage.grains.radial')}</option>
          </select>
        </label>

        <label className="text-wood-600 dark:text-wood-300 col-span-2 flex flex-col gap-1 text-sm">
          <span>{t('moistureShrinkage.dimension')} (mm)</span>
          <input
            type="number"
            min={1}
            max={3000}
            step={1}
            value={dimensionMm}
            onChange={(e) => setDimensionMm(Number(e.target.value))}
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
          <dt className="text-wood-500 dark:text-wood-400">{t('moistureShrinkage.effectiveMCChange')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.effectiveMCChangePct.toFixed(1)} %
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('moistureShrinkage.changeAmount')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.changeAmountMm.toFixed(2)} mm
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('moistureShrinkage.finalDimension')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.finalDimensionMm.toFixed(2)} mm
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('moistureShrinkage.coefficient')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.shrinkageCoefficient.toFixed(5)}
          </dd>
        </dl>
      )}
    </section>
  );
}
