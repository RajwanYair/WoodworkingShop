import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { useStockTrackerStore } from '../../store/stock-tracker-store';
import { checkAvailability } from '../../engine/stock-tracker';
import type { DemandEntry, StockItem } from '../../engine/stock-tracker';

const STATUS_STYLES = {
  ok: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  low: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  shortfall: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  unknown: 'bg-wood-100 text-wood-500 dark:bg-wood-800 dark:text-wood-400',
} as const;

function buildDemandFromSheets(
  sheetCosts: { material: string; qty: number }[],
): DemandEntry[] {
  const map = new Map<string, number>();
  for (const s of sheetCosts) {
    map.set(s.material, (map.get(s.material) ?? 0) + s.qty);
  }
  return Array.from(map.entries()).map(([materialKey, requiredQty]) => ({
    materialKey,
    requiredQty,
  }));
}

export function StockTrackerPanel() {
  const { t } = useTranslation();
  const { cost } = useCabinetStore();
  const { stockStore, addOrUpdateItem, setOnHand, removeItem } = useStockTrackerStore();
  const [open, setOpen] = useState(false);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editQty, setEditQty] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newReorder, setNewReorder] = useState('');

  const demand = useMemo(
    () => buildDemandFromSheets(cost.sheetCosts),
    [cost.sheetCosts],
  );
  const results = useMemo(
    () => checkAvailability(stockStore, demand),
    [stockStore, demand],
  );

  const shortfalls = results.filter((r) => r.status === 'shortfall' || r.status === 'unknown');

  function commitEdit(materialKey: string) {
    const qty = parseFloat(editQty);
    if (!isNaN(qty) && qty >= 0) setOnHand(materialKey, qty);
    setEditKey(null);
    setEditQty('');
  }

  function handleAdd() {
    const key = newKey.trim();
    if (!key) return;
    const item: StockItem = {
      materialKey: key,
      label: { en: key, he: key },
      onHandQty: parseFloat(newQty) || 0,
      unit: 'sheet',
      reorderLevel: newReorder ? parseFloat(newReorder) : undefined,
    };
    addOrUpdateItem(item);
    setNewKey('');
    setNewQty('');
    setNewReorder('');
  }

  return (
    <section className="rounded-lg border border-wood-200 bg-wood-50 dark:border-wood-700 dark:bg-wood-900/30">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-start"
      >
        <span className="flex items-center gap-2 font-semibold text-wood-800 dark:text-wood-100">
          <span aria-hidden="true">📦</span>
          {t('stockTracker.title')}
          {shortfalls.length > 0 && (
            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-600 dark:bg-red-900/40 dark:text-red-300">
              {shortfalls.length}
            </span>
          )}
        </span>
        <span aria-hidden="true" className="text-wood-400 dark:text-wood-500">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-wood-200 px-4 pb-4 pt-3 dark:border-wood-700">
          {/* Availability table */}
          {results.length > 0 ? (
            <table className="w-full text-sm" aria-label={t('stockTracker.tableAriaLabel')}>
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-wide text-wood-500 dark:text-wood-400">
                  <th className="pb-1 text-start font-semibold">{t('stockTracker.material')}</th>
                  <th className="pb-1 text-end font-semibold">{t('stockTracker.required')}</th>
                  <th className="pb-1 text-end font-semibold">{t('stockTracker.onHand')}</th>
                  <th className="pb-1 text-end font-semibold">{t('stockTracker.status')}</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.materialKey} className="border-t border-wood-100 dark:border-wood-800">
                    <td className="py-1 font-mono text-xs text-wood-700 dark:text-wood-300">
                      {r.materialKey}
                    </td>
                    <td className="py-1 text-end tabular-nums text-wood-600 dark:text-wood-400">
                      {r.required}
                    </td>
                    <td className="py-1 text-end tabular-nums">
                      {editKey === r.materialKey ? (
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={editQty}
                          onChange={(e) => setEditQty(e.target.value)}
                          onBlur={() => commitEdit(r.materialKey)}
                          onKeyDown={(e) => e.key === 'Enter' && commitEdit(r.materialKey)}
                          className="w-16 rounded border border-wood-300 px-1 text-end text-sm dark:border-wood-600 dark:bg-wood-800"
                          aria-label={t('stockTracker.editQtyAriaLabel', { key: r.materialKey })}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setEditKey(r.materialKey); setEditQty(String(r.onHand)); }}
                          className="tabular-nums underline-offset-2 hover:underline"
                          aria-label={t('stockTracker.editQtyAriaLabel', { key: r.materialKey })}
                        >
                          {r.onHand}
                        </button>
                      )}
                    </td>
                    <td className="py-1 text-end">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status]}`}>
                        {t(`stockTracker.status_${r.status}`)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-wood-400 dark:text-wood-500">{t('stockTracker.noDemand')}</p>
          )}

          {/* Existing stock items not in demand */}
          {stockStore.items
            .filter((item) => !demand.find((d) => d.materialKey === item.materialKey))
            .map((item) => (
              <div key={item.materialKey} className="flex items-center justify-between text-xs text-wood-500">
                <span className="font-mono">{item.materialKey}</span>
                <span className="tabular-nums">{item.onHandQty} {item.unit}</span>
                <button
                  type="button"
                  onClick={() => removeItem(item.materialKey)}
                  className="text-red-400 hover:text-red-600"
                  aria-label={t('stockTracker.removeAriaLabel', { key: item.materialKey })}
                >
                  ✕
                </button>
              </div>
            ))}

          {/* Add new stock item */}
          <details className="pt-1">
            <summary className="cursor-pointer text-xs text-wood-500 hover:text-wood-700 dark:hover:text-wood-300">
              {t('stockTracker.addItem')}
            </summary>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-0.5">
                <label className="text-xs text-wood-500">{t('stockTracker.materialKey')}</label>
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="plywood-18"
                  className="w-32 rounded border border-wood-300 px-2 py-1 text-xs dark:border-wood-600 dark:bg-wood-800"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-xs text-wood-500">{t('stockTracker.onHand')}</label>
                <input
                  type="number"
                  min={0}
                  value={newQty}
                  onChange={(e) => setNewQty(e.target.value)}
                  placeholder="0"
                  className="w-16 rounded border border-wood-300 px-2 py-1 text-xs dark:border-wood-600 dark:bg-wood-800"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-xs text-wood-500">{t('stockTracker.reorderAt')}</label>
                <input
                  type="number"
                  min={0}
                  value={newReorder}
                  onChange={(e) => setNewReorder(e.target.value)}
                  placeholder="—"
                  className="w-16 rounded border border-wood-300 px-2 py-1 text-xs dark:border-wood-600 dark:bg-wood-800"
                />
              </div>
              <button
                type="button"
                onClick={handleAdd}
                className="rounded-md bg-wood-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-wood-700"
              >
                {t('stockTracker.add')}
              </button>
            </div>
          </details>
        </div>
      )}
    </section>
  );
}
