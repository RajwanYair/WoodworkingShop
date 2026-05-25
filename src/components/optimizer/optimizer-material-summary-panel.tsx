import { useState } from 'react';
import type { CutSheet, Lang } from '../../engine/types';
import { getMaterial } from '../../engine/materials';

/** Sprint 160: Material usage summary — area, sheets, cost per material. */
export function MaterialSummaryPanel({
  sheets,
  materialPriceOverrides,
  sheetSizeOverrides,
  setSheetSizeOverride,
  t,
  lang,
}: {
  sheets: CutSheet[];
  materialPriceOverrides: Record<string, number>;
  sheetSizeOverrides: Record<string, { width: number; length: number }>; // Sprint 165
  setSheetSizeOverride: (key: string, size: { width: number; length: number } | null) => void; // Sprint 165
  t: (key: string) => string;
  lang: Lang;
}) {
  const [open, setOpen] = useState(true);
  /** Sprint 165 — which material row is currently being edited */
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editW, setEditW] = useState('');
  const [editL, setEditL] = useState('');

  // Group by material + thickness — Sprint 165: include materialKey in row data
  const groups = new Map<
    string,
    {
      materialKey: string;
      name: { en: string; he: string };
      thickness: number;
      sheetArea: number;
      qty: number;
      pricePerSheet: number;
      defaultW: number;
      defaultL: number;
    }
  >();
  for (const sheet of sheets) {
    const mat = getMaterial(sheet.material);
    const key = `${sheet.material}-${sheet.thickness}`;
    if (!groups.has(key)) {
      const pricePerSheet = materialPriceOverrides[sheet.material] ?? mat.pricePerSheet ?? 0;
      groups.set(key, {
        materialKey: sheet.material,
        name: mat.name,
        thickness: sheet.thickness,
        sheetArea: (sheet.sheetWidth * sheet.sheetLength) / 1e6, // m²
        qty: 0,
        pricePerSheet,
        defaultW: mat.sheetWidth,
        defaultL: mat.sheetLength,
      });
    }
    groups.get(key)!.qty += 1;
  }

  const rows = [...groups.values()];
  if (rows.length === 0) return null;

  const startEdit = (key: string, defaultW: number, defaultL: number) => {
    const ov = sheetSizeOverrides[key];
    setEditW(String(ov?.width ?? defaultW));
    setEditL(String(ov?.length ?? defaultL));
    setEditingKey(key);
  };
  const commitEdit = (key: string) => {
    const w = parseFloat(editW);
    const l = parseFloat(editL);
    if (w > 0 && l > 0) setSheetSizeOverride(key, { width: w, length: l });
    setEditingKey(null);
  };

  return (
    <div className="border-wood-200 dark:border-wood-700 overflow-hidden rounded-lg border print:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="bg-wood-50 dark:bg-wood-800 hover:bg-wood-100 dark:hover:bg-wood-750 text-wood-700 dark:text-wood-200 flex w-full items-center justify-between px-4 py-3 text-sm font-semibold transition-colors"
      >
        {t('optimizer.materialSummary')}
        <span className="text-wood-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="overflow-x-auto px-4 pt-2 pb-4">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="text-wood-400 dark:text-wood-500 text-left">
                <th className="py-1 pr-4 font-medium">{t('optimizer.materialSummaryMaterial')}</th>
                <th className="py-1 pr-4 text-right font-medium">{t('optimizer.materialSummarySheets')}</th>
                <th className="py-1 pr-4 text-right font-medium">{t('optimizer.materialSummaryArea')}</th>
                <th className="py-1 pr-4 text-right font-medium">{t('optimizer.materialSummaryCost')}</th>
                <th className="py-1 text-right font-medium">{t('optimizer.sheetSize')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const totalArea = (row.sheetArea * row.qty).toFixed(2);
                const totalCost = row.pricePerSheet > 0 ? (row.pricePerSheet * row.qty).toFixed(0) : null;
                const hasOverride = !!sheetSizeOverrides[row.materialKey];
                const isEditing = editingKey === row.materialKey;
                return (
                  <tr key={i} className="border-wood-100 dark:border-wood-800 border-t">
                    <td className="text-wood-700 dark:text-wood-300 py-1.5 pr-4 font-medium">
                      {row.name[lang]} {row.thickness} mm
                    </td>
                    <td className="text-wood-600 dark:text-wood-300 py-1.5 pr-4 text-right">×{row.qty}</td>
                    <td className="text-wood-600 dark:text-wood-300 py-1.5 pr-4 text-right">{totalArea} m²</td>
                    <td className="text-wood-700 dark:text-wood-200 py-1.5 pr-4 text-right font-semibold">
                      {totalCost ? `₪${totalCost}` : '—'}
                    </td>
                    {/* Sprint 165 — inline sheet size override editor */}
                    <td className="py-1.5 text-right">
                      {isEditing ? (
                        <span className="inline-flex items-center gap-1">
                          <input
                            type="number"
                            min={100}
                            max={5000}
                            step={10}
                            value={editW}
                            onChange={(e) => setEditW(e.target.value)}
                            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-400 w-16 rounded border bg-white px-1 py-0.5 text-center text-xs focus:ring-1 focus:outline-none"
                            aria-label="Sheet width mm"
                          />
                          <span className="text-wood-400">×</span>
                          <input
                            type="number"
                            min={100}
                            max={5000}
                            step={10}
                            value={editL}
                            onChange={(e) => setEditL(e.target.value)}
                            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-400 w-16 rounded border bg-white px-1 py-0.5 text-center text-xs focus:ring-1 focus:outline-none"
                            aria-label="Sheet length mm"
                          />
                          <button
                            type="button"
                            onClick={() => commitEdit(row.materialKey)}
                            className="px-1 text-xs text-green-600 hover:underline dark:text-green-400"
                            title="Apply"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingKey(null)}
                            className="text-wood-400 hover:text-wood-600 px-1 text-xs"
                            title="Cancel"
                          >
                            ✗
                          </button>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <span
                            className={`font-mono ${hasOverride ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-wood-400 dark:text-wood-500'}`}
                          >
                            {hasOverride
                              ? `${sheetSizeOverrides[row.materialKey].width}×${sheetSizeOverrides[row.materialKey].length}`
                              : `${row.defaultW}×${row.defaultL}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => startEdit(row.materialKey, row.defaultW, row.defaultL)}
                            className="text-wood-400 hover:text-wood-600 dark:hover:text-wood-300 text-xs"
                            title={t('optimizer.sheetSizeEdit')}
                          >
                            ✎
                          </button>
                          {hasOverride && (
                            <button
                              type="button"
                              onClick={() => setSheetSizeOverride(row.materialKey, null)}
                              className="text-xs text-red-400 hover:text-red-600"
                              title={t('optimizer.sheetSizeReset')}
                            >
                              ↺
                            </button>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
