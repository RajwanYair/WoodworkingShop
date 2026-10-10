import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { useToastStore } from '../../store/toast-store';
import { loadSavedConfigs, saveConfig, deleteSavedConfig, type SavedConfig } from '../../utils/local-storage';
import {
  listProjects,
  exportProjectsBundle,
  importProjectsBundle,
  previewProjectsBundle,
  readSafeProjectImportJson,
  type SavedProject,
} from '../../utils/project-storage';
import type { CabinetEntry } from '../../store/cabinet-store';
import {
  buildCabinetExport,
  buildProjectExport,
  isCabinetExport,
  isProjectExport,
  isValidConfig,
  triggerJsonDownload,
} from './save-load-json';

type PendingImport =
  | { kind: 'active'; cabinets: CabinetEntry[]; projectName?: string; projectNotes?: string }
  | { kind: 'bundle'; file: File; projects: SavedProject[] };

export function SaveLoadPanel() {
  const { t } = useTranslation();
  const { config, setConfig, projectName, setProjectName, projectNotes, setProjectNotes } = useCabinetStore();
  const loadProject = useCabinetStore((s) => s.loadProject);
  const cabinets = useCabinetStore((s) => s.cabinets);
  const addToast = useToastStore((s) => s.addToast);
  const [configs, setConfigs] = useState<SavedConfig[]>([]);
  const [saveName, setSaveName] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [importError, setImportError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bundleInputRef = useRef<HTMLInputElement>(null);

  // Sprint 152 — sync project name to document title
  useEffect(() => {
    document.title = projectName ? `${projectName} — Cabinet Planner` : 'Cabinet Planner';
  }, [projectName]);

  useEffect(() => {
    let mounted = true;
    void loadSavedConfigs()
      .then((savedConfigs) => {
        if (mounted && savedConfigs.length > 0) setConfigs(savedConfigs);
      })
      .catch(() => {
        if (mounted) addToast(t('saves.loadFailed'), 'error');
      });
    return () => {
      mounted = false;
    };
  }, [addToast, t]);

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

  const handleBundleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingImport(null);
    setImportError(false);
    try {
      setPendingImport({ kind: 'bundle', file, projects: await previewProjectsBundle(file) });
    } catch {
      setImportError(true);
    } finally {
      e.target.value = '';
    }
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
      addToast(t('toast.linkCopyFailed'), 'error');
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingImport(null);
    setImportError(false);
    try {
      const parsed = await readSafeProjectImportJson(file);
      if (isProjectExport(parsed)) {
        setPendingImport({
          kind: 'active',
          cabinets: parsed.cabinets,
          ...(typeof parsed.projectName === 'string' ? { projectName: parsed.projectName } : {}),
          ...(typeof parsed.projectNotes === 'string' ? { projectNotes: parsed.projectNotes } : {}),
        });
      } else if (isCabinetExport(parsed)) {
        setPendingImport({ kind: 'active', cabinets: [parsed.cabinet] });
      } else if (isValidConfig(parsed)) {
        setPendingImport({ kind: 'active', cabinets: [{ name: 'Cabinet', config: parsed }] });
      } else {
        setImportError(true);
      }
    } catch {
      setImportError(true);
    } finally {
      e.target.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingImport) return;
    try {
      if (pendingImport.kind === 'bundle') {
        const added = await importProjectsBundle(pendingImport.file);
        addToast(t('saves.importedBundle', { count: added.length }), 'success');
      } else {
        loadProject(pendingImport.cabinets, {
          ...(pendingImport.projectName !== undefined ? { projectName: pendingImport.projectName } : {}),
          ...(pendingImport.projectNotes !== undefined ? { projectNotes: pendingImport.projectNotes } : {}),
        });
        addToast(t('toast.imported'), 'success');
      }
      setPendingImport(null);
      setImportError(false);
    } catch {
      setImportError(true);
    }
  };

  const handleCancelImport = () => {
    setPendingImport(null);
    setImportError(false);
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
      {pendingImport && (
        <section className="border-wood-300 dark:border-wood-600 space-y-2 rounded border p-3" aria-live="polite">
          <h4 className="text-wood-700 dark:text-wood-200 text-xs font-semibold">{t('saves.importPreviewTitle')}</h4>
          {pendingImport.kind === 'active' ? (
            <div className="text-wood-600 dark:text-wood-300 space-y-1 text-xs">
              {pendingImport.projectName && <p className="break-words">{pendingImport.projectName}</p>}
              {pendingImport.projectNotes && <p className="break-words">{pendingImport.projectNotes}</p>}
              <p>{t('saves.importPreviewCabinets', { count: pendingImport.cabinets.length })}</p>
            </div>
          ) : (
            <ul className="divide-wood-100 dark:divide-wood-700 max-h-32 divide-y overflow-y-auto">
              {pendingImport.projects.map((project) => (
                <li key={`${project.id}-${project.name}`} className="text-wood-600 dark:text-wood-300 py-1 text-xs">
                  {project.name} · {t('saves.importPreviewCabinets', { count: project.cabinets.length })}
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleConfirmImport()}
              className="bg-wood-600 hover:bg-wood-700 rounded px-3 py-1.5 text-xs font-medium text-white"
            >
              {t('saves.confirmImport')}
            </button>
            <button
              type="button"
              onClick={handleCancelImport}
              className="border-wood-300 dark:border-wood-600 text-wood-700 dark:text-wood-200 rounded border px-3 py-1.5 text-xs"
            >
              {t('saves.cancelImport')}
            </button>
          </div>
        </section>
      )}
      {importError && (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert" aria-live="assertive">
          {t('saves.importFailed')}
        </p>
      )}
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
