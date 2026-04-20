import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';

export function CabinetSelector() {
  const { t } = useTranslation();
  const { cabinets, activeCabinetIndex, addCabinet, removeCabinet, setActiveCabinet, renameCabinet } =
    useCabinetStore();
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

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
    <div className="border border-wood-200 dark:border-wood-700 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-wood-700 dark:text-wood-200 uppercase tracking-wide">
          {t('project.title')}
        </h3>
        <button
          onClick={addCabinet}
          className="text-xs bg-wood-500 hover:bg-wood-600 text-white px-2 py-0.5 rounded transition-colors"
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
                className="text-xs px-2 py-1 rounded border border-wood-400 dark:border-wood-500 bg-white dark:bg-wood-800 w-24"
                ref={(el) => el?.focus()}
              />
            ) : (
              <button
                onClick={() => setActiveCabinet(i)}
                onDoubleClick={() => startRename(i)}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  i === activeCabinetIndex
                    ? 'bg-wood-500 text-white'
                    : 'bg-wood-100 dark:bg-wood-800 text-wood-600 dark:text-wood-300 hover:bg-wood-200 dark:hover:bg-wood-700'
                }`}
                title={`${cab.name} — double-click to rename`}
              >
                {cab.name}
              </button>
            )}
            {cabinets.length > 1 && (
              <button
                onClick={() => removeCabinet(i)}
                className="text-wood-400 hover:text-red-500 text-xs leading-none"
                title={t('project.remove')}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {cabinets.length > 1 && <p className="text-[10px] text-wood-400 dark:text-wood-500">{t('project.hint')}</p>}
    </div>
  );
}
