import { useState } from 'react';
import type { CutSheet, Lang } from '../../engine/types';
import { getMaterial } from '../../engine/materials';
import { IconList, IconChevronDown, IconChevronRight } from '../layout/Icons';

/** Sprint 150: Group sheets by material+thickness and show shopping list. */
export function ShoppingListPanel({
  sheets,
  materialPriceOverrides,
  t,
  lang,
}: {
  sheets: CutSheet[];
  materialPriceOverrides: Record<string, number>;
  t: (k: string) => string;
  lang: Lang;
}) {
  const [open, setOpen] = useState(true);

  if (sheets.length === 0) return null;

  // Group by material+thickness
  const groups = new Map<
    string,
    { material: string; thickness: number; name: { en: string; he: string }; qty: number; pricePerSheet: number }
  >();
  for (const sheet of sheets) {
    const key = `${sheet.material}-${sheet.thickness}`;
    if (!groups.has(key)) {
      const mat = getMaterial(sheet.material);
      const price = materialPriceOverrides[sheet.material] ?? mat.pricePerSheet ?? 0;
      groups.set(key, {
        material: sheet.material,
        thickness: sheet.thickness,
        name: mat.name,
        qty: 0,
        pricePerSheet: price,
      });
    }
    groups.get(key)!.qty++;
  }

  const rows = Array.from(groups.values()).sort((a, b) => b.qty - a.qty);
  const totalSheets = rows.reduce((s, r) => s + r.qty, 0);
  const totalCost = rows.reduce((s, r) => s + r.qty * r.pricePerSheet, 0);

  return (
    <div className="border-wood-200 dark:border-wood-700 dark:bg-wood-900 overflow-hidden rounded-xl border bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-wood-800 dark:text-wood-100 hover:bg-wood-50 dark:hover:bg-wood-800 flex w-full items-center justify-between px-4 py-3 text-sm font-semibold transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <IconList size={15} />
          {t('optimizer.shoppingList')}
          <span className="text-wood-600 dark:text-wood-300 ml-1 text-xs font-normal">
            {totalSheets} {t('optimizer.sheets').toLowerCase()} · ₪{totalCost.toFixed(0)}
          </span>
        </span>
        {open ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
      </button>

      {open && (
        <div className="px-4 pb-4">
          <p className="text-wood-600 dark:text-wood-300 mb-3 text-xs">{t('optimizer.shoppingListDesc')}</p>
          <div className="space-y-1.5">
            {rows.map((row) => (
              <div
                key={`${row.material}-${row.thickness}`}
                className="bg-wood-50 dark:bg-wood-800 flex items-center justify-between rounded-lg px-3 py-2 text-xs"
              >
                <span className="text-wood-700 dark:text-wood-300 flex-1 font-medium">
                  {row.name[lang]} {row.thickness} mm
                </span>
                <span className="text-wood-600 dark:text-wood-300 mx-3">×{row.qty}</span>
                <span className="text-wood-700 dark:text-wood-200 font-semibold">
                  {row.pricePerSheet > 0 ? `₪${(row.qty * row.pricePerSheet).toFixed(0)}` : '—'}
                </span>
              </div>
            ))}
          </div>
          {totalCost > 0 && (
            <div className="text-wood-800 dark:text-wood-100 mt-2 flex justify-end text-xs font-bold">
              {t('cost.total')}: ₪{totalCost.toFixed(0)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
