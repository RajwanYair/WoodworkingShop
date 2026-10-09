import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { assignPartLabels } from '../../engine/part-labeling';
import type { LabeledPart } from '../../engine/part-labeling';
import { buildPartLabelPrintHtml } from './build-part-label-print-html';

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
  const [pageSize, setPageSize] = useState<'A4' | 'Letter'>('A4');
  const [rows, setRows] = useState(4);
  const [columns, setColumns] = useState(2);

  const labeled = useMemo(() => assignPartLabels(allParts, { expandMultiQty: expandQty }), [allParts, expandQty]);

  function handlePrint() {
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) return;
    win.document.write(
      buildPartLabelPrintHtml(labeled, t('partLabels.printTitle'), {
        pageSize,
        rows,
        columns,
        labels: {
          grain: t('partLabels.grain'),
          alongLength: t('partLabels.alongLength'),
          alongWidth: t('partLabels.alongWidth'),
          unspecified: t('partLabels.unspecified'),
          edgeBanding: t('partLabels.edgeBanding'),
          quantity: t('partLabels.quantity'),
          qrReference: t('partLabels.qrReference'),
        },
      }),
    );
    win.document.close();
    win.setTimeout(() => {
      win.focus();
      win.print();
    }, 100);
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
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <label className="text-wood-600 dark:text-wood-300 flex items-center gap-1">
                    {t('partLabels.pageSize')}
                    <select
                      value={pageSize}
                      onChange={(event) => setPageSize(event.currentTarget.value === 'Letter' ? 'Letter' : 'A4')}
                      className="border-wood-300 dark:border-wood-600 rounded border bg-white px-1.5 py-1"
                    >
                      <option value="A4">{t('partLabels.a4')}</option>
                      <option value="Letter">{t('partLabels.letter')}</option>
                    </select>
                  </label>
                  <label className="text-wood-600 dark:text-wood-300 flex items-center gap-1">
                    {t('partLabels.rows')}
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={rows}
                      onChange={(event) => setRows(Math.max(1, Math.min(8, Number(event.currentTarget.value) || 1)))}
                      className="border-wood-300 dark:border-wood-600 w-14 rounded border bg-white px-1.5 py-1"
                    />
                  </label>
                  <label className="text-wood-600 dark:text-wood-300 flex items-center gap-1">
                    {t('partLabels.columns')}
                    <input
                      type="number"
                      min={1}
                      max={4}
                      value={columns}
                      onChange={(event) => setColumns(Math.max(1, Math.min(4, Number(event.currentTarget.value) || 1)))}
                      className="border-wood-300 dark:border-wood-600 w-14 rounded border bg-white px-1.5 py-1"
                    />
                  </label>
                </div>
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
