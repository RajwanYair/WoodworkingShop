import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { buildGrainReport } from '../../engine/grain-report';
import type { GrainMaterialGroup } from '../../engine/grain-report';

function GrainBar({ constrained, total }: { constrained: number; total: number }) {
  const pct = total > 0 ? Math.round((constrained / total) * 100) : 0;
  return (
    <div
      className="bg-wood-100 dark:bg-wood-800 flex h-2 w-full overflow-hidden rounded-full"
      role="img"
      aria-label={`${pct}%`}
    >
      <div className="h-full rounded-full bg-amber-500 transition-all duration-300" style={{ width: `${pct}%` }} />
    </div>
  );
}

function MaterialGroupRow({ group }: { group: GrainMaterialGroup }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="border-wood-100 dark:border-wood-800 border-b pb-2 last:border-0">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between py-1 text-start text-sm"
      >
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className={group.hasGrain ? 'text-amber-500' : 'text-wood-300 dark:text-wood-600'}>
            {group.hasGrain ? '⟵' : '○'}
          </span>
          <span className="text-wood-800 dark:text-wood-100 font-medium">{group.materialName}</span>
        </span>
        <span className="text-wood-500 flex items-center gap-3 text-xs">
          <span>
            {group.constrainedInstances}/{group.totalInstances} {t('grainReport.constrained')}
          </span>
          <span aria-hidden="true">{expanded ? '▲' : '▼'}</span>
        </span>
      </button>

      <GrainBar constrained={group.constrainedInstances} total={group.totalInstances} />

      {expanded && (
        <ul className="mt-2 space-y-0.5 ps-4">
          {group.parts.map((p) => (
            <li key={p.partId} className="flex items-center justify-between text-xs">
              <span className="text-wood-600 dark:text-wood-400">
                {p.name.en}
                {p.qty > 1 && <span className="text-wood-400 dark:text-wood-500 ms-1">×{p.qty}</span>}
              </span>
              <span className="text-wood-400 dark:text-wood-500 flex items-center gap-1">
                {p.length}×{p.width}
                {p.hasGrain && (
                  <span
                    title={t('grainReport.grainSensitive')}
                    className="ms-1 rounded bg-amber-100 px-1 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300"
                  >
                    {t('grainReport.grainBadge')}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function GrainReportPanel() {
  const { t } = useTranslation();
  const { allParts } = useCabinetStore();
  const [open, setOpen] = useState(false);

  const report = buildGrainReport(allParts);

  return (
    <section className="border-wood-200 bg-wood-50 dark:border-wood-700 dark:bg-wood-900/30 rounded-lg border">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-start"
      >
        <span className="text-wood-800 dark:text-wood-100 flex items-center gap-2 font-semibold">
          <span aria-hidden="true">⟵</span>
          {t('grainReport.title')}
          {report.hasAnyGrainConstraint && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-600 dark:bg-amber-900/40 dark:text-amber-300">
              {report.totalConstrained}
            </span>
          )}
        </span>
        <span aria-hidden="true" className="text-wood-400 dark:text-wood-500">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div className="border-wood-200 dark:border-wood-700 border-t px-4 pt-3 pb-4">
          {report.groups.length === 0 ? (
            <p className="text-wood-400 dark:text-wood-500 text-xs">{t('grainReport.noParts')}</p>
          ) : (
            <>
              <p className="text-wood-500 dark:text-wood-400 mb-3 text-xs">
                {t('grainReport.summary', {
                  constrained: report.totalConstrained,
                  total: report.totalParts,
                })}
              </p>
              <ul className="space-y-2">
                {report.groups.map((g) => (
                  <MaterialGroupRow key={g.materialKey} group={g} />
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}
