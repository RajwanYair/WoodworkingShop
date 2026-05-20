/**
 * Sprint 53 — Project Summary Panel
 *
 * Displays aggregate statistics across **all** cabinets in the current project:
 * - Total cabinets, total distinct parts, total sheets used (combined run)
 * - Overall yield %, total waste area (m²)
 * - Grain conflict count across the combined run
 *
 * Rendered at the top of the Optimizer tab, above the per-cabinet tables.
 * Returns null when the project has only a single cabinet.
 */
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { computePartsWeight } from '../../engine';

export function ProjectSummaryPanel() {
  const { t } = useTranslation();
  const { cabinets, allParts, combinedOptimization } = useCabinetStore();

  // Only meaningful with ≥ 2 cabinets
  if (cabinets.length < 2) return null;

  const totalSheets = combinedOptimization.totalSheets;
  const overallYield = combinedOptimization.overallYield;
  const wasteM2 = (combinedOptimization.totalWaste / 1_000_000).toFixed(3);
  const grainConflicts = combinedOptimization.grainConflictCount;
  const totalWeightKg = computePartsWeight(allParts);

  // Sprint 79 — average yield per individual sheet
  const sheets = combinedOptimization.sheets ?? [];
  const avgSheetYield =
    sheets.length > 0 ? Math.round(sheets.reduce((s, sh) => s + sh.yieldPercent, 0) / sheets.length) : 0;

  const stats: Array<{ label: string; value: string | number; warn?: boolean }> = [
    { label: t('summary.totalCabinets'), value: cabinets.length },
    { label: t('summary.totalParts'), value: allParts.length },
    { label: t('summary.totalSheets'), value: totalSheets },
    { label: t('summary.overallYield'), value: `${overallYield.toFixed(1)} %` },
    { label: t('summary.avgSheetYield'), value: `${avgSheetYield} %` },
    { label: t('summary.totalWaste'), value: `${wasteM2} m²` },
    {
      label: t('summary.grainConflicts'),
      value: grainConflicts,
      warn: grainConflicts > 0,
    },
    { label: t('summary.totalWeight'), value: `${totalWeightKg.toFixed(1)} kg` },
  ];

  return (
    <section
      className="border-wood-200 dark:border-wood-700 rounded-lg border p-4"
      aria-label={t('summary.sectionLabel')}
    >
      <h2 className="text-wood-600 dark:text-wood-300 mb-3 text-sm font-semibold">
        {t('summary.title')}
        <span className="text-wood-400 dark:text-wood-500 ms-2 text-xs font-normal">
          {cabinets.map((c) => c.name).join(' · ')}
        </span>
      </h2>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {stats.map(({ label, value, warn }) => (
          <div key={label} className="bg-wood-50 dark:bg-wood-800 rounded-md px-3 py-2">
            <dt className="text-wood-400 dark:text-wood-500 truncate text-xs">{label}</dt>
            <dd
              className={`mt-0.5 text-base font-semibold ${
                warn ? 'text-amber-600 dark:text-amber-400' : 'text-wood-700 dark:text-wood-200'
              }`}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
