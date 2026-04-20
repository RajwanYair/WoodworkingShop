import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { loadSavedConfigs, saveConfig, deleteSavedConfig, type SavedConfig } from '../../utils/local-storage';

export function SaveLoadPanel() {
  const { t } = useTranslation();
  const { config, setConfig } = useCabinetStore();
  const [configs, setConfigs] = useState<SavedConfig[]>([]);
  const [saveName, setSaveName] = useState('');
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    setConfigs(loadSavedConfigs());
  }, []);

  const handleSave = () => {
    const name = saveName.trim() || `${config.width}×${config.height}×${config.depth}`;
    saveConfig(name, config);
    setConfigs(loadSavedConfigs());
    setSaveName('');
  };

  const handleLoad = (saved: SavedConfig) => {
    setConfig(saved.config);
  };

  const handleDelete = (id: string) => {
    deleteSavedConfig(id);
    setConfigs(loadSavedConfigs());
  };

  return (
    <div className="border border-wood-200 dark:border-wood-700 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-wood-700 dark:text-wood-200">
          {t('saves.title')}
        </h3>
        <button
          onClick={() => setShowSaved(!showSaved)}
          className="text-xs text-wood-500 hover:text-wood-700 dark:text-wood-400 dark:hover:text-wood-200"
        >
          {showSaved ? '▲' : '▼'} {configs.length > 0 && `(${configs.length})`}
        </button>
      </div>

      {/* Save form */}
      <div className="flex gap-2">
        <input
          type="text"
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          placeholder={t('saves.placeholder')}
          className="flex-1 text-xs px-2 py-1.5 rounded border border-wood-200 dark:border-wood-700 bg-white dark:bg-wood-800 text-wood-700 dark:text-wood-200"
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <button
          onClick={handleSave}
          className="px-3 py-1.5 text-xs font-medium bg-wood-500 text-white rounded hover:bg-wood-600 transition-colors"
        >
          {t('saves.save')}
        </button>
      </div>

      {/* Saved list */}
      {showSaved && configs.length > 0 && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {configs.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-wood-50 dark:bg-wood-800 text-xs"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-wood-700 dark:text-wood-200 truncate">{c.name}</div>
                <div className="text-wood-400 dark:text-wood-500">
                  {c.config.width}×{c.config.height}×{c.config.depth} — {new Date(c.savedAt).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => handleLoad(c)}
                className="px-2 py-0.5 text-xs bg-wood-500 text-white rounded hover:bg-wood-600 shrink-0"
              >
                {t('saves.load')}
              </button>
              <button
                onClick={() => handleDelete(c.id)}
                className="px-1.5 py-0.5 text-xs text-red-500 hover:text-red-700 shrink-0"
                title={t('saves.delete')}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {showSaved && configs.length === 0 && (
        <p className="text-xs text-wood-400 text-center py-2">{t('saves.empty')}</p>
      )}
    </div>
  );
}
