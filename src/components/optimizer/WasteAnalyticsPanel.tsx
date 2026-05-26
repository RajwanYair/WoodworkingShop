import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { analyzeWaste, formatAreaM2 } from '../../engine/waste-analytics';
import type { OptimizationResult } from '../../engine/types';

interface Props {
  result: OptimizationResult;
}

const RATING_CLASSES = {
  excellent: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  good: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  fair: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  poor: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
} as const;

export function WasteAnalyticsPanel({ result }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const analytics = analyzeWaste(result);

  return (
    <section className="rounded-lg border border-wood-200 bg-wood-50 dark:border-wood-700 dark:bg-wood-900/30">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-start"
      >
        <span className="flex items-center gap-2 font-semibold text-wood-800 dark:text-wood-100">
          <span aria-hidden="true">📊</span>
          {t('wasteAnalytics.title')}
        </span>
        <span className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RATING_CLASSES[analytics.efficiencyRating]}`}>
            {t(`wasteAnalytics.rating.${analytics.efficiencyRating}`)}
            {' · '}
            {analytics.overallWastePercent.toFixed(1)}%
          </span>
          <span aria-hidden="true" className="text-wood-400 dark:text-wood-500">
            {open ? '▲' : '▼'}
          </span>
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-wood-200 px-4 pb-4 pt-3 dark:border-wood-700">
          {/* Summary stats row */}
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatItem label={t('wasteAnalytics.totalSheets')} value={String(analytics.totalSheets)} />
            <StatItem label={t('wasteAnalytics.totalWaste')} value={formatAreaM2(analytics.totalWasteMm2)} />
            <StatItem label={t('wasteAnalytics.offcutCandidates')} value={String(analytics.offcutCandidateCount)} />
            <StatItem label={t('wasteAnalytics.recoverableArea')} value={formatAreaM2(analytics.offcutCandidateAreaMm2)} />
          </dl>

          {/* Per-material table */}
          {analytics.byMaterial.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-wood-600 dark:text-wood-400">
                {t('wasteAnalytics.byMaterial')}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-wood-200 text-start text-xs text-wood-500 dark:border-wood-700 dark:text-wood-400">
                      <th className="pb-1 pe-3 text-start font-medium">{t('wasteAnalytics.material')}</th>
                      <th className="pb-1 pe-3 text-end font-medium">{t('wasteAnalytics.sheets')}</th>
                      <th className="pb-1 pe-3 text-end font-medium">{t('wasteAnalytics.used')}</th>
                      <th className="pb-1 text-end font-medium">{t('wasteAnalytics.waste')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.byMaterial.map((m) => (
                      <tr
                        key={m.material}
                        className="border-b border-wood-100 dark:border-wood-800"
                      >
                        <td className="py-1 pe-3 font-mono text-xs text-wood-700 dark:text-wood-300">
                          {m.material}
                        </td>
                        <td className="py-1 pe-3 text-end text-wood-600 dark:text-wood-400">{m.sheetCount}</td>
                        <td className="py-1 pe-3 text-end tabular-nums text-wood-600 dark:text-wood-400">
                          {formatAreaM2(m.usedAreaMm2)}
                        </td>
                        <td className="py-1 text-end">
                          <WasteBadge percent={m.wastePercent} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Worst sheets */}
          {analytics.worstSheets.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-wood-600 dark:text-wood-400">
                {t('wasteAnalytics.worstSheets')}
              </h3>
              <ul className="space-y-1">
                {analytics.worstSheets.map((s) => (
                  <li
                    key={`${s.material}-${s.sheetIndex}`}
                    className="flex items-center justify-between rounded bg-wood-100 px-3 py-1.5 text-xs dark:bg-wood-800/50"
                  >
                    <span className="text-wood-700 dark:text-wood-300">
                      {s.material} #{s.sheetIndex + 1}
                      {s.offcutCandidate && (
                        <span className="ms-2 rounded bg-green-100 px-1 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          {t('wasteAnalytics.offcutTag')}
                        </span>
                      )}
                    </span>
                    <WasteBadge percent={s.wastePercent} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Offcut hint */}
          {analytics.offcutCandidateCount > 0 && (
            <p className="rounded bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
              💡 {t('wasteAnalytics.offcutHint', { count: analytics.offcutCandidateCount })}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatItemProps {
  label: string;
  value: string;
}

function StatItem({ label, value }: StatItemProps) {
  return (
    <div className="rounded bg-white px-3 py-2 shadow-sm dark:bg-wood-800/50">
      <dt className="text-xs text-wood-500 dark:text-wood-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold tabular-nums text-wood-800 dark:text-wood-100">{value}</dd>
    </div>
  );
}

interface WasteBadgeProps {
  percent: number;
}

function WasteBadge({ percent }: WasteBadgeProps) {
  const cls =
    percent <= 10
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      : percent <= 20
        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';

  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium tabular-nums ${cls}`}>
      {percent.toFixed(1)}%
    </span>
  );
}
