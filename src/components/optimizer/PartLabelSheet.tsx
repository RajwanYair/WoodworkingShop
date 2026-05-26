import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { assignPartLabels } from '../../engine/part-labeling';
import type { LabeledPart } from '../../engine/part-labeling';

interface LabelCardProps {
  part: LabeledPart;
}

function LabelCard({ part }: LabelCardProps) {
  return (
    <li className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 flex flex-col items-center justify-center gap-0.5 rounded border bg-white p-2 text-center shadow-sm">
      <span className="text-wood-800 dark:text-wood-100 font-mono text-lg font-bold tracking-wider">
        {part.partLabel}
      </span>
      <span className="text-wood-600 dark:text-wood-300 line-clamp-1 text-xs">{part.name.en}</span>
      <span className="text-wood-400 dark:text-wood-500 text-xs tabular-nums">
        {part.length}&thinsp;×&thinsp;{part.width}
      </span>
      <span className="text-wood-400 dark:text-wood-500 truncate text-xs">{part.material}</span>
      {part.qty > 1 && (
        <span className="bg-wood-100 text-wood-500 dark:bg-wood-700 dark:text-wood-400 rounded-full px-1.5 text-xs">
          ×{part.qty}
        </span>
      )}
    </li>
  );
}

export function PartLabelSheet() {
  const { t } = useTranslation();
  const { allParts } = useCabinetStore();
  const [open, setOpen] = useState(false);
  const [expandQty, setExpandQty] = useState(false);

  const labeled = useMemo(() => assignPartLabels(allParts, { expandMultiQty: expandQty }), [allParts, expandQty]);

  function handlePrint() {
    const printContent = labeled
      .map(
        (p) =>
          `<div class="label"><strong>${p.partLabel}</strong><br>${p.name.en}<br>${p.length} × ${p.width}<br>${p.material}${p.qty > 1 ? ` ×${p.qty}` : ''}</div>`,
      )
      .join('');

    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) return;
    win.document.write(
      `<!DOCTYPE html><html><head><title>${t('partLabels.printTitle')}</title>` +
        `<style>body{font-family:monospace;margin:8mm}` +
        `.label{display:inline-block;border:1px solid #888;padding:4mm 6mm;margin:2mm;text-align:center;min-width:40mm;font-size:10pt}` +
        `strong{font-size:14pt;display:block;margin-bottom:2mm}` +
        `@media print{.no-print{display:none}}</style>` +
        `</head><body>${printContent}</body></html>`,
    );
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <section className="border-wood-200 bg-wood-50 dark:border-wood-700 dark:bg-wood-900/30 rounded-lg border">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-start"
      >
        <span className="text-wood-800 dark:text-wood-100 flex items-center gap-2 font-semibold">
          <span aria-hidden="true">🏷️</span>
          {t('partLabels.title')}
          {labeled.length > 0 && (
            <span className="bg-wood-200 text-wood-600 dark:bg-wood-700 dark:text-wood-300 rounded-full px-1.5 py-0.5 text-xs font-medium">
              {labeled.length}
            </span>
          )}
        </span>
        <span aria-hidden="true" className="text-wood-400 dark:text-wood-500">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div className="border-wood-200 dark:border-wood-700 border-t px-4 pt-3 pb-4">
          {labeled.length === 0 ? (
            <p className="text-wood-400 dark:text-wood-500 text-xs">{t('partLabels.noParts')}</p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <label className="text-wood-600 dark:text-wood-300 flex cursor-pointer items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={expandQty}
                    onChange={(e) => setExpandQty(e.target.checked)}
                    className="border-wood-300 dark:border-wood-600 rounded"
                  />
                  {t('partLabels.expandQty')}
                </label>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="bg-wood-600 hover:bg-wood-700 rounded-md px-3 py-1.5 text-xs font-medium text-white"
                >
                  {t('partLabels.print')}
                </button>
              </div>

              <ul
                className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
                aria-label={t('partLabels.gridAriaLabel')}
              >
                {labeled.map((p, i) => (
                  <LabelCard key={`${p.partLabel}-${i}`} part={p} />
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}
