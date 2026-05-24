/** Sprint A3 (Phase 16.5) — extracted from OptimizerView.tsx */
import { useState } from 'react';
import { IconLightbulb, IconChevronDown, IconChevronRight } from '../layout/Icons';
import type { CutSheet } from '../../engine/types';

/** Sprint 7 — "Why this layout?" placement statistics explainer panel. */
export function OptimizerExplainerPanel({
  sheets,
  t,
}: {
  sheets: CutSheet[];
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const [open, setOpen] = useState(false);

  if (sheets.length === 0) return null;

  const totalParts = sheets.reduce((s, sh) => s + sh.parts.length, 0);
  const rotatedParts = sheets.reduce((s, sh) => s + sh.parts.filter((p) => p.rotated).length, 0);
  const grainLockedParts = sheets.reduce((s, sh) => s + sh.parts.filter((p) => p.grainVertical).length, 0);
  const overallYield =
    sheets.length > 0 ? Math.round(sheets.reduce((s, sh) => s + sh.yieldPercent, 0) / sheets.length) : 0;

  const qualityLabel =
    overallYield >= 75
      ? t('optimizer.explainer.qualityExcellent')
      : overallYield >= 55
        ? t('optimizer.explainer.qualityGood')
        : t('optimizer.explainer.qualityFair');

  const qualityColor =
    overallYield >= 75
      ? 'text-green-700 dark:text-green-400'
      : overallYield >= 55
        ? 'text-amber-700 dark:text-amber-400'
        : 'text-red-700 dark:text-red-400';

  return (
    <div className="border-wood-200 dark:border-wood-700 bg-wood-50 dark:bg-wood-900/50 rounded border print:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-wood-600 dark:text-wood-300 hover:bg-wood-100 dark:hover:bg-wood-800 flex w-full items-center justify-between rounded px-3 py-2 text-xs font-medium transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5">
          <IconLightbulb size={13} />
          {t('optimizer.explainer.title')}
          <span className={`font-semibold ${qualityColor}`}>{qualityLabel}</span>
        </span>
        {open ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
      </button>
      {open && (
        <div className="text-wood-600 dark:text-wood-300 space-y-2 px-3 pb-3 text-xs">
          <p>{t('optimizer.explainer.algorithm')}</p>
          <ul className="list-inside list-disc space-y-1">
            <li>{t('optimizer.explainer.placedParts', { total: totalParts, sheets: sheets.length })}</li>
            {rotatedParts > 0 && <li>{t('optimizer.explainer.rotatedParts', { count: rotatedParts })}</li>}
            {grainLockedParts > 0 && <li>{t('optimizer.explainer.grainLocked', { count: grainLockedParts })}</li>}
            <li>{t('optimizer.explainer.yieldResult', { yield: overallYield })}</li>
          </ul>
        </div>
      )}
    </div>
  );
}
