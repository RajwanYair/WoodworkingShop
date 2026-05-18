import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { IconChevronDown, IconChevronRight, IconX, IconCheck, IconFolder } from './Icons';

export function SnapshotPanel() {
  const { t } = useTranslation();
  const { snapshots, saveSnapshot, restoreSnapshot, deleteSnapshot } = useCabinetStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  function handleSave() {
    saveSnapshot(name);
    setName('');
  }

  return (
    <div className="mt-4 border-t border-wood-200 dark:border-wood-700 pt-3">
      <button
        type="button"
        className="flex items-center gap-1.5 w-full text-start text-sm font-semibold text-wood-700 dark:text-wood-200 uppercase tracking-wide hover:text-wood-900 dark:hover:text-wood-50 transition-colors"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <IconFolder size={14} />
        <span className="grow">{t('snapshot.title')}</span>
        {open ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {/* Save new snapshot */}
          <div className="flex gap-1">
            <input
              type="text"
              className="grow text-xs rounded border border-wood-300 dark:border-wood-600 bg-wood-50 dark:bg-wood-800 px-2 py-1 text-wood-800 dark:text-wood-100 placeholder:text-wood-400 focus:outline-none focus:ring-1 focus:ring-wood-400"
              placeholder={t('snapshot.namePlaceholder')}
              value={name}
              maxLength={60}
              aria-label={t('snapshot.namePlaceholder')}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            <button
              type="button"
              className="text-xs px-2 py-1 bg-wood-600 hover:bg-wood-700 text-white rounded transition-colors shrink-0"
              aria-label={t('snapshot.save')}
              onClick={handleSave}
            >
              {t('snapshot.save')}
            </button>
          </div>

          {/* Snapshot list */}
          {snapshots.length === 0 ? (
            <p className="text-xs text-wood-400 dark:text-wood-500 italic">{t('snapshot.empty')}</p>
          ) : (
            <ul className="space-y-1" role="list">
              {snapshots.map((snap) => (
                <li
                  key={snap.id}
                  className="flex items-center gap-1 rounded bg-wood-100 dark:bg-wood-800 px-2 py-1 text-xs"
                >
                  <span className="grow truncate text-wood-700 dark:text-wood-200" title={snap.name}>
                    {snap.name}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 text-wood-500 hover:text-wood-700 dark:hover:text-wood-200 transition-colors"
                    aria-label={`${t('snapshot.restore')}: ${snap.name}`}
                    onClick={() => restoreSnapshot(snap.id)}
                  >
                    <IconCheck size={13} />
                  </button>
                  <button
                    type="button"
                    className="shrink-0 text-wood-400 hover:text-red-500 transition-colors"
                    aria-label={`${t('snapshot.delete')}: ${snap.name}`}
                    onClick={() => deleteSnapshot(snap.id)}
                  >
                    <IconX size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
