/**
 * Sprint 243 — Router Template Offset (Bushing Offset) Calculator Panel
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateRouterTemplate } from '../../engine/router-template';
import type { RouterTemplateCutType } from '../../engine/router-template';

export function RouterTemplatePanel() {
  const { t } = useTranslation();

  const [bushingODMm, setBushingODMm] = useState(20);
  const [bitDiameterMm, setBitDiameterMm] = useState(12);
  const [cutType, setCutType] = useState<RouterTemplateCutType>('inside');
  const [nominalDimensionMm, setNominalDimensionMm] = useState<number | ''>('');

  const result = useMemo(() => {
    try {
      return {
        data: calculateRouterTemplate({
          bushingODMm,
          bitDiameterMm,
          cutType,
          nominalDimensionMm: nominalDimensionMm === '' ? undefined : nominalDimensionMm,
        }),
        error: null,
      };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [bushingODMm, bitDiameterMm, cutType, nominalDimensionMm]);

  return (
    <section aria-label={t('routerTemplate.title')} className="space-y-3">
      <h3 className="text-wood-700 dark:text-wood-200 text-sm font-semibold tracking-wide uppercase">
        🔩 {t('routerTemplate.title')}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('routerTemplate.bushingOD')} (mm)</span>
          <input
            type="number"
            min={2}
            max={50}
            step={0.5}
            value={bushingODMm}
            onChange={(e) => setBushingODMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('routerTemplate.bitDiameter')} (mm)</span>
          <input
            type="number"
            min={1}
            max={50}
            step={0.5}
            value={bitDiameterMm}
            onChange={(e) => setBitDiameterMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('routerTemplate.cutType')}</span>
          <select
            value={cutType}
            onChange={(e) => setCutType(e.target.value as RouterTemplateCutType)}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 text-sm focus:ring-2 focus:outline-none"
          >
            <option value="inside">{t('routerTemplate.cutTypes.inside')}</option>
            <option value="outside">{t('routerTemplate.cutTypes.outside')}</option>
          </select>
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('routerTemplate.nominalDimension')} (mm)</span>
          <input
            type="number"
            min={1}
            max={3000}
            step={1}
            placeholder={t('routerTemplate.optional')}
            value={nominalDimensionMm}
            onChange={(e) => setNominalDimensionMm(e.target.value === '' ? '' : Number(e.target.value))}
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
          <dt className="text-wood-500 dark:text-wood-400">{t('routerTemplate.offset')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.offsetMm.toFixed(3)} mm
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('routerTemplate.adjustmentPerSide')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.templateAdjustmentPerSideMm > 0 ? '+' : ''}
            {result.data.templateAdjustmentPerSideMm.toFixed(3)} mm
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('routerTemplate.totalAdjustment')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.totalTemplateAdjustmentMm > 0 ? '+' : ''}
            {result.data.totalTemplateAdjustmentMm.toFixed(3)} mm
          </dd>

          {result.data.adjustedDimensionMm !== null && (
            <>
              <dt className="text-wood-500 dark:text-wood-400">{t('routerTemplate.adjustedDimension')}</dt>
              <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
                {result.data.adjustedDimensionMm.toFixed(3)} mm
              </dd>
            </>
          )}
        </dl>
      )}
    </section>
  );
}
