import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateDeflection, type LoadType, type ShelfMaterial } from '../../engine/shelf-deflection';

const MATERIALS: ShelfMaterial[] = ['solidWood', 'plywood', 'mdf', 'particleboard', 'melamine'];
const LOAD_TYPES: LoadType[] = ['uniform', 'center', 'combined'];

export function ShelfDeflectionPanel() {
  const { t } = useTranslation();
  const [spanMm, setSpanMm] = useState(800);
  const [widthMm, setWidthMm] = useState(400);
  const [thicknessMm, setThicknessMm] = useState(18);
  const [material, setMaterial] = useState<ShelfMaterial>('plywood');
  const [loadType, setLoadType] = useState<LoadType>('uniform');
  const [loadKg, setLoadKg] = useState(20);
  const [support, setSupport] = useState<'simple' | 'fixed'>('simple');

  const result = useMemo(() => {
    try {
      return {
        data: calculateDeflection({
          spanMm,
          widthMm,
          thicknessMm,
          material,
          loadType,
          loadN: loadKg * 9.81,
          support,
        }),
        error: null,
      };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : String(error) };
    }
  }, [spanMm, widthMm, thicknessMm, material, loadType, loadKg, support]);

  return (
    <section aria-label={t('shelfDeflection.title')} className="space-y-3">
      <h3 className="text-wood-700 dark:text-wood-200 text-sm font-semibold">{t('shelfDeflection.title')}</h3>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('shelfDeflection.span')} (mm)</span>
          <input
            type="number"
            min="1"
            value={spanMm}
            onChange={(event) => setSpanMm(Number(event.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 rounded border px-2 py-1 font-mono text-sm"
          />
        </label>
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('shelfDeflection.width')} (mm)</span>
          <input
            type="number"
            min="1"
            value={widthMm}
            onChange={(event) => setWidthMm(Number(event.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 rounded border px-2 py-1 font-mono text-sm"
          />
        </label>
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('shelfDeflection.thickness')} (mm)</span>
          <input
            type="number"
            min="1"
            value={thicknessMm}
            onChange={(event) => setThicknessMm(Number(event.target.value))}
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
            {MATERIALS.map((option) => (
              <option key={option} value={option}>
                {t(`shelfDeflection.${option}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('shelfDeflection.load')} (kg)</span>
          <input
            type="number"
            min="0"
            step="0.5"
            value={loadKg}
            onChange={(event) => setLoadKg(Number(event.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 rounded border px-2 py-1 font-mono text-sm"
          />
        </label>
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('shelfDeflection.loadType')}</span>
          <select
            value={loadType}
            onChange={(event) => setLoadType(event.target.value as LoadType)}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 rounded border px-2 py-1 text-sm"
          >
            {LOAD_TYPES.map((option) => (
              <option key={option} value={option}>
                {t(`shelfDeflection.${option}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
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
      {result.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {result.error}
        </p>
      )}
      {result.data && (
        <dl
          aria-live="polite"
          className="bg-wood-50 dark:bg-wood-800 grid grid-cols-2 gap-x-4 gap-y-1 rounded-md p-3 text-sm"
        >
          <dt className="text-wood-500 dark:text-wood-400">{t('shelfDeflection.maxDeflection')}</dt>
          <dd className="font-mono">{result.data.maxDeflectionMm.toFixed(2)} mm</dd>
          <dt className="text-wood-500 dark:text-wood-400">{t('shelfDeflection.recommendedMaxSpan')}</dt>
          <dd className="font-mono">{result.data.recommendedMaxSpanMm} mm</dd>
          <dt className="text-wood-500 dark:text-wood-400">{t('shelfDeflection.deflectionRatio')}</dt>
          <dd className="font-mono">
            {Number.isFinite(result.data.deflectionRatio) ? `L/${result.data.deflectionRatio}` : '∞'}
          </dd>
          <dt className="text-wood-500 dark:text-wood-400">{t('shelfDeflection.exceedsLimit')}</dt>
          <dd
            className={
              result.data.exceedsLimit ? 'text-amber-700 dark:text-amber-400' : 'text-green-700 dark:text-green-400'
            }
          >
            {t(result.data.exceedsLimit ? 'shelfDeflection.yes' : 'shelfDeflection.no')}
          </dd>
        </dl>
      )}
    </section>
  );
}
