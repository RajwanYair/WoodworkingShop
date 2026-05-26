import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { buildCutPlanSummary } from '../../engine/cut-plan-summary';
import type { SheetPlanInput } from '../../engine/cut-plan-summary';
import type { CutSheet } from '../../engine/types';

function mm2ToM2(mm2: number): string {
  return (mm2 / 1_000_000).toFixed(3);
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
  const { t } = useTranslation();
  const { optimization } = useCabinetStore();
  const [open, setOpen] = useState(false);

  const summary = useMemo(
    () => buildCutPlanSummary(groupSheets(optimization.sheets)),
    [optimization.sheets],
  );

  if (optimization.sheets.length === 0) return null;

  return (
    <section className="mb-3 rounded-lg border border-wood-200 bg-wood-50 dark:border-wood-700 dark:bg-wood-900">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold text-wood-700 dark:text-wood-200"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{t('cutPlanSummary.title')}</span>
        <span aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3">
          {/* Per-material table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-wood-200 dark:border-wood-600 text-wood-500 dark:text-wood-400">
                  <th className="pb-1 text-start font-medium">{t('cutPlanSummary.material')}</th>
                  <th className="pb-1 text-end font-medium">{t('cutPlanSummary.sheets')}</th>
                  <th className="pb-1 text-end font-medium">{t('cutPlanSummary.usedM2')}</th>
                  <th className="pb-1 text-end font-medium">{t('cutPlanSummary.wastePercent')}</th>
                </tr>
              </thead>
              <tbody>
                {summary.materials.map((mat) => (
                  <tr
                    key={mat.material}
                    className="border-b border-wood-100 dark:border-wood-700 last:border-0"
                  >
                    <td className="py-1 text-wood-700 dark:text-wood-200 font-medium truncate max-w-[100px]">
                      {mat.material}
                    </td>
                    <td className="py-1 text-end tabular-nums">{mat.sheetCount}</td>
                    <td className="py-1 text-end tabular-nums">{mm2ToM2(mat.usedAreaMm2)}</td>
                    <td
                      className={`py-1 text-end tabular-nums font-medium ${
                        mat.wastePercent > 30
                          ? 'text-red-600 dark:text-red-400'
                          : mat.wastePercent > 15
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-green-600 dark:text-green-400'
                      }`}
                    >
                      {mat.wastePercent}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals footer */}
          <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm border-t border-wood-200 dark:border-wood-600 pt-2">
            <dt className="text-wood-600 dark:text-wood-300">{t('cutPlanSummary.totalSheets')}</dt>
            <dd className="font-medium tabular-nums text-end">{summary.totalSheets}</dd>
            <dt className="text-wood-600 dark:text-wood-300">{t('cutPlanSummary.totalUsedM2')}</dt>
            <dd className="font-medium tabular-nums text-end">{mm2ToM2(summary.totalUsedMm2)}</dd>
            <dt className="text-wood-600 dark:text-wood-300">{t('cutPlanSummary.overallWaste')}</dt>
            <dd
              className={`font-semibold tabular-nums text-end ${
                summary.overallWastePercent > 30
                  ? 'text-red-600 dark:text-red-400'
                  : summary.overallWastePercent > 15
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-green-600 dark:text-green-400'
              }`}
            >
              {summary.overallWastePercent}%
            </dd>
          </dl>
        </div>
      )}
    </section>
  );
}
