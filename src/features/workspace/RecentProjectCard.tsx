import { useTranslation } from 'react-i18next';
import type { SavedProject } from '../../utils/project-storage';
import { ProjectThumbnail } from './ProjectThumbnail';

interface RecentProjectCardProps {
  project: SavedProject;
  featured?: boolean;
  onOpen: (project: SavedProject) => void;
  onDuplicate: (project: SavedProject) => void;
  onDelete: (project: SavedProject) => void;
}

export function RecentProjectCard({
  project,
  featured = false,
  onOpen,
  onDuplicate,
  onDelete,
}: Readonly<RecentProjectCardProps>) {
  const { t } = useTranslation();

  return (
    <article
      className={`border-wood-200 dark:border-wood-700 dark:bg-wood-800 min-w-0 rounded-2xl border bg-white p-3 ${
        featured ? 'shadow-sm' : ''
      }`}
    >
      <ProjectThumbnail project={project} />
      <div className="min-w-0 px-1 pt-3">
        <h3 className="text-wood-900 dark:text-wood-50 truncate text-base font-semibold">{project.name}</h3>
        <p className="text-wood-600 dark:text-wood-300 mt-1 text-sm">
          {project.cabinets.length} {t('projects.cabinets')}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onOpen(project)}
          className="bg-accent hover:bg-accent-hover focus-visible:outline-accent min-h-11 flex-1 rounded-full px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          aria-label={
            featured
              ? t('projects.continueNamed', { name: project.name })
              : t('projects.openNamed', { name: project.name })
          }
        >
          {featured ? t('projects.continueProject') : t('projects.open')}
        </button>
        <button
          type="button"
          onClick={() => onDuplicate(project)}
          className="border-wood-300 text-wood-700 hover:bg-wood-100 dark:border-wood-600 dark:text-wood-200 dark:hover:bg-wood-700 focus-visible:outline-accent min-h-11 rounded-full border px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          aria-label={t('projects.duplicateNamed', { name: project.name })}
        >
          {t('projects.duplicate')}
        </button>
        <button
          type="button"
          onClick={() => onDelete(project)}
          className="text-wood-600 hover:bg-wood-100 dark:text-wood-300 dark:hover:bg-wood-700 focus-visible:outline-accent min-h-11 rounded-full px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          aria-label={t('projects.deleteNamed', { name: project.name })}
        >
          {t('projects.delete')}
        </button>
      </div>
    </article>
  );
}
