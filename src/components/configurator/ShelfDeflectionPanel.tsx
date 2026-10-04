import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateDeflection } from '../../engine/shelf-deflection';
import type { LoadType, ShelfMaterial } from '../../engine/shelf-deflection';

export function ShelfDeflectionPanel() {
  const { t } = useTranslation();
  const [spanMm, setSpanMm] = useState(600);
  const [widthMm, setWidthMm] = useState(300);
  const [thicknessMm, setThicknessMm] = useState(18);
  const [loadN, setLoadN] = useState(100);
  const [material, setMaterial] = useState<ShelfMaterial>('plywood');
  const [loadType, setLoadType] = useState<LoadType>('uniform');
  const [support, setSupport] = useState<'simple' | 'fixed'>('simple');
  const result = useMemo(() => {
    try {
      return {
        data: calculateDeflection({ spanMm, widthMm, thicknessMm, material, loadType, loadN, support }),
        error: null,
      };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : String(error) };
    }
  }, [spanMm, widthMm, thicknessMm, material, loadType, loadN, support]);

  return (
    <section aria-label={t('shelfDeflection.title')} className="space-y-3">
      <h3 className="text-wood-700 dark:text-wood-200 text-sm font-semibold">{t('shelfDeflection.title')}</h3>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('shelfDeflection.span')} (mm)</span>
          <input
            type="number"
            min={1}
            value={spanMm}
            onChange={(event) => setSpanMm(Number(event.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 rounded border px-2 py-1 font-mono text-sm"
          />
        </label>
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('shelfDeflection.width')} (mm)</span>
          <input
            type="number"
            min={1}
            value={widthMm}
            onChange={(event) => setWidthMm(Number(event.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 rounded border px-2 py-1 font-mono text-sm"
          />
        </label>
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('shelfDeflection.thickness')} (mm)</span>
          <input
            type="number"
            min={1}
            value={thicknessMm}
            onChange={(event) => setThicknessMm(Number(event.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 rounded border px-2 py-1 font-mono text-sm"
          />
        </label>
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('shelfDeflection.load')} (N)</span>
          <input
            type="number"
            min={0}
            value={loadN}
            onChange={(event) => setLoadN(Number(event.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 rounded border px-2 py-1 font-mono text-sm"
          />
        </label>
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('shelfDeflection.material')}</span>
          <select
            value={material}
            onChange={(event) => setMaterial(event.target.value as ShelfMaterial)}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 rounded border px-2 py-1 text-sm"
          >
            <option value="solidWood">{t('shelfDeflection.solidWood')}</option>
            <option value="plywood">{t('shelfDeflection.plywood')}</option>
            <option value="mdf">{t('shelfDeflection.mdf')}</option>
            <option value="particleboard">{t('shelfDeflection.particleboard')}</option>
            <option value="melamine">{t('shelfDeflection.melamine')}</option>
          </select>
        </label>
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('shelfDeflection.loadType')}</span>
          <select
            value={loadType}
            onChange={(event) => setLoadType(event.target.value as LoadType)}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 rounded border px-2 py-1 text-sm"
          >
            <option value="uniform">{t('shelfDeflection.uniform')}</option>
            <option value="center">{t('shelfDeflection.center')}</option>
            <option value="combined">{t('shelfDeflection.combined')}</option>
          </select>
        </label>
        <label className="text-wood-600 dark:text-wood-300 col-span-2 flex flex-col gap-1 text-sm">
          <span>{t('shelfDeflection.support')}</span>
          <select
            value={support}
            onChange={(event) => setSupport(event.target.value as 'simple' | 'fixed')}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 rounded border px-2 py-1 text-sm"
          >
            <option value="simple">{t('shelfDeflection.simple')}</option>
            <option value="fixed">{t('shelfDeflection.fixed')}</option>
          </select>
        </label>
      </div>
      {result.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {result.error}
        </p>
      )}
      {result.data && (
        <dl
          aria-live="polite"
          className="bg-wood-50 dark:bg-wood-900 grid grid-cols-2 gap-x-4 gap-y-2 rounded-md p-3 text-sm"
        >
          <dt>{t('shelfDeflection.maxDeflection')}</dt>
          <dd>{result.data.maxDeflectionMm} mm</dd>
          <dt>{t('shelfDeflection.recommendedMaxSpan')}</dt>
          <dd>{result.data.recommendedMaxSpanMm} mm</dd>
          <dt>{t('shelfDeflection.deflectionRatio')}</dt>
          <dd>1:{result.data.deflectionRatio}</dd>
          <dt>{t('shelfDeflection.exceedsLimit')}</dt>
          <dd>{t(result.data.exceedsLimit ? 'shelfDeflection.exceedsLimit' : 'shelfDeflection.withinLimit')}</dd>
        </dl>
      )}
    </section>
  );
}
