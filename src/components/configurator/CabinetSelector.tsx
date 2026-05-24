import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { generateParts } from '../../engine';

export function CabinetSelector() {
  const { t } = useTranslation();
  const {
    cabinets,
    activeCabinetIndex,
    addCabinet,
    removeCabinet,
    duplicateCabinet,
    moveCabinet,
    setActiveCabinet,
    renameCabinet,
    setNotes,
  } = useCabinetStore();
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [notesOpen, setNotesOpen] = useState(false);

  const startRename = (i: number) => {
    setEditingIdx(i);
    setEditName(cabinets[i].name);
  };

  const commitRename = () => {
    if (editingIdx !== null && editName.trim()) {
      renameCabinet(editingIdx, editName.trim());
    }
    setEditingIdx(null);
  };

  return (
    <div className="border-wood-200 dark:border-wood-700 space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-wood-700 dark:text-wood-200 text-xs font-semibold tracking-wide uppercase">
          {t('project.title')}
        </h3>
        <button
          onClick={addCabinet}
          className="bg-wood-600 hover:bg-wood-700 rounded px-2 py-0.5 text-xs text-white transition-colors"
        >
          + {t('project.add')}
        </button>
      </div>

      <div className="flex flex-wrap gap-1">
        {cabinets.map((cab, i) => (
          <div key={i} className="flex items-center gap-0.5">
            {editingIdx === i ? (
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => e.key === 'Enter' && commitRename()}
                className="border-wood-400 dark:border-wood-500 dark:bg-wood-800 w-24 rounded border bg-white px-2 py-1 text-xs"
                ref={(el) => el?.focus()}
                aria-label="Cabinet name"
              />
            ) : (
              <button
                onClick={() => setActiveCabinet(i)}
                onDoubleClick={() => startRename(i)}
                className={`rounded px-2 py-1 text-xs transition-colors ${
                  i === activeCabinetIndex
                    ? 'bg-wood-600 text-white'
                    : 'bg-wood-100 dark:bg-wood-800 text-wood-600 dark:text-wood-300 hover:bg-wood-200 dark:hover:bg-wood-700'
                }`}
                title={`${cab.name} — double-click to rename`}
              >
                {cab.name}
                {/* Sprint 82 — part count badge */}
                <span
                  className="ms-1 text-[9px] font-normal opacity-80"
                  aria-label={`${generateParts(cab.config).length} parts`}
                >
                  ({generateParts(cab.config).length})
                </span>
              </button>
            )}
            {cabinets.length > 1 && (
              <button
                onClick={() => removeCabinet(i)}
                className="text-wood-400 text-xs leading-none hover:text-red-500"
                title={t('project.remove')}
              >
                ×
              </button>
            )}
            {/* Sprint 125 — duplicate button */}
            <button
              onClick={() => duplicateCabinet(i)}
              className="text-wood-400 hover:text-wood-600 dark:hover:text-wood-200 text-xs leading-none"
              title={t('project.duplicate')}
              aria-label={`Duplicate ${cab.name}`}
            >
              ⧉
            </button>
            {/* Sprint 61 — move up / move down */}
            {cabinets.length > 1 && i > 0 && (
              <button
                onClick={() => moveCabinet(i, 'up')}
                className="text-wood-400 hover:text-wood-600 dark:hover:text-wood-200 text-xs leading-none"
                title={t('project.moveUp')}
                aria-label={`${t('project.moveUp')}: ${cab.name}`}
              >
                ▲
              </button>
            )}
            {cabinets.length > 1 && i < cabinets.length - 1 && (
              <button
                onClick={() => moveCabinet(i, 'down')}
                className="text-wood-400 hover:text-wood-600 dark:hover:text-wood-200 text-xs leading-none"
                title={t('project.moveDown')}
                aria-label={`${t('project.moveDown')}: ${cab.name}`}
              >
                ▼
              </button>
            )}
          </div>
        ))}
      </div>

      {cabinets.length > 1 && <p className="text-wood-400 dark:text-wood-500 text-[10px]">{t('project.hint')}</p>}

      {/* Sprint 135 — per-cabinet notes */}
      <div>
        <button
          onClick={() => setNotesOpen((o) => !o)}
          className="text-wood-600 dark:text-wood-300 text-[10px] hover:underline"
        >
          {notesOpen ? '▾' : '▸'} {t('project.notes')}
        </button>
        {notesOpen && (
          <textarea
            rows={3}
            value={cabinets[activeCabinetIndex]?.notes ?? ''}
            onChange={(e) => setNotes(activeCabinetIndex, e.target.value)}
            placeholder={t('project.notesPlaceholder')}
            className="border-wood-200 dark:border-wood-700 dark:bg-wood-800 text-wood-700 dark:text-wood-200 placeholder-wood-400 focus:ring-wood-400 mt-1 w-full resize-y rounded border bg-white p-1.5 text-xs focus:ring-1 focus:outline-none"
          />
        )}
      </div>
    </div>
  );
}
