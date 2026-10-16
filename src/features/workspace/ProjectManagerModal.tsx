import { useRef, useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '../../ui/Dialog';
import { formatDate } from '../../i18n/format';
import { useCabinetStore } from '../../store/cabinet-store';
import { dispatchBrowserEvent } from '../../store/platform-boundary';
import { useToastStore } from '../../store/toast-store';
import {
  listProjects,
  saveProject,
  deleteProject,
  restoreProject,
  exportProjectJson,
  importProjectJson,
  type SavedProject,
} from '../../utils/project-storage';
import { IconX, IconDownload, IconFolder } from '../../ui/Icons';
import { StorageQuotaBadge } from './StorageQuotaBadge';
import { EmptyState } from '../../ui/EmptyState';

interface ProjectManagerModalProps {
  onClose: () => void;
}

export function ProjectManagerModal({ onClose }: Readonly<ProjectManagerModalProps>) {
  const { t, i18n } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveNameRef = useRef<HTMLInputElement>(null);
  const cabinets = useCabinetStore((s) => s.cabinets);
  const snapshots = useCabinetStore((s) => s.snapshots);
  const projectName = useCabinetStore((s) => s.projectName);
  const loadProject = useCabinetStore((s) => s.loadProject);
  const setProjectName = useCabinetStore((s) => s.setProjectName);
  const addToast = useToastStore((s) => s.addToast);
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [saveName, setSaveName] = useState(projectName || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<'date' | 'name'>('date');

  /** Projects after search filter + sort. */
  const visibleProjects = projects
    .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) =>
      sortMode === 'name'
        ? a.name.localeCompare(b.name)
        : new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
    );

  const refresh = useCallback(() => {
    void listProjects()
      .then(setProjects)
      .catch((reason: unknown) => {
        const message = reason instanceof Error ? reason.message : String(reason);
        addToast(t('projects.actionError', { message }), 'error');
      });
  }, [addToast, t]);

  // Load projects from IndexedDB on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSave = () => {
    if (!saveName.trim()) return;
    void saveProject(saveName.trim(), cabinets)
      .then(() => {
        setProjectName(saveName.trim());
        addToast(t('projects.saved'), 'success');
        dispatchBrowserEvent('projects:changed');
        refresh();
      })
      .catch((reason: unknown) => {
        const message = reason instanceof Error ? reason.message : String(reason);
        addToast(t('projects.actionError', { message }), 'error');
      });
  };

  const handleLoad = (project: SavedProject) => {
    loadProject(project.cabinets);
    setProjectName(project.name);
    addToast(t('projects.loaded'), 'success');
    onClose();
  };

  const handleUndoDelete = (project: SavedProject) => {
    void restoreProject(project)
      .then(() => {
        dispatchBrowserEvent('projects:changed');
        addToast(t('projects.restored'), 'success');
        refresh();
      })
      .catch((reason: unknown) => {
        const message = reason instanceof Error ? reason.message : String(reason);
        addToast(t('projects.actionError', { message }), 'error');
      });
  };

  const handleDelete = (project: SavedProject) => {
    void deleteProject(project.id)
      .then(() => {
        dispatchBrowserEvent('projects:changed');
        addToast(t('projects.deleted'), 'info', {
          label: t('projects.undoDelete'),
          onClick: () => handleUndoDelete(project),
        });
        refresh();
      })
      .catch((reason: unknown) => {
        const message = reason instanceof Error ? reason.message : String(reason);
        addToast(t('projects.actionError', { message }), 'error');
      });
  };

  const handleExport = (project: SavedProject) => {
    exportProjectJson(project, snapshots);
    addToast(t('projects.exported'), 'success');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importProjectJson(file);
      addToast(t('projects.imported'), 'success');
      dispatchBrowserEvent('projects:changed');
      refresh();
    } catch {
      addToast(t('projects.importError'), 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const fmt = (iso: string) => {
    try {
      return formatDate(iso, i18n.language);
    } catch {
      return iso;
    }
  };

  return (
    <Dialog
      title={t('projects.title')}
      onClose={onClose}
      labelledBy="pm-title"
      showHeader={false}
      className="dark:bg-wood-800 mx-auto flex max-h-[85vh] w-[calc(100vw-2rem)] max-w-xl flex-col overflow-hidden rounded-xl bg-white p-0 text-start shadow-2xl"
    >
      {/* Header */}
      <div className="border-wood-200 dark:border-wood-700 flex items-center justify-between border-b p-4">
        <h2 id="pm-title" className="text-wood-800 dark:text-wood-100 text-lg font-bold">
          {t('projects.title')}
        </h2>
        <div className="flex items-center gap-3">
          <StorageQuotaBadge />
          <button
            onClick={onClose}
            className="text-wood-400 hover:text-wood-700 dark:hover:text-wood-200 flex items-center"
            aria-label="Close"
          >
            <IconX size={20} />
          </button>
        </div>
      </div>

      {/* Save current project */}
      <div className="border-wood-200 dark:border-wood-700 space-y-2 border-b p-4">
        <p className="text-wood-700 dark:text-wood-200 text-sm font-semibold">{t('projects.saveCurrent')}</p>
        <div className="flex gap-2">
          <input
            ref={saveNameRef}
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
            placeholder={t('projects.namePlaceholder')}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-700 text-wood-800 dark:text-wood-100 focus:border-wood-500 flex-1 rounded border bg-white px-3 py-1.5 text-sm focus:outline-none"
          />
          <button
            onClick={handleSave}
            disabled={!saveName.trim()}
            className="bg-accent hover:bg-accent-hover rounded px-4 py-1.5 text-sm text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('projects.save')}
          </button>
        </div>
      </div>

      {/* Search + sort toolbar */}
      <div className="border-wood-200 dark:border-wood-700 flex items-center gap-2 border-b p-3">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('projects.searchPlaceholder')}
          className="border-wood-300 dark:border-wood-600 dark:bg-wood-700 text-wood-800 dark:text-wood-100 focus:border-wood-500 flex-1 rounded border bg-white px-2 py-1 text-sm focus:outline-none"
          aria-label={t('projects.searchPlaceholder')}
        />
        <label className="text-wood-700 dark:text-wood-300 shrink-0 text-xs">{t('projects.sortLabel')}:</label>
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as 'date' | 'name')}
          className="border-wood-300 dark:border-wood-600 dark:bg-wood-700 text-wood-700 dark:text-wood-200 rounded border bg-white px-1.5 py-1 text-xs"
          aria-label={t('projects.sortLabel')}
        >
          <option value="date">{t('projects.sortByDate')}</option>
          <option value="name">{t('projects.sortByName')}</option>
        </select>
        {searchQuery && (
          <span className="text-wood-400 dark:text-wood-500 shrink-0 text-xs">
            {t('projects.found', { count: visibleProjects.length })}
          </span>
        )}
      </div>

      {/* Project list */}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
        {visibleProjects.length === 0 ? (
          <EmptyState
            title={searchQuery ? t('projects.noResultsTitle') : t('projects.emptyTitle')}
            description={searchQuery ? t('projects.noResults', { query: searchQuery }) : t('projects.emptyDescription')}
            action={
              <button
                type="button"
                onClick={() => {
                  if (searchQuery) setSearchQuery('');
                  else saveNameRef.current?.focus();
                }}
                className="bg-accent hover:bg-accent-hover rounded px-3 py-1.5 text-sm font-medium text-white"
              >
                {searchQuery ? t('projects.clearSearch') : t('projects.focusSave')}
              </button>
            }
          />
        ) : (
          visibleProjects.map((project) => (
            <div
              key={project.id}
              className="border-wood-200 dark:border-wood-700 hover:border-wood-400 dark:hover:border-wood-500 flex items-center gap-3 rounded-lg border p-3 transition-colors"
            >
              <IconFolder size={16} className="text-wood-600 dark:text-wood-300 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-wood-800 dark:text-wood-100 truncate text-sm font-medium">{project.name}</div>
                <div className="text-wood-400 dark:text-wood-500 text-xs">
                  {project.cabinets.length} {t('projects.cabinets')} · {fmt(project.savedAt)}
                </div>
              </div>
              <button
                onClick={() => handleLoad(project)}
                className="bg-wood-100 dark:bg-wood-700 text-wood-700 dark:text-wood-200 hover:bg-wood-200 dark:hover:bg-wood-600 shrink-0 rounded px-2 py-1 text-xs"
              >
                {t('projects.load')}
              </button>
              <button
                onClick={() => handleExport(project)}
                className="text-wood-400 hover:text-wood-700 dark:hover:text-wood-200 shrink-0"
                title={t('projects.export')}
                aria-label={t('projects.export')}
              >
                <IconDownload size={14} />
              </button>
              <button
                onClick={() => handleDelete(project)}
                className="text-wood-300 shrink-0 hover:text-red-500 dark:hover:text-red-400"
                title={t('projects.delete')}
                aria-label={t('projects.delete')}
              >
                <IconX size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer — import button */}
      <div className="border-wood-200 dark:border-wood-700 flex items-center justify-between border-t p-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
          id="pm-import-file"
        />
        <label
          htmlFor="pm-import-file"
          className="bg-wood-100 dark:bg-wood-700 text-wood-700 dark:text-wood-200 hover:bg-wood-200 dark:hover:bg-wood-600 cursor-pointer rounded px-3 py-1.5 text-sm transition-colors"
        >
          {t('projects.import')}
        </label>
        <button
          onClick={onClose}
          className="bg-wood-100 dark:bg-wood-700 text-wood-700 dark:text-wood-200 hover:bg-wood-200 dark:hover:bg-wood-600 rounded px-4 py-1.5 text-sm transition-colors"
        >
          {t('templates.close')}
        </button>
      </div>
    </Dialog>
  );
}
