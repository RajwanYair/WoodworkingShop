import { useState } from 'react';
import { formatNumber } from '../../i18n/format';
import type { CutSheet, OffcutEntry } from '../../engine/types';
import { computeOffcuts } from './compute-offcuts';
import { IconScissors, IconChevronDown, IconChevronRight } from '../layout/Icons';

interface Offcut {
  material: string;
  thickness: number;
  w: number;
  h: number;
  area: number; // mm²
}

export function OffcutsPanel({
  sheets,
  offcutCatalog,
  onSaveOffcut,
  onDeleteOffcut,
  locale,
  t,
}: {
  sheets: CutSheet[];
  offcutCatalog: OffcutEntry[];
  onSaveOffcut: (entry: OffcutEntry) => void;
  onDeleteOffcut: (id: string) => void;
  locale: string;
  t: (k: string) => string;
}) {
  const [open, setOpen] = useState(true);

  const offcuts: Offcut[] = sheets
    .flatMap((sheet) =>
      computeOffcuts(sheet).map((oc) => ({
        material: sheet.material,
        thickness: sheet.thickness,
        w: oc.w,
        h: oc.h,
        area: oc.area,
      })),
    )
    .sort((a, b) => b.area - a.area);

  if (offcuts.length === 0) return null;

  return (
    <div className="border-wood-200 dark:border-wood-700 dark:bg-wood-900 overflow-hidden rounded-xl border bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-wood-800 dark:text-wood-100 hover:bg-wood-50 dark:hover:bg-wood-800 flex w-full items-center justify-between px-4 py-3 text-sm font-semibold transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <IconScissors size={15} />
          {t('optimizer.offcuts')}
          <span className="text-wood-600 dark:text-wood-300 ml-1 text-xs font-normal">
            ({formatNumber(offcuts.length, locale)})
          </span>
        </span>
        {open ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
      </button>

      {open && (
        <div className="px-4 pb-4">
          <p className="text-wood-600 dark:text-wood-300 mb-3 text-xs">{t('optimizer.offcutsDesc')}</p>
          <div className="space-y-1.5">
            {offcuts.map((oc, i) => (
              <div
                key={i}
                className="bg-wood-50 dark:bg-wood-800 flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs"
              >
                <span className="text-wood-700 dark:text-wood-300 font-medium">
                  {oc.material} {oc.thickness}mm
                </span>
                <span className="text-wood-600 dark:text-wood-300">
                  {formatNumber(Math.round(oc.w), locale)} × {formatNumber(Math.round(oc.h), locale)} mm
                </span>
                <span className="text-wood-700 dark:text-wood-200">
                  {formatNumber(oc.area / 1_000_000, locale, { minimumFractionDigits: 3, maximumFractionDigits: 3 })} m²
                </span>
                {/* Phase 12 / Sprint 12 — save to offcut catalog */}
                <button
                  onClick={() =>
                    onSaveOffcut({
                      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                      material: oc.material,
                      thickness: oc.thickness,
                      width: Math.round(oc.w),
                      length: Math.round(oc.h),
                      addedAt: Date.now(),
                    })
                  }
                  className="border-wood-300 dark:border-wood-600 text-wood-500 dark:text-wood-400 hover:bg-wood-100 dark:hover:bg-wood-700 rounded border px-1.5 py-0.5 transition-colors"
                  title={t('optimizer.saveToOffcutCatalog')}
                  aria-label={t('optimizer.saveToOffcutCatalog')}
                >
                  ＋
                </button>
              </div>
            ))}
          </div>
          {/* Phase 12 / Sprint 12 — saved offcut catalog */}
          {offcutCatalog.length > 0 && (
            <div className="mt-4">
              <p className="text-wood-700 dark:text-wood-200 mb-2 text-xs font-semibold">
                {t('optimizer.offcutCatalog')} ({formatNumber(offcutCatalog.length, locale)})
              </p>
              <div className="space-y-1">
                {offcutCatalog.map((oc) => (
                  <div
                    key={oc.id}
                    className="border-wood-200 dark:border-wood-700 flex items-center justify-between gap-2 rounded border px-3 py-1.5 text-xs"
                  >
                    <span className="text-wood-600 dark:text-wood-300">
                      {oc.material} {formatNumber(oc.thickness, locale)}mm — {formatNumber(oc.width, locale)}×
                      {formatNumber(oc.length, locale)} mm
                    </span>
                    <button
                      onClick={() => onDeleteOffcut(oc.id)}
                      className="rounded px-1 text-red-500 transition-colors hover:text-red-700 dark:text-red-400"
                      title={t('optimizer.deleteOffcut')}
                      aria-label={t('optimizer.deleteOffcut')}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
