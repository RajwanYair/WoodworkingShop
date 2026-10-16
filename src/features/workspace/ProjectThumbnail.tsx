import type { SavedProject } from '../../utils/project-storage';

interface ProjectThumbnailProps {
  project: SavedProject;
}

export function ProjectThumbnail({ project }: Readonly<ProjectThumbnailProps>) {
  const cabinet = project.cabinets[0];
  const config = cabinet?.config;
  const aspectRatio = config ? Math.max(0.55, Math.min(1.45, config.width / Math.max(config.height, 1))) : 1;
  const bodyHeight = 62;
  const bodyWidth = Math.round(bodyHeight * aspectRatio);
  const bodyX = (160 - bodyWidth) / 2;
  const doorCount = config?.doorCount ?? 2;
  const shelfCount = Math.max(0, Math.min(4, Math.floor(config?.shelfCount ?? 2)));
  const panelGap = 3;
  const panelWidth = (bodyWidth - 10 - panelGap * (doorCount - 1)) / doorCount;

  return (
    <div className="bg-wood-50 dark:bg-wood-900 flex aspect-[8/5] w-full items-center justify-center overflow-hidden rounded-xl">
      <svg viewBox="0 0 160 100" aria-hidden="true" focusable="false" className="h-full w-full">
        <path d="M0 82h160v18H0z" className="fill-wood-100 dark:fill-wood-800" />
        <path d={`M${bodyX - 4} 17h${bodyWidth + 8}v5H${bodyX - 4}z`} className="fill-wood-400" />
        <rect
          x={bodyX}
          y="22"
          width={bodyWidth}
          height={bodyHeight}
          rx="2"
          className="fill-wood-200 stroke-wood-500 dark:fill-wood-700 dark:stroke-wood-300"
          strokeWidth="1.5"
        />
        {Array.from({ length: doorCount }, (_, index) => {
          const x = bodyX + 5 + index * (panelWidth + panelGap);
          return (
            <g key={index}>
              <rect
                x={x}
                y="27"
                width={panelWidth}
                height="51"
                rx="1"
                className="fill-wood-100 stroke-wood-400 dark:fill-wood-800 dark:stroke-wood-500"
                strokeWidth="1"
              />
              {config?.handleStyle !== 'none' && (
                <circle cx={x + panelWidth * 0.82} cy="52" r="1.7" className="fill-wood-600 dark:fill-wood-300" />
              )}
            </g>
          );
        })}
        {Array.from({ length: shelfCount }, (_, index) => (
          <line
            key={index}
            x1={bodyX + 3}
            x2={bodyX + bodyWidth - 3}
            y1={34 + ((index + 1) * 36) / (shelfCount + 1)}
            y2={34 + ((index + 1) * 36) / (shelfCount + 1)}
            className="stroke-wood-400 dark:stroke-wood-500"
            strokeWidth="1.5"
          />
        ))}
        <path d={`M${bodyX + 5} 84h10v3H${bodyX + 5}zm${bodyWidth - 20} 0h10v3h-10z`} className="fill-wood-500" />
      </svg>
    </div>
  );
}
