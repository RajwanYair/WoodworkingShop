import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { diffSnapshots } from '../../engine/snapshot-diff';
import type { ProjectSnapshot } from '../../store/cabinet-store';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { IconX } from './Icons';

interface Props {
  snapshots: ProjectSnapshot[];
  onClose: () => void;
}

export function SnapshotDiffModal({ snapshots, onClose }: Props) {
  const { t } = useTranslation();
  const [idA, setIdA] = useState(snapshots[1]?.id ?? snapshots[0]?.id ?? '');
  const [idB, setIdB] = useState(snapshots[0]?.id ?? '');
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(dialogRef, true, onClose);

  const snapA = snapshots.find((s) => s.id === idA);
  const snapB = snapshots.find((s) => s.id === idB);

  const diff = snapA && snapB ? diffSnapshots(snapA, snapB) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('snapshot.diff.title')}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div ref={dialogRef} className="dark:bg-wood-900 w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="border-wood-200 dark:border-wood-700 flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-wood-800 dark:text-wood-100 text-sm font-semibold">{t('snapshot.diff.title')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-wood-400 hover:text-wood-700 dark:hover:text-wood-200 transition-colors"
            aria-label={t('snapshot.diff.close')}
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Selectors */}
        <div className="border-wood-200 dark:border-wood-700 space-y-3 border-b px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="snap-before" className="text-wood-600 dark:text-wood-400 mb-1 block text-xs font-medium">
                {t('snapshot.diff.before')}
              </label>
              <select
                id="snap-before"
                value={idA}
                onChange={(e) => setIdA(e.target.value)}
                className="border-wood-300 dark:border-wood-600 bg-wood-50 dark:bg-wood-800 text-wood-800 dark:text-wood-100 focus:ring-wood-400 w-full rounded border px-2 py-1.5 text-xs focus:ring-1 focus:outline-none"
              >
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id} disabled={s.id === idB}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="snap-after" className="text-wood-600 dark:text-wood-400 mb-1 block text-xs font-medium">
                {t('snapshot.diff.after')}
              </label>
              <select
                id="snap-after"
                value={idB}
                onChange={(e) => setIdB(e.target.value)}
                className="border-wood-300 dark:border-wood-600 bg-wood-50 dark:bg-wood-800 text-wood-800 dark:text-wood-100 focus:ring-wood-400 w-full rounded border px-2 py-1.5 text-xs focus:ring-1 focus:outline-none"
              >
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id} disabled={s.id === idA}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Diff result */}
        <div className="max-h-80 space-y-4 overflow-y-auto px-5 py-4">
          {!diff && <p className="text-wood-400 dark:text-wood-500 text-xs italic">{t('snapshot.diff.selectTwo')}</p>}
          {diff?.identical && (
            <p className="text-xs font-medium text-green-600 dark:text-green-400">{t('snapshot.diff.identical')}</p>
          )}
          {diff && !diff.identical && (
            <>
              {diff.addedCabinets > 0 && (
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  + {t('snapshot.diff.cabinetsAdded', { count: diff.addedCabinets })}
                </p>
              )}
              {diff.removedCabinets > 0 && (
                <p className="text-xs text-red-500 dark:text-red-400">
                  − {t('snapshot.diff.cabinetsRemoved', { count: diff.removedCabinets })}
                </p>
              )}
              {diff.cabinetDiffs.map((cd) => (
                <div key={cd.index}>
                  <h3 className="text-wood-700 dark:text-wood-200 mb-1.5 text-xs font-semibold">{cd.cabinetName}</h3>
                  <table className="w-full border-collapse text-xs">
                    <tbody>
                      {cd.deltas.map((delta) => (
                        <tr key={delta.field} className="border-wood-100 dark:border-wood-800 border-b last:border-0">
                          <td className="text-wood-500 dark:text-wood-400 w-1/3 py-1 pe-3">
                            {t(delta.labelKey, { defaultValue: delta.field })}
                          </td>
                          <td className="w-1/3 py-1 pe-3 text-red-600 line-through dark:text-red-400">
                            {delta.oldValue}
                          </td>
                          <td className="w-1/3 py-1 font-medium text-green-600 dark:text-green-400">
                            {delta.newValue}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-wood-200 dark:border-wood-700 flex justify-end border-t px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="bg-wood-600 hover:bg-wood-700 rounded px-3 py-1.5 text-xs text-white transition-colors"
          >
            {t('snapshot.diff.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
