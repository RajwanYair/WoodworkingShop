import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { diffSnapshots } from '../../engine/snapshot-diff';
import type { ProjectSnapshot } from '../../store/cabinet-store';
import { IconX } from './Icons';

interface Props {
  snapshots: ProjectSnapshot[];
  onClose: () => void;
}

export function SnapshotDiffModal({ snapshots, onClose }: Props) {
  const { t } = useTranslation();
  const [idA, setIdA] = useState(snapshots[1]?.id ?? snapshots[0]?.id ?? '');
  const [idB, setIdB] = useState(snapshots[0]?.id ?? '');

  const snapA = snapshots.find((s) => s.id === idA);
  const snapB = snapshots.find((s) => s.id === idB);

  const diff = snapA && snapB ? diffSnapshots(snapA, snapB) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('snapshot.diff.title')}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
    >
      <div className="w-full max-w-lg bg-white dark:bg-wood-900 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-wood-200 dark:border-wood-700">
          <h2 className="text-sm font-semibold text-wood-800 dark:text-wood-100">{t('snapshot.diff.title')}</h2>
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
        <div className="px-5 py-4 space-y-3 border-b border-wood-200 dark:border-wood-700">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-wood-600 dark:text-wood-400 mb-1">
                {t('snapshot.diff.before')}
              </label>
              <select
                value={idA}
                onChange={(e) => setIdA(e.target.value)}
                className="w-full text-xs rounded border border-wood-300 dark:border-wood-600 bg-wood-50 dark:bg-wood-800 px-2 py-1.5 text-wood-800 dark:text-wood-100 focus:outline-none focus:ring-1 focus:ring-wood-400"
              >
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id} disabled={s.id === idB}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-wood-600 dark:text-wood-400 mb-1">
                {t('snapshot.diff.after')}
              </label>
              <select
                value={idB}
                onChange={(e) => setIdB(e.target.value)}
                className="w-full text-xs rounded border border-wood-300 dark:border-wood-600 bg-wood-50 dark:bg-wood-800 px-2 py-1.5 text-wood-800 dark:text-wood-100 focus:outline-none focus:ring-1 focus:ring-wood-400"
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
        <div className="px-5 py-4 max-h-80 overflow-y-auto space-y-4">
          {!diff && (
            <p className="text-xs text-wood-400 dark:text-wood-500 italic">{t('snapshot.diff.selectTwo')}</p>
          )}
          {diff?.identical && (
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">{t('snapshot.diff.identical')}</p>
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
                  <h3 className="text-xs font-semibold text-wood-700 dark:text-wood-200 mb-1.5">
                    {cd.cabinetName}
                  </h3>
                  <table className="w-full text-xs border-collapse">
                    <tbody>
                      {cd.deltas.map((delta) => (
                        <tr
                          key={delta.field}
                          className="border-b border-wood-100 dark:border-wood-800 last:border-0"
                        >
                          <td className="py-1 pe-3 text-wood-500 dark:text-wood-400 w-1/3">
                            {t(delta.labelKey, { defaultValue: delta.field })}
                          </td>
                          <td className="py-1 pe-3 text-red-600 dark:text-red-400 line-through w-1/3">
                            {delta.oldValue}
                          </td>
                          <td className="py-1 text-green-600 dark:text-green-400 font-medium w-1/3">
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
        <div className="px-5 py-3 border-t border-wood-200 dark:border-wood-700 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-3 py-1.5 bg-wood-600 hover:bg-wood-700 text-white rounded transition-colors"
          >
            {t('snapshot.diff.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
