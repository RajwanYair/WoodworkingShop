import { useRef, useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { useToastStore } from '../../store/toast-store';
import {
  listProjects,
  saveProject,
  deleteProject,
  exportProjectJson,
  importProjectJson,
  type SavedProject,
} from '../../utils/project-storage';
import { IconX, IconDownload, IconFolder } from '../layout/Icons';

interface ProjectManagerModalProps {
  onClose: () => void;
}

export function ProjectManagerModal({ onClose }: ProjectManagerModalProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cabinets = useCabinetStore((s) => s.cabinets);
  const projectName = useCabinetStore((s) => s.projectName);
  const loadProject = useCabinetStore((s) => s.loadProject);
  const setProjectName = useCabinetStore((s) => s.setProjectName);
  const addToast = useToastStore((s) => s.addToast);
  const [projects, setProjects] = useState<SavedProject[]>(() => listProjects());
  const [saveName, setSaveName] = useState(projectName || '');

  const refresh = useCallback(() => setProjects(listProjects()), []);

  // Focus trap
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length > 0) focusable[0].focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSave = () => {
    if (!saveName.trim()) return;
    saveProject(saveName.trim(), cabinets);
    setProjectName(saveName.trim());
    addToast(t('projects.saved'), 'success');
    refresh();
  };

  const handleLoad = (project: SavedProject) => {
    loadProject(project.cabinets);
    setProjectName(project.name);
    addToast(t('projects.loaded'), 'success');
    onClose();
  };

  const handleDelete = (project: SavedProject) => {
    deleteProject(project.id);
    addToast(t('projects.deleted'), 'info');
    refresh();
  };

  const handleExport = (project: SavedProject) => {
    exportProjectJson(project);
    addToast(t('projects.exported'), 'success');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importProjectJson(file);
      addToast(t('projects.imported'), 'success');
      refresh();
    } catch {
      addToast(t('projects.importError'), 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const fmt = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop — click outside to close */}
      <button
        type="button"
        className="absolute inset-0 bg-black/50 w-full h-full border-0 p-0 cursor-default"
        onClick={onClose}
        aria-label="Close dialog"
        tabIndex={-1}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pm-title"
        className="relative bg-white dark:bg-wood-800 rounded-xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col mx-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-wood-200 dark:border-wood-700">
          <h2 id="pm-title" className="text-lg font-bold text-wood-800 dark:text-wood-100">
            {t('projects.title')}
          </h2>
          <button
            onClick={onClose}
            className="text-wood-400 hover:text-wood-700 dark:hover:text-wood-200 flex items-center"
            aria-label="Close"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Save current project */}
        <div className="p-4 border-b border-wood-200 dark:border-wood-700 space-y-2">
          <p className="text-sm font-semibold text-wood-700 dark:text-wood-200">{t('projects.saveCurrent')}</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
              }}
              placeholder={t('projects.namePlaceholder')}
              className="flex-1 px-3 py-1.5 text-sm rounded border border-wood-300 dark:border-wood-600 bg-white dark:bg-wood-700 text-wood-800 dark:text-wood-100 focus:outline-none focus:border-wood-500"
            />
            <button
              onClick={handleSave}
              disabled={!saveName.trim()}
              className="px-4 py-1.5 text-sm rounded bg-wood-600 text-white hover:bg-wood-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t('projects.save')}
            </button>
          </div>
        </div>

        {/* Project list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {projects.length === 0 ? (
            <p className="text-sm text-wood-400 dark:text-wood-500 text-center py-6">{t('projects.empty')}</p>
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-wood-200 dark:border-wood-700 hover:border-wood-400 dark:hover:border-wood-500 transition-colors"
              >
                <IconFolder size={16} className="text-wood-600 dark:text-wood-300 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-wood-800 dark:text-wood-100 truncate">{project.name}</div>
                  <div className="text-xs text-wood-400 dark:text-wood-500">
                    {project.cabinets.length} {t('projects.cabinets')} · {fmt(project.savedAt)}
                  </div>
                </div>
                <button
                  onClick={() => handleLoad(project)}
                  className="text-xs px-2 py-1 rounded bg-wood-100 dark:bg-wood-700 text-wood-700 dark:text-wood-200 hover:bg-wood-200 dark:hover:bg-wood-600 shrink-0"
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
                  className="text-wood-300 hover:text-red-500 dark:hover:text-red-400 shrink-0"
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
        <div className="p-4 border-t border-wood-200 dark:border-wood-700 flex justify-between items-center">
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
            className="cursor-pointer text-sm px-3 py-1.5 rounded bg-wood-100 dark:bg-wood-700 text-wood-700 dark:text-wood-200 hover:bg-wood-200 dark:hover:bg-wood-600 transition-colors"
          >
            {t('projects.import')}
          </label>
          <button
            onClick={onClose}
            className="text-sm px-4 py-1.5 rounded bg-wood-100 dark:bg-wood-700 text-wood-700 dark:text-wood-200 hover:bg-wood-200 dark:hover:bg-wood-600 transition-colors"
          >
            {t('templates.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
