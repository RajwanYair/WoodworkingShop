import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { useCostVarianceStore } from '../../store/cost-variance-store';
import { generateCostVarianceReport } from '../../engine/cost-variance';
import type { MaterialCostEntry } from '../../engine/cost-variance';

const VAR_POS = 'text-red-600 dark:text-red-400';
const VAR_NEG = 'text-green-600 dark:text-green-400';
const VAR_ZERO = 'text-wood-500 dark:text-wood-400';

function varClass(v: number) {
  if (v > 0) return VAR_POS;
  if (v < 0) return VAR_NEG;
  return VAR_ZERO;
}

function fmt(n: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export function CostVariancePanel() {
  const { t } = useTranslation();
  const { cost } = useCabinetStore();
  const { actualCosts, setActualCost } = useCostVarianceStore();
  const [open, setOpen] = useState(false);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');

  const entries = useMemo(
    (): MaterialCostEntry[] =>
      cost.sheetCosts.map((sc) => ({
        materialKey: sc.material,
        materialName: sc.materialName.en,
        estimatedCost: sc.qty * sc.pricePerSheet,
        actualCost: actualCosts[sc.material] ?? sc.qty * sc.pricePerSheet,
        offcutSaving: 0,
        coNestingSaving: 0,
        currencyCode: 'ILS',
      })),
    [cost.sheetCosts, actualCosts],
  );

  const report = useMemo(() => generateCostVarianceReport(entries), [entries]);

  function commitEdit(materialKey: string) {
    const v = parseFloat(editVal);
    if (!isNaN(v) && v >= 0) setActualCost(materialKey, v);
    setEditKey(null);
    setEditVal('');
  }

  const hasVariance = report.lines.some((l) => l.variance !== 0);

  return (
    <section className="border-wood-200 bg-wood-50 dark:border-wood-700 dark:bg-wood-900/30 rounded-lg border">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-start"
      >
        <span className="text-wood-800 dark:text-wood-100 flex items-center gap-2 font-semibold">
          <span aria-hidden="true">📊</span>
          {t('costVariance.title')}
          {hasVariance && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${report.totalVariance > 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' : 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400'}`}
            >
              {report.totalVariance > 0 ? '+' : ''}
              {report.totalVariance.toFixed(0)}
            </span>
          )}
        </span>
        <span aria-hidden="true" className="text-wood-400 dark:text-wood-500">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div className="border-wood-200 dark:border-wood-700 border-t px-4 pt-3 pb-4">
          {entries.length === 0 ? (
            <p className="text-wood-400 dark:text-wood-500 text-xs">{t('costVariance.noData')}</p>
          ) : (
            <>
              <table className="w-full text-sm" aria-label={t('costVariance.tableAriaLabel')}>
                <thead>
                  <tr className="text-wood-500 dark:text-wood-400 text-xs font-semibold tracking-wide uppercase">
                    <th className="pb-1 text-start font-semibold">{t('costVariance.material')}</th>
                    <th className="pb-1 text-end font-semibold">{t('costVariance.estimated')}</th>
                    <th className="pb-1 text-end font-semibold">{t('costVariance.actual')}</th>
                    <th className="pb-1 text-end font-semibold">{t('costVariance.variance')}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.lines.map((line) => (
                    <tr key={line.materialKey} className="border-wood-100 dark:border-wood-800 border-t">
                      <td className="text-wood-700 dark:text-wood-300 py-1 font-mono text-xs">{line.materialName}</td>
                      <td className="text-wood-500 dark:text-wood-400 py-1 text-end text-xs tabular-nums">
                        {fmt(line.estimatedCost, line.currencyCode)}
                      </td>
                      <td className="py-1 text-end text-xs tabular-nums">
                        {editKey === line.materialKey ? (
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={editVal}
                            onChange={(e) => setEditVal(e.target.value)}
                            onBlur={() => commitEdit(line.materialKey)}
                            onKeyDown={(e) => e.key === 'Enter' && commitEdit(line.materialKey)}
                            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 w-20 rounded border px-1 text-end text-xs"
                            aria-label={t('costVariance.editActualAriaLabel', { key: line.materialName })}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditKey(line.materialKey);
                              setEditVal(String(line.actualCost));
                            }}
                            className="tabular-nums underline-offset-2 hover:underline"
                            aria-label={t('costVariance.editActualAriaLabel', { key: line.materialName })}
                          >
                            {fmt(line.actualCost, line.currencyCode)}
                          </button>
                        )}
                      </td>
                      <td className={`py-1 text-end text-xs font-medium tabular-nums ${varClass(line.variance)}`}>
                        {line.variance > 0 ? '+' : ''}
                        {fmt(line.variance, line.currencyCode)}
                        <span className="text-wood-400 ms-1">
                          ({line.variancePct > 0 ? '+' : ''}
                          {line.variancePct}%)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-wood-300 dark:border-wood-600 border-t-2">
                    <td className="text-wood-700 dark:text-wood-200 py-1 text-xs font-bold">
                      {t('costVariance.total')}
                    </td>
                    <td className="py-1 text-end text-xs font-bold tabular-nums">
                      {fmt(report.totalEstimated, report.currencyCode)}
                    </td>
                    <td className="py-1 text-end text-xs font-bold tabular-nums">
                      {fmt(report.totalActual, report.currencyCode)}
                    </td>
                    <td className={`py-1 text-end text-xs font-bold tabular-nums ${varClass(report.totalVariance)}`}>
                      {report.totalVariance > 0 ? '+' : ''}
                      {fmt(report.totalVariance, report.currencyCode)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {report.totalSavings > 0 && (
                <p className="mt-2 text-xs text-green-600 dark:text-green-400">
                  {t('costVariance.savings', { amount: fmt(report.totalSavings, report.currencyCode) })}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
