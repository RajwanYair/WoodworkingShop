import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { useToastStore } from '../../store/toast-store';
import { loadSavedConfigs, saveConfig, deleteSavedConfig, type SavedConfig } from '../../utils/local-storage';
import type { CabinetConfig } from '../../engine/types';

export function SaveLoadPanel() {
  const { t } = useTranslation();
  const { config, setConfig } = useCabinetStore();
  const addToast = useToastStore((s) => s.addToast);
  const [configs, setConfigs] = useState<SavedConfig[]>([]);
  const [saveName, setSaveName] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setConfigs(loadSavedConfigs());
  }, []);

  const handleSave = () => {
    const name = saveName.trim() || `${config.width}×${config.height}×${config.depth}`;
    saveConfig(name, config);
    setConfigs(loadSavedConfigs());
    setSaveName('');
    addToast(t('toast.saved'), 'success');
  };

  const handleLoad = (saved: SavedConfig) => {
    setConfig(saved.config);
    addToast(t('toast.loaded'), 'success');
  };

  const handleDelete = (id: string) => {
    deleteSavedConfig(id);
    setConfigs(loadSavedConfigs());
    addToast(t('toast.deleted'), 'info');
  };

  const handleExport = () => {
    const payload = JSON.stringify(config, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cabinet-${config.width}x${config.height}x${config.depth}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast(t('toast.exported'), 'success');
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (isValidConfig(parsed)) {
          setConfig(parsed);
          addToast(t('toast.imported'), 'success');
        } else {
          addToast(t('toast.invalidFile'), 'error');
        }
      } catch {
        addToast(t('toast.invalidFile'), 'error');
      }
    };
    reader.readAsText(file);
    // reset input so re-importing the same file works
    e.target.value = '';
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
          aria-expanded={showSaved}
          aria-label={t('saves.title')}
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

      {/* Export / Import */}
      <div className="flex gap-2 pt-1 border-t border-wood-100 dark:border-wood-800">
        <button
          onClick={handleExport}
          className="flex-1 px-2 py-1.5 text-xs font-medium border border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 rounded hover:bg-wood-50 dark:hover:bg-wood-700 transition-colors"
        >
          ↓ {t('saves.export')}
        </button>
        <button
          onClick={handleImport}
          className="flex-1 px-2 py-1.5 text-xs font-medium border border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 rounded hover:bg-wood-50 dark:hover:bg-wood-700 transition-colors"
        >
          ↑ {t('saves.import')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}

/** Minimal validation — checks that required numeric fields exist and are in range */
function isValidConfig(obj: unknown): obj is CabinetConfig {
  if (typeof obj !== 'object' || obj === null) return false;
  const c = obj as Record<string, unknown>;
  return (
    typeof c.width === 'number' && c.width >= 300 && c.width <= 1200 &&
    typeof c.height === 'number' && c.height >= 300 && c.height <= 2400 &&
    typeof c.depth === 'number' && c.depth >= 200 && c.depth <= 800 &&
    typeof c.shelfCount === 'number' &&
    typeof c.carcassMaterial === 'string' &&
    typeof c.backPanelMaterial === 'string'
  );
}
