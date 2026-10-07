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
import { formatNumber } from '../../i18n/format';
import { useCabinetStore } from '../../store/cabinet-store';
import { computePartsWeight, generateHardware } from '../../engine';
import { estimateBuildTimeForProject } from '../../utils/project-build-estimate';

export function ProjectSummaryPanel() {
  const { t, i18n } = useTranslation();
  const { cabinets, allParts, combinedOptimization, labourHours } = useCabinetStore();

  // Only meaningful with ≥ 2 cabinets
  if (cabinets.length < 2) return null;

  const totalSheets = combinedOptimization.totalSheets;
  const overallYield = combinedOptimization.overallYield;
  const wasteM2 = formatNumber(combinedOptimization.totalWaste / 1_000_000, i18n.language, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
  const grainConflicts = combinedOptimization.grainConflictCount;
  const totalWeightKg = computePartsWeight(allParts);
  const allHardware = cabinets.flatMap((cabinet) => generateHardware(cabinet.config));
  const estimatedTime = estimateBuildTimeForProject(allParts, cabinets.length, allHardware);

  // Sprint 79 — average yield per individual sheet
  const sheets = combinedOptimization.sheets ?? [];
  const avgSheetYield =
    sheets.length > 0 ? Math.round(sheets.reduce((s, sh) => s + sh.yieldPercent, 0) / sheets.length) : 0;

  const stats: Array<{ label: string; value: string | number; warn?: boolean }> = [
    { label: t('summary.totalCabinets'), value: formatNumber(cabinets.length, i18n.language) },
    { label: t('summary.totalParts'), value: formatNumber(allParts.length, i18n.language) },
    { label: t('summary.totalSheets'), value: formatNumber(totalSheets, i18n.language) },
    {
      label: t('summary.overallYield'),
      value: `${formatNumber(overallYield, i18n.language, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`,
    },
    { label: t('summary.avgSheetYield'), value: `${formatNumber(avgSheetYield, i18n.language)} %` },
    { label: t('summary.totalWaste'), value: `${wasteM2} m²` },
    {
      label: t('summary.grainConflicts'),
      value: formatNumber(grainConflicts, i18n.language),
      warn: grainConflicts > 0,
    },
    {
      label: t('summary.totalWeight'),
      value: `${formatNumber(totalWeightKg, i18n.language, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`,
    },
    {
      label: t('summary.estimatedLabour'),
      value: labourHours > 0 ? `${formatNumber(labourHours, i18n.language)} h` : t('cost.notSet', '—'),
    },
    {
      label: t('timeEstimator.totalTime'),
      value: `${estimatedTime.totalHours.toFixed(1)} ${t('timeEstimator.hours')}`,
    },
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
