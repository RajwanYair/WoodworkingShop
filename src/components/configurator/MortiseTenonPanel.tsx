import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateMortiseTenon, type MortiseTenonType } from '../../engine/mortise-tenon';

const JOINT_TYPES: MortiseTenonType[] = ['through', 'blind', 'wedged', 'stub'];

export function MortiseTenonPanel() {
  const { t } = useTranslation();
  const [stockThicknessMm, setStockThicknessMm] = useState(18);
  const [stockWidthMm, setStockWidthMm] = useState(54);
  const [jointType, setJointType] = useState<MortiseTenonType>('through');

  const result = useMemo(() => {
    try {
      return {
        data: calculateMortiseTenon({ stockThicknessMm, stockWidthMm, jointType }),
        error: null,
      };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : String(error) };
    }
  }, [stockThicknessMm, stockWidthMm, jointType]);

  return (
    <section aria-label={t('mortiseTenon.title')} className="space-y-3">
      <h3 className="text-wood-700 dark:text-wood-200 text-sm font-semibold">{t('mortiseTenon.title')}</h3>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('mortiseTenon.stockThickness')} (mm)</span>
          <input
            type="number"
            min="1"
            value={stockThicknessMm}
            onChange={(event) => setStockThicknessMm(Number(event.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 rounded border px-2 py-1 font-mono text-sm"
          />
        </label>
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('mortiseTenon.stockWidth')} (mm)</span>
          <input
            type="number"
            min="1"
            value={stockWidthMm}
            onChange={(event) => setStockWidthMm(Number(event.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 rounded border px-2 py-1 font-mono text-sm"
          />
        </label>
        <label className="text-wood-600 dark:text-wood-300 col-span-2 flex flex-col gap-1 text-sm">
          <span>{t('mortiseTenon.jointType')}</span>
          <select
            value={jointType}
            onChange={(event) => setJointType(event.target.value as MortiseTenonType)}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 rounded border px-2 py-1 text-sm"
          >
            {JOINT_TYPES.map((option) => (
              <option key={option} value={option}>
                {t(`mortiseTenon.${option}`)}
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
        <dl
          aria-live="polite"
          className="bg-wood-50 dark:bg-wood-800 grid grid-cols-2 gap-x-4 gap-y-1 rounded-md p-3 text-sm"
        >
          <dt className="text-wood-500 dark:text-wood-400">{t('mortiseTenon.tenonThickness')}</dt>
          <dd className="font-mono">{result.data.tenonThicknessMm} mm</dd>
          <dt className="text-wood-500 dark:text-wood-400">{t('mortiseTenon.tenonWidth')}</dt>
          <dd className="font-mono">{result.data.tenonWidthMm} mm</dd>
          <dt className="text-wood-500 dark:text-wood-400">{t('mortiseTenon.tenonLength')}</dt>
          <dd className="font-mono">{result.data.tenonLengthMm} mm</dd>
          <dt className="text-wood-500 dark:text-wood-400">{t('mortiseTenon.mortiseDepth')}</dt>
          <dd className="font-mono">{result.data.mortiseDepthMm} mm</dd>
          <dt className="text-wood-500 dark:text-wood-400">{t('mortiseTenon.recommendedChisel')}</dt>
          <dd className="font-mono">{result.data.recommendedChiselMm} mm</dd>
          <dt className="text-wood-500 dark:text-wood-400">{t('mortiseTenon.glueSurfaceArea')}</dt>
          <dd className="font-mono">{result.data.glueSurfaceAreaMm2} mm²</dd>
        </dl>
      )}
    </section>
  );
}
