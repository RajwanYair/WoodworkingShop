import { useTranslation } from 'react-i18next';
import type { Part } from '../../engine/core/types';
import { createExplodedDrawingLayout, drawingPointsAttribute } from './exploded-drawing-layout';

interface ExplodedDrawingPanelProps {
  parts: readonly Part[];
}

export function ExplodedDrawingPanel({ parts }: Readonly<ExplodedDrawingPanelProps>) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === 'he' ? 'he' : 'en';
  const layout = createExplodedDrawingLayout(parts, lang);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        role="img"
        aria-label={t('preview.explodedDrawing')}
        className="border-wood-200 dark:border-wood-700 dark:bg-wood-900 text-wood-700 dark:text-wood-200 block w-[900px] max-w-none rounded-sm border bg-white"
      >
        <title>{t('preview.explodedDrawing')}</title>
        {layout.items.map((item) => (
          <g key={item.partId}>
            <polygon
              points={drawingPointsAttribute(item.sideFace)}
              fill="currentColor"
              fillOpacity="0.22"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <polygon
              points={drawingPointsAttribute(item.frontFace)}
              fill="currentColor"
              fillOpacity="0.1"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <polygon
              points={drawingPointsAttribute(item.topFace)}
              fill="currentColor"
              fillOpacity="0.34"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <line
              x1={item.balloon.x}
              y1={item.balloon.y - 12}
              x2={item.topFace[0]!.x}
              y2={item.topFace[0]!.y}
              stroke="currentColor"
              strokeWidth="1"
            />
            <circle cx={item.balloon.x} cy={item.balloon.y} r="12" fill="currentColor" />
            <text
              x={item.balloon.x}
              y={item.balloon.y + 3}
              fill="white"
              fontSize="8"
              fontWeight="700"
              textAnchor="middle"
            >
              {item.partId}
            </text>
            <text x={item.label.x} y={item.label.y} fill="currentColor" fontSize="10">
              {item.partId}: {item.partName} × {item.quantity}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
