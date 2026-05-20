import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { IconChevronDown, IconChevronRight, IconX, IconCheck, IconFolder, IconDiff } from './Icons';
import { SnapshotDiffModal } from './SnapshotDiffModal';

export function SnapshotPanel() {
  const { t } = useTranslation();
  const { snapshots, saveSnapshot, restoreSnapshot, deleteSnapshot } = useCabinetStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [showDiff, setShowDiff] = useState(false);

  function handleSave() {
    saveSnapshot(name);
    setName('');
  }

  function fmtTimestamp(iso: string): string {
    try {
      return new Date(iso).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
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
        {snapshots.length >= 2 && (
          <button
            type="button"
            className="me-1 text-xs px-1.5 py-0.5 rounded bg-wood-200 dark:bg-wood-700 text-wood-700 dark:text-wood-200 hover:bg-wood-300 dark:hover:bg-wood-600 transition-colors flex items-center gap-1"
            aria-label={t('snapshot.diff.title')}
            onClick={(e) => {
              e.stopPropagation();
              setShowDiff(true);
            }}
          >
            <IconDiff size={11} />
            {t('snapshot.compare')}
          </button>
        )}
        {snapshots.length > 0 && (
          <span className="text-xs font-normal text-wood-400 dark:text-wood-500 me-1">({snapshots.length})</span>
        )}
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
            <ul className="space-y-1">
              {[...snapshots].reverse().map((snap) => (
                <li
                  key={snap.id}
                  className="flex items-center gap-1 rounded bg-wood-100 dark:bg-wood-800 px-2 py-1 text-xs"
                >
                  <div className="grow min-w-0">
                    <div className="truncate text-wood-700 dark:text-wood-200 font-medium" title={snap.name}>
                      {snap.name}
                    </div>
                    <div className="text-wood-400 dark:text-wood-500 text-xs">
                      {fmtTimestamp(snap.timestamp)}
                      {' · '}
                      {t('snapshot.cabinetCount', { count: snap.cabinets.length })}
                    </div>
                  </div>
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

      {showDiff && snapshots.length >= 2 && (
        <SnapshotDiffModal snapshots={snapshots} onClose={() => setShowDiff(false)} />
      )}
    </div>
  );
}
