import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '../../i18n/format';
import { useCabinetStore } from '../../store/cabinet-store';
import { buildCutPlanSummary } from '../../engine/cut-plan-summary';
import type { SheetPlanInput } from '../../engine/cut-plan-summary';
import type { CutSheet } from '../../engine/types';

function mm2ToM2(mm2: number, locale: string): string {
  return formatNumber(mm2 / 1_000_000, locale, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function groupSheets(sheets: CutSheet[]): SheetPlanInput[] {
  const byMaterial = new Map<string, SheetPlanInput>();
  for (const sheet of sheets) {
    const existing = byMaterial.get(sheet.material);
    const usedAreaMm2 = sheet.parts.reduce((s, p) => s + p.length * p.width, 0);
    if (existing) {
      existing.sheetCount += 1;
      existing.usedAreaMm2 += usedAreaMm2;
    } else {
      byMaterial.set(sheet.material, {
        material: sheet.material,
        sheetCount: 1,
        sheetWidthMm: sheet.sheetWidth,
        sheetLengthMm: sheet.sheetLength,
        usedAreaMm2,
      });
    }
  }
  return [...byMaterial.values()];
}

/** Collapsible cut plan summary panel — per-material waste breakdown (Sprint 103). */
export function CutPlanSummaryPanel() {
  const { t, i18n } = useTranslation();
  const { optimization } = useCabinetStore();
  const [open, setOpen] = useState(false);

  const summary = useMemo(() => buildCutPlanSummary(groupSheets(optimization.sheets)), [optimization.sheets]);

  if (optimization.sheets.length === 0) return null;

  return (
    <section className="border-wood-200 bg-wood-50 dark:border-wood-700 dark:bg-wood-900 mb-3 rounded-lg border">
      <button
        type="button"
        className="text-wood-700 dark:text-wood-200 flex w-full items-center justify-between px-3 py-2 text-sm font-semibold"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{t('cutPlanSummary.title')}</span>
        <span aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="space-y-3 px-3 pb-3">
          {/* Per-material table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-wood-200 dark:border-wood-600 text-wood-500 dark:text-wood-400 border-b">
                  <th className="pb-1 text-start font-medium">{t('cutPlanSummary.material')}</th>
                  <th className="pb-1 text-end font-medium">{t('cutPlanSummary.sheets')}</th>
                  <th className="pb-1 text-end font-medium">{t('cutPlanSummary.usedM2')}</th>
                  <th className="pb-1 text-end font-medium">{t('cutPlanSummary.wastePercent')}</th>
                </tr>
              </thead>
              <tbody>
                {summary.materials.map((mat) => (
                  <tr key={mat.material} className="border-wood-100 dark:border-wood-700 border-b last:border-0">
                    <td className="text-wood-700 dark:text-wood-200 max-w-[100px] truncate py-1 font-medium">
                      {mat.material}
                    </td>
                    <td className="py-1 text-end tabular-nums">{formatNumber(mat.sheetCount, i18n.language)}</td>
                    <td className="py-1 text-end tabular-nums">{mm2ToM2(mat.usedAreaMm2, i18n.language)}</td>
                    <td
                      className={`py-1 text-end font-medium tabular-nums ${
                        mat.wastePercent > 30
                          ? 'text-red-600 dark:text-red-400'
                          : mat.wastePercent > 15
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-green-600 dark:text-green-400'
                      }`}
                    >
                      {formatNumber(mat.wastePercent, i18n.language)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals footer */}
          <dl className="border-wood-200 dark:border-wood-600 grid grid-cols-2 gap-x-2 gap-y-1 border-t pt-2 text-sm">
            <dt className="text-wood-600 dark:text-wood-300">{t('cutPlanSummary.totalSheets')}</dt>
            <dd className="text-end font-medium tabular-nums">{formatNumber(summary.totalSheets, i18n.language)}</dd>
            <dt className="text-wood-600 dark:text-wood-300">{t('cutPlanSummary.totalUsedM2')}</dt>
            <dd className="text-end font-medium tabular-nums">{mm2ToM2(summary.totalUsedMm2, i18n.language)}</dd>
            <dt className="text-wood-600 dark:text-wood-300">{t('cutPlanSummary.overallWaste')}</dt>
            <dd
              className={`text-end font-semibold tabular-nums ${
                summary.overallWastePercent > 30
                  ? 'text-red-600 dark:text-red-400'
                  : summary.overallWastePercent > 15
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-green-600 dark:text-green-400'
              }`}
            >
              {formatNumber(summary.overallWastePercent, i18n.language)}%
            </dd>
          </dl>
        </div>
      )}
    </section>
  );
}
