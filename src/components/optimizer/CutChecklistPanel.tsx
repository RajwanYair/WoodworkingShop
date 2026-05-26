import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { buildCutChecklist } from '../../engine/cut-checklist';
import type { Lang } from '../../engine/types';

export function CutChecklistPanel() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;
  const { allParts, checkedPartIds, toggleCutPart, clearCutChecklist } = useCabinetStore();
  const [open, setOpen] = useState(false);

  const checkedSet = useMemo(() => new Set(checkedPartIds), [checkedPartIds]);
  const checklist = useMemo(() => buildCutChecklist(allParts, checkedSet, lang), [allParts, checkedSet, lang]);

  const progressBarColor = checklist.isComplete
    ? 'bg-green-500'
    : checklist.progressPercent >= 50
      ? 'bg-blue-500'
      : 'bg-yellow-500';

  return (
    <section className="border-wood-200 bg-wood-50 dark:border-wood-700 dark:bg-wood-900/30 rounded-lg border">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-start"
      >
        <span className="text-wood-800 dark:text-wood-100 flex items-center gap-2 font-semibold">
          <span aria-hidden="true">✂️</span>
          {t('cutChecklist.title')}
        </span>
        <span className="text-wood-500 dark:text-wood-400 flex items-center gap-2 text-sm">
          {checklist.checkedParts}/{checklist.totalParts}
          {checklist.isComplete && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
              {t('cutChecklist.complete')}
            </span>
          )}
          <span aria-hidden="true" className="text-wood-400 dark:text-wood-500">
            {open ? '▲' : '▼'}
          </span>
        </span>
      </button>

      {open && (
        <div className="border-wood-200 dark:border-wood-700 space-y-3 border-t px-4 pt-3 pb-4">
          {/* Progress bar */}
          <div>
            <div className="text-wood-500 dark:text-wood-400 mb-1 flex items-center justify-between text-xs">
              <span>
                {t('cutChecklist.progress', { checked: checklist.checkedParts, total: checklist.totalParts })}
              </span>
              <span className="tabular-nums">{checklist.progressPercent}%</span>
            </div>
            <div className="bg-wood-200 dark:bg-wood-700 h-2 overflow-hidden rounded-full">
              <div
                className={`h-full rounded-full transition-all duration-300 ${progressBarColor}`}
                style={{ width: `${checklist.progressPercent}%` }}
                role="progressbar"
                aria-valuenow={checklist.progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t('cutChecklist.progressAriaLabel', { percent: checklist.progressPercent })}
              />
            </div>
          </div>

          {/* Groups */}
          {checklist.groups.map((group) => (
            <div key={group.material}>
              <h3 className="text-wood-600 dark:text-wood-400 mb-1 flex items-center justify-between text-xs font-semibold tracking-wide uppercase">
                <span className="font-mono">{group.material}</span>
                <span className="text-wood-400 font-normal normal-case">
                  {group.checkedCount}/{group.totalCount}
                </span>
              </h3>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.partId}>
                    <label className="hover:bg-wood-100 dark:hover:bg-wood-800/50 flex cursor-pointer items-center gap-2 rounded px-2 py-1">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => toggleCutPart(item.partId)}
                        className="accent-wood-600 h-4 w-4 rounded"
                        aria-label={`${item.label} — ${item.width}×${item.length} mm`}
                      />
                      <span
                        className={`flex-1 text-sm ${
                          item.checked
                            ? 'text-wood-400 dark:text-wood-600 line-through'
                            : 'text-wood-700 dark:text-wood-300'
                        }`}
                      >
                        {item.label}
                        {item.quantity > 1 && <span className="text-wood-400 ms-1 text-xs">×{item.quantity}</span>}
                      </span>
                      <span className="text-wood-400 dark:text-wood-500 text-xs tabular-nums">
                        {item.width}×{item.length}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Clear button */}
          {checklist.checkedParts > 0 && (
            <button
              type="button"
              onClick={clearCutChecklist}
              className="text-wood-400 text-xs hover:text-red-500 dark:hover:text-red-400"
            >
              {t('cutChecklist.clearAll')}
            </button>
          )}

          {checklist.totalParts === 0 && (
            <p className="text-wood-400 dark:text-wood-500 text-xs">{t('cutChecklist.empty')}</p>
          )}
        </div>
      )}
    </section>
  );
}
