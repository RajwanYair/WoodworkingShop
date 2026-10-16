import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { dispatchBrowserEvent, listenToBrowserEvent } from '../../store/platform-boundary';
import { useToastStore } from '../../store/toast-store';
import {
  deleteProject,
  duplicateProject,
  exportProjectsBundle,
  listProjects,
  restoreProject,
  type SavedProject,
} from '../../utils/project-storage';
import { RecentProjectCard } from './RecentProjectCard';
import { StorageQuotaBadge } from './StorageQuotaBadge';

interface WorkspaceHomeProps {
  onOpenExamples: () => void;
  onOpenProjects: () => void;
  onOpenTemplates: () => void;
}

function sortByRecent(projects: SavedProject[]): SavedProject[] {
  return [...projects].sort((a, b) => (Date.parse(b.savedAt) || 0) - (Date.parse(a.savedAt) || 0));
}

export function WorkspaceHome({ onOpenExamples, onOpenProjects, onOpenTemplates }: Readonly<WorkspaceHomeProps>) {
  const { t } = useTranslation();
  const loadProject = useCabinetStore((state) => state.loadProject);
  const setProjectName = useCabinetStore((state) => state.setProjectName);
  const setActiveTab = useCabinetStore((state) => state.setActiveTab);
  const addToast = useToastStore((state) => state.addToast);
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reportError = useCallback(
    (reason: unknown) => {
      const message = reason instanceof Error ? reason.message : String(reason);
      setError(t('projects.actionError', { message }));
    },
    [t],
  );

  const refresh = useCallback(async () => {
    setProjects(sortByRecent(await listProjects()));
    setError(null);
  }, []);

  useEffect(() => {
    let active = true;
    void listProjects()
      .then((savedProjects) => {
        if (active) setProjects(sortByRecent(savedProjects));
      })
      .catch((reason: unknown) => {
        if (active) reportError(reason);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reportError]);

  useEffect(
    () =>
      listenToBrowserEvent('projects:changed', () => {
        void refresh().catch(reportError);
      }),
    [refresh, reportError],
  );

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return projects.filter((project) => project.name.toLocaleLowerCase().includes(normalizedQuery));
  }, [projects, query]);
  const featuredProject = query.trim() ? undefined : projects[0];
  const recentProjects = filteredProjects.filter((project) => project.id !== featuredProject?.id);

  const handleOpen = (project: SavedProject) => {
    try {
      loadProject(project.cabinets);
      setProjectName(project.name);
      setActiveTab('configurator');
      addToast(t('projects.loaded'), 'success');
    } catch (reason) {
      reportError(reason);
    }
  };

  const handleDuplicate = async (project: SavedProject) => {
    try {
      await duplicateProject(project.id);
      await refresh();
      dispatchBrowserEvent('projects:changed');
      addToast(t('projects.duplicateSuccess'), 'success');
    } catch (reason) {
      reportError(reason);
    }
  };

  const handleDelete = async (project: SavedProject) => {
    try {
      await deleteProject(project.id);
      await refresh();
      dispatchBrowserEvent('projects:changed');
      addToast(t('projects.deleted'), 'info', {
        label: t('projects.undoDelete'),
        onClick: () => void handleUndo(project),
      });
    } catch (reason) {
      reportError(reason);
    }
  };

  const handleUndo = async (project: SavedProject) => {
    try {
      await restoreProject(project);
    } catch (reason) {
      reportError(reason);
      const message = reason instanceof Error ? reason.message : String(reason);
      addToast(t('projects.actionError', { message }), 'error');
      return;
    }
    addToast(t('projects.restored'), 'success');
    dispatchBrowserEvent('projects:changed');
    try {
      await refresh();
    } catch (reason) {
      reportError(reason);
      const message = reason instanceof Error ? reason.message : String(reason);
      addToast(t('projects.actionError', { message }), 'error');
    }
  };

  const handleExportBackup = async () => {
    setIsExportingBackup(true);
    try {
      const savedProjects = await listProjects();
      if (savedProjects.length === 0) {
        addToast(t('saves.noProjectsToExport'), 'info');
        return;
      }
      await exportProjectsBundle(savedProjects);
      addToast(t('saves.exportedAll', { count: savedProjects.length }), 'success');
    } catch (reason) {
      reportError(reason);
    } finally {
      setIsExportingBackup(false);
    }
  };

  return (
    <section aria-labelledby="workspace-home-title" className="mx-auto w-full max-w-6xl min-w-0 space-y-6">
      <header className="bg-wood-50 dark:bg-wood-900 flex flex-col gap-5 rounded-3xl p-5 sm:flex-row sm:items-center sm:p-8">
        <div className="min-w-0 flex-1">
          <p className="text-accent text-sm font-semibold">{t('app.title')}</p>
          <h1
            id="workspace-home-title"
            className="text-wood-900 dark:text-wood-50 mt-2 text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            {t('projects.homeTitle')}
          </h1>
          <p className="text-wood-600 dark:text-wood-300 mt-2 max-w-2xl text-base">{t('projects.homeDescription')}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onOpenExamples}
              className="bg-accent hover:bg-accent-hover focus-visible:outline-accent min-h-11 rounded-full px-5 py-2.5 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {t('projects.startExample')}
            </button>
            <button
              type="button"
              onClick={onOpenTemplates}
              className="border-wood-300 text-wood-800 hover:bg-wood-100 dark:border-wood-600 dark:text-wood-100 dark:hover:bg-wood-800 focus-visible:outline-accent min-h-11 rounded-full border px-5 py-2.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {t('projects.startTemplate')}
            </button>
          </div>
        </div>
        {featuredProject && (
          <div className="w-full shrink-0 sm:max-w-xs">
            <RecentProjectCard
              project={featuredProject}
              featured
              onOpen={handleOpen}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          </div>
        )}
      </header>

      <section
        aria-labelledby="workspace-backup-title"
        className="border-wood-200 dark:border-wood-700 flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0">
          <h2 id="workspace-backup-title" className="text-wood-900 dark:text-wood-50 text-lg font-semibold">
            {t('projects.backupTitle')}
          </h2>
          <p className="text-wood-600 dark:text-wood-300 mt-1 text-sm">{t('projects.backupDescription')}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <StorageQuotaBadge />
          <button
            type="button"
            onClick={() => void handleExportBackup()}
            disabled={isLoading || isExportingBackup || projects.length === 0}
            className="bg-accent hover:bg-accent-hover focus-visible:outline-accent min-h-11 rounded-full px-5 py-2.5 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('projects.exportBackup')}
          </button>
        </div>
      </section>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-wood-900 dark:text-wood-50 text-xl font-semibold">{t('projects.recentProjects')}</h2>
          <p className="text-wood-600 dark:text-wood-300 mt-1 text-sm">{t('projects.recentDescription')}</p>
        </div>
        <label className="w-full sm:max-w-sm">
          <span className="sr-only">{t('projects.searchPlaceholder')}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('projects.searchPlaceholder')}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 text-wood-800 dark:text-wood-100 focus:border-accent focus:ring-accent min-h-11 w-full rounded-xl border bg-white px-4 py-2 text-sm focus:ring-2 focus:outline-none"
          />
        </label>
      </div>

      {isLoading ? (
        <p role="status" className="text-wood-600 dark:text-wood-300 py-8 text-center text-sm">
          {t('projects.loadingProjects')}
        </p>
      ) : recentProjects.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {recentProjects.map((project) => (
            <li key={project.id} className="min-w-0">
              <RecentProjectCard
                project={project}
                onOpen={handleOpen}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
            </li>
          ))}
        </ul>
      ) : featuredProject && !query.trim() ? (
        <p className="text-wood-600 dark:text-wood-300 text-sm">{t('projects.onlyOneRecent')}</p>
      ) : (
        <div className="border-wood-200 dark:border-wood-700 rounded-2xl border border-dashed p-6 text-center">
          <h3 className="text-wood-800 dark:text-wood-100 font-semibold">
            {query.trim() ? t('projects.noResultsTitle') : t('projects.emptyTitle')}
          </h3>
          <p className="text-wood-600 dark:text-wood-300 mx-auto mt-2 max-w-xl text-sm">
            {query.trim() ? t('projects.noResults', { query }) : t('projects.emptyHomeDescription')}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {query.trim() ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="bg-accent hover:bg-accent-hover min-h-11 rounded-full px-4 text-sm font-semibold text-white"
              >
                {t('projects.clearSearch')}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onOpenProjects}
                  className="bg-accent hover:bg-accent-hover min-h-11 rounded-full px-4 text-sm font-semibold text-white"
                >
                  {t('projects.manageProjects')}
                </button>
                <button
                  type="button"
                  onClick={onOpenExamples}
                  className="border-wood-300 dark:border-wood-600 text-wood-800 dark:text-wood-100 min-h-11 rounded-full border px-4 text-sm font-semibold"
                >
                  {t('projects.startExample')}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
