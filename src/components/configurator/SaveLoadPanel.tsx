import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { useToastStore } from '../../store/toast-store';
import { loadSavedConfigs, saveConfig, deleteSavedConfig, type SavedConfig } from '../../utils/local-storage';
import { listProjects, exportProjectsBundle, importProjectsBundle } from '../../utils/project-storage';
import {
  buildCabinetExport,
  buildProjectExport,
  isCabinetExport,
  isProjectExport,
  isValidConfig,
  triggerJsonDownload,
} from './save-load-json';

export function SaveLoadPanel() {
  const { t } = useTranslation();
  const { config, setConfig, projectName, setProjectName, projectNotes, setProjectNotes } = useCabinetStore();
  const loadProject = useCabinetStore((s) => s.loadProject);
  const cabinets = useCabinetStore((s) => s.cabinets);
  const addToast = useToastStore((s) => s.addToast);
  const [configs, setConfigs] = useState<SavedConfig[]>([]);
  const [saveName, setSaveName] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bundleInputRef = useRef<HTMLInputElement>(null);

  // Sprint 152 — sync project name to document title
  useEffect(() => {
    document.title = projectName ? `${projectName} — Cabinet Planner` : 'Cabinet Planner';
  }, [projectName]);

  useEffect(() => {
    void loadSavedConfigs().then(setConfigs);
  }, []);

  const handleSave = () => {
    const name = saveName.trim() || `${config.width}×${config.height}×${config.depth}`;
    void saveConfig(name, config).then(() => {
      void loadSavedConfigs().then(setConfigs);
      setSaveName('');
      addToast(t('toast.saved'), 'success');
    });
  };

  const handleLoad = (saved: SavedConfig) => {
    setConfig(saved.config);
    addToast(t('toast.loaded'), 'success');
  };

  const handleDelete = (id: string) => {
    void deleteSavedConfig(id).then(() => {
      void loadSavedConfigs().then(setConfigs);
    });
    addToast(t('toast.deleted'), 'info');
  };

  const handleExportSavedBundle = () => {
    void listProjects().then((projects) => {
      if (projects.length === 0) {
        addToast(t('saves.noProjectsToExport'), 'info');
        return;
      }
      void exportProjectsBundle(projects).then(() => {
        addToast(t('saves.exportedAll', { count: projects.length }), 'success');
      });
    });
  };

  const handleImportBundle = () => {
    bundleInputRef.current?.click();
  };

  const handleBundleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    importProjectsBundle(file)
      .then((added) => {
        addToast(t('saves.importedBundle', { count: added.length }), 'success');
      })
      .catch(() => {
        addToast(t('toast.invalidFile'), 'error');
      });
    e.target.value = '';
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = projectName ? `${projectName} — Cabinet Planner` : 'Cabinet Planner';
    // Sprint 166 — use native share sheet on mobile; fall back to clipboard
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* user cancelled or API failed — fall through to clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      addToast(t('toast.linkCopied'), 'success');
    } catch {
      addToast(t('toast.invalidFile'), 'error');
    }
  };
  const handleExportCabinet = () => {
    const state = useCabinetStore.getState();
    const selected = state.cabinets[state.activeCabinetIndex] ?? { name: 'Cabinet', config: state.config };
    const payload = buildCabinetExport(selected);
    const safeName =
      selected.name.trim() || `cabinet-${selected.config.width}x${selected.config.height}x${selected.config.depth}`;
    triggerJsonDownload(payload, `${safeName}.cabinet.json`);
    addToast(t('toast.exported'), 'success');
  };

  const handleExportProject = () => {
    const state = useCabinetStore.getState();
    if (state.cabinets.length === 0) {
      addToast(t('toast.invalidFile'), 'error');
      return;
    }
    const payload = buildProjectExport(state.cabinets, state.projectName, state.projectNotes);
    const fileName = `${projectName || `project-${config.width}x${config.height}x${config.depth}`}.project.json`;
    triggerJsonDownload(payload, fileName);
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
        // Project format (multi-cabinet)
        if (isProjectExport(parsed)) {
          loadProject(parsed.cabinets);
          if (typeof parsed.projectName === 'string') setProjectName(parsed.projectName);
          if (typeof parsed.projectNotes === 'string') setProjectNotes(parsed.projectNotes);
          addToast(t('toast.imported'), 'success');
        } else if (isCabinetExport(parsed)) {
          setConfig(parsed.cabinet.config);
          addToast(t('toast.imported'), 'success');
          // Legacy single-config format
        } else if (isValidConfig(parsed)) {
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
    <div className="border-wood-200 dark:border-wood-700 space-y-3 rounded-lg border p-3">
      {/* Sprint 152 — project name */}
      <div>
        <label className="text-wood-700 dark:text-wood-200 mb-1 block text-xs font-semibold">
          {t('saves.projectName')}
        </label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder={t('saves.projectNamePlaceholder')}
          className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-400 text-wood-800 dark:text-wood-100 w-full rounded border bg-white px-2 py-1 text-xs focus:ring-1 focus:outline-none"
          maxLength={80}
          aria-label={t('saves.projectName')}
        />
      </div>
      {/* Sprint 14 — project notes */}
      <div>
        <label className="text-wood-700 dark:text-wood-200 mb-1 block text-xs font-semibold" htmlFor="project-notes">
          {t('saves.projectNotes')}
        </label>
        <textarea
          id="project-notes"
          value={projectNotes}
          onChange={(e) => setProjectNotes(e.target.value)}
          placeholder={t('saves.projectNotesPlaceholder')}
          rows={3}
          className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-400 text-wood-800 dark:text-wood-100 w-full resize-y rounded border bg-white px-2 py-1 text-xs focus:ring-1 focus:outline-none"
          maxLength={1000}
          aria-label={t('saves.projectNotes')}
        />
      </div>
      <div className="flex items-center justify-between">
        <h3 className="text-wood-700 dark:text-wood-200 text-xs font-semibold">{t('saves.title')}</h3>
        <button
          onClick={() => setShowSaved(!showSaved)}
          className="text-wood-600 hover:text-wood-700 dark:text-wood-400 dark:hover:text-wood-200 text-xs"
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
          className="border-wood-200 dark:border-wood-700 dark:bg-wood-800 text-wood-700 dark:text-wood-200 flex-1 rounded border bg-white px-2 py-1.5 text-xs"
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <button
          onClick={handleSave}
          className="bg-wood-600 hover:bg-wood-600 rounded px-3 py-1.5 text-xs font-medium text-white transition-colors"
        >
          {t('saves.save')}
        </button>
      </div>

      {/* Saved list */}
      {showSaved && configs.length > 0 && (
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {configs.map((c) => (
            <div
              key={c.id}
              className="bg-wood-50 dark:bg-wood-800 flex items-center justify-between gap-2 rounded px-2 py-1.5 text-xs"
            >
              <div className="min-w-0 flex-1">
                <div className="text-wood-700 dark:text-wood-200 truncate font-medium">{c.name}</div>
                <div className="text-wood-400 dark:text-wood-500">
                  {c.config.width}×{c.config.height}×{c.config.depth} — {new Date(c.savedAt).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => handleLoad(c)}
                className="bg-wood-600 hover:bg-wood-600 shrink-0 rounded px-2 py-0.5 text-xs text-white"
              >
                {t('saves.load')}
              </button>
              <button
                onClick={() => handleDelete(c.id)}
                className="shrink-0 px-1.5 py-0.5 text-xs text-red-500 hover:text-red-700"
                title={t('saves.delete')}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {showSaved && configs.length === 0 && (
        <p className="text-wood-400 py-2 text-center text-xs">{t('saves.empty')}</p>
      )}

      {/* Export / Import */}
      <div className="border-wood-100 dark:border-wood-800 flex gap-2 border-t pt-1">
        <button
          onClick={handleExportCabinet}
          className="border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-50 dark:hover:bg-wood-700 flex-1 rounded border px-2 py-1.5 text-xs font-medium transition-colors"
        >
          ↓ {t('saves.exportCabinet')}
        </button>
        <button
          onClick={handleExportProject}
          className="border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-50 dark:hover:bg-wood-700 flex-1 rounded border px-2 py-1.5 text-xs font-medium transition-colors"
        >
          ↓ {t('saves.exportProject', { count: cabinets.length })}
        </button>
        <button
          onClick={handleImport}
          className="border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-50 dark:hover:bg-wood-700 flex-1 rounded border px-2 py-1.5 text-xs font-medium transition-colors"
        >
          ↑ {t('saves.import')}
        </button>
        {/* Sprint 166 — share / copy link */}
        <button
          onClick={handleShare}
          className="border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-50 dark:hover:bg-wood-700 flex-1 rounded border px-2 py-1.5 text-xs font-medium transition-colors"
          aria-label={t('saves.share')}
        >
          ⎘ {t('saves.share')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileChange}
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      {/* Export All / Import Bundle */}
      <div className="flex gap-2">
        <button
          onClick={handleExportSavedBundle}
          className="border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-50 dark:hover:bg-wood-700 flex-1 rounded border px-2 py-1.5 text-xs font-medium transition-colors"
          title={t('saves.exportBundleTip')}
        >
          ⬇ {t('saves.exportBundle')}
        </button>
        <button
          onClick={handleImportBundle}
          className="border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-50 dark:hover:bg-wood-700 flex-1 rounded border px-2 py-1.5 text-xs font-medium transition-colors"
          title={t('saves.importBundleTip')}
        >
          ⬆ {t('saves.importBundle')}
        </button>
        <input
          ref={bundleInputRef}
          type="file"
          accept=".json,.cabinet-projects.json"
          className="hidden"
          onChange={handleBundleFileChange}
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>
    </div>
  );
}
