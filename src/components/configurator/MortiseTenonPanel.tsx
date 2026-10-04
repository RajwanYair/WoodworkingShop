import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateMortiseTenon } from '../../engine/mortise-tenon';
import type { MortiseTenonType } from '../../engine/mortise-tenon';

export function MortiseTenonPanel() {
  const { t } = useTranslation();
  const [stockThicknessMm, setStockThicknessMm] = useState(18);
  const [stockWidthMm, setStockWidthMm] = useState(90);
  const [jointType, setJointType] = useState<MortiseTenonType>('blind');
  const result = useMemo(() => {
    try {
      return { data: calculateMortiseTenon({ stockThicknessMm, stockWidthMm, jointType }), error: null };
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
            min={1}
            value={stockThicknessMm}
            onChange={(event) => setStockThicknessMm(Number(event.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 rounded border px-2 py-1 font-mono text-sm"
          />
        </label>
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('mortiseTenon.stockWidth')} (mm)</span>
          <input
            type="number"
            min={1}
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
            <option value="through">{t('mortiseTenon.through')}</option>
            <option value="blind">{t('mortiseTenon.blind')}</option>
            <option value="wedged">{t('mortiseTenon.wedged')}</option>
            <option value="stub">{t('mortiseTenon.stub')}</option>
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
          <dt>{t('mortiseTenon.tenonThickness')}</dt>
          <dd>{result.data.tenonThicknessMm} mm</dd>
          <dt>{t('mortiseTenon.tenonWidth')}</dt>
          <dd>{result.data.tenonWidthMm} mm</dd>
          <dt>{t('mortiseTenon.tenonLength')}</dt>
          <dd>{result.data.tenonLengthMm} mm</dd>
          <dt>{t('mortiseTenon.recommendedChisel')}</dt>
          <dd>{result.data.recommendedChiselMm} mm</dd>
        </dl>
      )}
    </section>
  );
}
