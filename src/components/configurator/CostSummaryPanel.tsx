import { useTranslation } from 'react-i18next';
import { formatNumber } from '../../i18n/format';
import { useCabinetStore } from '../../store/cabinet-store';
import { buildCostSummary, costSummaryToCsv } from '../../engine/cost-summary-export';
import { useState } from 'react';

function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function CostSummaryPanel() {
  const { t, i18n } = useTranslation();
  const cost = useCabinetStore((s) => s.cost);
  const [open, setOpen] = useState(false);

  const summary = buildCostSummary(cost);

  function handleExport() {
    const csv = costSummaryToCsv(summary);
    downloadCsv(csv, 'cost-summary.csv');
  }

  return (
    <section className="border-wood-200 bg-wood-50 dark:border-wood-700 dark:bg-wood-900/30 rounded-lg border">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-start"
      >
        <span className="text-wood-800 dark:text-wood-100 flex items-center gap-2 font-semibold">
          <span aria-hidden="true">💰</span>
          {t('costSummary.title')}
        </span>
        <span className="text-wood-500 dark:text-wood-400 flex items-center gap-2 text-sm tabular-nums">
          <span className="text-wood-700 dark:text-wood-200 font-medium">
            {summary.currency}
            {formatNumber(summary.totalCost, i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span aria-hidden="true" className="text-wood-400 dark:text-wood-500">
            {open ? '▲' : '▼'}
          </span>
        </span>
      </button>

      {open && (
        <div className="border-wood-200 dark:border-wood-700 space-y-3 border-t px-4 pt-3 pb-4">
          {/* Line items */}
          <table className="w-full text-sm" aria-label={t('costSummary.tableAriaLabel')}>
            <thead>
              <tr className="text-wood-500 dark:text-wood-400 text-xs font-semibold tracking-wide uppercase">
                <th className="pb-1 text-start font-semibold">{t('costSummary.category')}</th>
                <th className="pb-1 text-end font-semibold">{t('costSummary.amount')}</th>
                <th className="pb-1 text-end font-semibold">{t('costSummary.share')}</th>
              </tr>
            </thead>
            <tbody>
              {summary.lines.map((line) => (
                <tr key={line.labelKey} className="border-wood-100 dark:border-wood-800 border-t">
                  <td className="text-wood-700 dark:text-wood-300 py-1">{t(line.labelKey)}</td>
                  <td className="text-wood-800 dark:text-wood-200 py-1 text-end tabular-nums">
                    {summary.currency}
                    {formatNumber(line.amount, i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="text-wood-400 dark:text-wood-500 py-1 text-end tabular-nums">
                    {formatNumber(line.pct, i18n.language, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-wood-300 dark:border-wood-600 border-t-2 font-semibold">
                <td className="text-wood-800 dark:text-wood-100 pt-2">{t('costSummary.total')}</td>
                <td className="text-wood-800 dark:text-wood-100 pt-2 text-end tabular-nums">
                  {summary.currency}
                  {formatNumber(summary.totalCost, i18n.language, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="text-wood-500 pt-2 text-end tabular-nums">{formatNumber(100, i18n.language)}%</td>
              </tr>
            </tfoot>
          </table>

          {/* Export button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleExport}
              className="bg-accent hover:bg-accent-hover rounded-md px-3 py-1.5 text-xs font-medium text-white"
            >
              {t('costSummary.exportCsv')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
