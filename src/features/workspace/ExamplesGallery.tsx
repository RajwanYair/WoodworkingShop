import { useTranslation } from 'react-i18next';
import { EXAMPLE_PROJECTS, type ExampleProject } from '../../engine/project/index';
import { useCabinetStore } from '../../store/cabinet-store';
import { useToastStore } from '../../store/toast-store';
import { Dialog } from '../../ui/Dialog';
import { IconX } from '../../ui/Icons';
import { translateKey } from '../../i18n/translate';

/** Front-face silhouette for every cabinet in the project, scaled to share one 100×60 viewBox. */
function ExampleThumbnail({ project }: Readonly<{ project: ExampleProject }>) {
  const cabinets = project.cabinets;
  const maxHeight = Math.max(...cabinets.map((c) => c.config.height));
  const totalWidth = cabinets.reduce((sum, c) => sum + c.config.width, 0) + (cabinets.length - 1) * 40;
  const scale = Math.min(90 / totalWidth, 50 / maxHeight);
  let x = (100 - totalWidth * scale) / 2;

  return (
    <svg viewBox="0 0 100 60" aria-hidden="true" className="text-wood-700 dark:text-wood-200 h-15 w-25 shrink-0">
      {cabinets.map((cabinet) => {
        const w = cabinet.config.width * scale;
        const h = cabinet.config.height * scale;
        const rectX = x;
        const rectY = 55 - h;
        x += w + 40 * scale;
        return (
          <rect
            key={cabinet.name}
            x={rectX}
            y={rectY}
            width={w}
            height={h}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            rx={0.5}
          />
        );
      })}
    </svg>
  );
}

interface ExamplesGalleryProps {
  onClose: () => void;
}

export function ExamplesGallery({ onClose }: Readonly<ExamplesGalleryProps>) {
  const { t } = useTranslation();
  const loadProject = useCabinetStore((s) => s.loadProject);
  const setProjectName = useCabinetStore((s) => s.setProjectName);
  const addToast = useToastStore((s) => s.addToast);

  const handleUse = (project: ExampleProject) => {
    loadProject(project.cabinets.map((c) => ({ name: c.name, config: c.config })));
    setProjectName(translateKey(t, `examples.items.${project.id}.name`));
    addToast(t('projects.loaded'), 'success');
    onClose();
  };

  return (
    <Dialog
      title={t('examples.title')}
      onClose={onClose}
      labelledBy="examples-title"
      showHeader={false}
      className="dark:bg-wood-800 relative mx-4 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white p-0 text-start shadow-2xl"
    >
      <div className="border-wood-200 dark:border-wood-700 flex items-center justify-between border-b p-4">
        <div>
          <h2 id="examples-title" className="text-wood-800 dark:text-wood-100 text-lg font-bold">
            {t('examples.title')}
          </h2>
          <p className="text-wood-600 dark:text-wood-300 mt-0.5 text-xs">{t('examples.subtitle')}</p>
        </div>
        <button
          onClick={onClose}
          className="text-wood-400 hover:text-wood-700 dark:hover:text-wood-200 flex items-center"
          aria-label={t('examples.close')}
        >
          <IconX size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 overflow-y-auto p-4 sm:grid-cols-2">
        {EXAMPLE_PROJECTS.map((project) => {
          const name = translateKey(t, `examples.items.${project.id}.name`);
          return (
            <div
              key={project.id}
              className="border-wood-200 dark:border-wood-700 flex flex-col gap-2 rounded-lg border p-3"
            >
              <div className="flex items-start gap-3">
                <ExampleThumbnail project={project} />
                <div className="min-w-0">
                  <h3 className="text-wood-800 dark:text-wood-100 text-sm font-semibold">{name}</h3>
                  <p className="text-wood-500 dark:text-wood-400 mt-0.5 text-xs leading-snug">
                    {translateKey(t, `examples.items.${project.id}.description`)}
                  </p>
                  <p className="text-wood-400 dark:text-wood-500 mt-1 text-xs">
                    {t('examples.cabinetCount', { count: project.cabinets.length })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleUse(project)}
                aria-label={`${t('examples.use')}: ${name}`}
                className="bg-accent hover:bg-accent/90 mt-auto self-start rounded-full px-3 py-1.5 text-xs font-semibold text-white transition-colors"
              >
                {t('examples.use')}
              </button>
            </div>
          );
        })}
      </div>
    </Dialog>
  );
}
