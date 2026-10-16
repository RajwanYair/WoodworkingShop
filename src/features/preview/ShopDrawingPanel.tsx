import { useTranslation } from 'react-i18next';
import { computeDimensions } from '../../engine/geometry/dimensions';
import { getMaterial } from '../../engine/materials/materials';
import { useCabinetStore } from '../../store/cabinet-store';
import { useCustomMaterialsStore } from '../../store/custom-materials-store';
import { formatDim } from '../../utils/units';

export function ShopDrawingPanel() {
  const { t } = useTranslation();
  const { config, units } = useCabinetStore();
  const customMaterials = useCustomMaterialsStore((state) => state.materials);
  const carcassThickness = getMaterial(config.carcassMaterial, customMaterials).thickness;
  const backThickness = getMaterial(config.backPanelMaterial, customMaterials).thickness;
  const dimensions = computeDimensions(config, customMaterials);
  const width = config.width;
  const height = config.height;
  const depth = config.depth;
  const widthScale = Math.min(420 / width, 220 / height);
  const sideScale = Math.min(420 / depth, 220 / height);
  const topScale = Math.min(420 / width, 220 / depth);
  const frontWidth = width * widthScale;
  const frontHeight = height * widthScale;
  const sideDepth = depth * sideScale;
  const sideHeight = height * sideScale;
  const topWidth = width * topScale;
  const topDepth = depth * topScale;
  const frontX = (540 - frontWidth) / 2;
  const frontY = 112;
  const sideX = 620 + (540 - sideDepth) / 2;
  const sideY = 112;
  const topX = (540 - topWidth) / 2;
  const topY = 452;
  const sectionX = 620 + frontX;
  const sectionY = 452;
  const dimensionLabel = (value: number) => formatDim(value, units);

  return (
    <svg
      viewBox="0 0 1200 800"
      role="img"
      aria-label={t('preview.shopDrawing')}
      className="border-wood-200 dark:border-wood-700 dark:bg-wood-900 text-wood-700 dark:text-wood-200 mx-auto block w-full max-w-5xl rounded-sm border bg-white"
    >
      <title>{t('preview.shopDrawing')}</title>
      <defs>
        <pattern
          id="drawing-section-hatch"
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="7" stroke="currentColor" strokeWidth="0.7" opacity="0.5" />
        </pattern>
      </defs>
      <text x="32" y="40" fontSize="20" fontWeight="600" fill="currentColor">
        {t('preview.shopDrawing')}
      </text>
      <text x="1168" y="40" textAnchor="end" fontSize="12" className="tabular-nums" fill="currentColor">
        {dimensionLabel(width)} × {dimensionLabel(height)} × {dimensionLabel(depth)}
      </text>
      <line x1="32" y1="54" x2="1168" y2="54" stroke="currentColor" strokeWidth="1" opacity="0.45" />

      <g fill="none" stroke="currentColor" strokeWidth="1" opacity="0.22">
        <rect x="24" y="70" width="556" height="330" />
        <rect x="604" y="70" width="572" height="330" />
        <rect x="24" y="414" width="556" height="330" />
        <rect x="604" y="414" width="572" height="330" />
      </g>

      <g fontSize="13" fontWeight="600" fill="currentColor">
        <text x="42" y="96">
          {t('preview.drawingFront')}
        </text>
        <text x="622" y="96">
          {t('preview.drawingSide')}
        </text>
        <text x="42" y="440">
          {t('preview.drawingTop')}
        </text>
        <text x="622" y="440">
          {t('preview.drawingSection')}
        </text>
      </g>

      <g stroke="currentColor" strokeWidth="1.4" fill="none">
        <rect x={frontX} y={frontY} width={frontWidth} height={frontHeight} />
        <rect
          x={frontX + carcassThickness * widthScale}
          y={frontY + carcassThickness * widthScale}
          width={dimensions.internalWidth * widthScale}
          height={dimensions.internalHeight * widthScale}
          strokeDasharray="4 3"
          opacity="0.7"
        />
        <line
          x1={frontX}
          y1={frontY + frontHeight + 24}
          x2={frontX + frontWidth}
          y2={frontY + frontHeight + 24}
          strokeWidth="1"
        />
        <line
          x1={frontX}
          y1={frontY + frontHeight + 49}
          x2={frontX + frontWidth}
          y2={frontY + frontHeight + 49}
          strokeWidth="1.4"
        />
        <line x1={frontX - 22} y1={frontY} x2={frontX - 22} y2={frontY + frontHeight} strokeWidth="1" />
        <line x1={frontX - 47} y1={frontY} x2={frontX - 47} y2={frontY + frontHeight} strokeWidth="1.4" />
        <line x1={frontX} y1={frontY + frontHeight + 24} x2={frontX} y2={frontY + frontHeight + 49} />
        <line
          x1={frontX + carcassThickness * widthScale}
          y1={frontY + frontHeight + 24}
          x2={frontX + carcassThickness * widthScale}
          y2={frontY + frontHeight + 49}
        />
        <line
          x1={frontX + (width - carcassThickness) * widthScale}
          y1={frontY + frontHeight + 24}
          x2={frontX + (width - carcassThickness) * widthScale}
          y2={frontY + frontHeight + 49}
        />
        <line
          x1={frontX + frontWidth}
          y1={frontY + frontHeight + 24}
          x2={frontX + frontWidth}
          y2={frontY + frontHeight + 49}
        />
        <line x1={frontX - 22} y1={frontY} x2={frontX - 47} y2={frontY} />
        <line
          x1={frontX - 22}
          y1={frontY + carcassThickness * widthScale}
          x2={frontX - 47}
          y2={frontY + carcassThickness * widthScale}
        />
        <line
          x1={frontX - 22}
          y1={frontY + (height - carcassThickness) * widthScale}
          x2={frontX - 47}
          y2={frontY + (height - carcassThickness) * widthScale}
        />
        <line x1={frontX - 22} y1={frontY + frontHeight} x2={frontX - 47} y2={frontY + frontHeight} />
      </g>

      <g fill="currentColor" fontSize="10" textAnchor="middle" className="tabular-nums">
        <text x={frontX + frontWidth / 2} y={frontY + frontHeight + 20}>
          {t('preview.overallWidth')}: {dimensionLabel(width)}
        </text>
        <text x={frontX + frontWidth / 2} y={frontY + frontHeight + 45}>
          {dimensionLabel(carcassThickness)} · {dimensionLabel(dimensions.internalWidth)} ·{' '}
          {dimensionLabel(carcassThickness)}
        </text>
        <text
          x={frontX - 52}
          y={frontY + frontHeight / 2}
          transform={`rotate(-90 ${frontX - 52} ${frontY + frontHeight / 2})`}
        >
          {t('preview.overallHeight')}: {dimensionLabel(height)}
        </text>
        <text
          x={frontX - 27}
          y={frontY + frontHeight / 2}
          transform={`rotate(-90 ${frontX - 27} ${frontY + frontHeight / 2})`}
        >
          {dimensionLabel(carcassThickness)} · {dimensionLabel(dimensions.internalHeight)} ·{' '}
          {dimensionLabel(carcassThickness)}
        </text>
      </g>

      <g stroke="currentColor" strokeWidth="1.4" fill="none">
        <rect x={sideX} y={sideY} width={sideDepth} height={sideHeight} />
        <rect
          x={sideX}
          y={sideY}
          width={Math.max(sideDepth - backThickness * sideScale, 0)}
          height={sideHeight}
          strokeDasharray="4 3"
          opacity="0.7"
        />
        <line x1={sideX} y1={sideY + sideHeight + 24} x2={sideX + sideDepth} y2={sideY + sideHeight + 24} />
        <line x1={sideX} y1={sideY + sideHeight + 49} x2={sideX + sideDepth} y2={sideY + sideHeight + 49} />
        <line x1={sideX - 22} y1={sideY} x2={sideX - 22} y2={sideY + sideHeight} />
        <line x1={sideX - 47} y1={sideY} x2={sideX - 47} y2={sideY + sideHeight} />
        <line x1={sideX} y1={sideY + sideHeight + 24} x2={sideX} y2={sideY + sideHeight + 49} />
        <line
          x1={sideX + sideDepth - backThickness * sideScale}
          y1={sideY + sideHeight + 24}
          x2={sideX + sideDepth - backThickness * sideScale}
          y2={sideY + sideHeight + 49}
        />
        <line x1={sideX + sideDepth} y1={sideY + sideHeight + 24} x2={sideX + sideDepth} y2={sideY + sideHeight + 49} />
        <line x1={sideX - 22} y1={sideY} x2={sideX - 47} y2={sideY} />
        <line x1={sideX - 22} y1={sideY + sideHeight} x2={sideX - 47} y2={sideY + sideHeight} />
        {Array.from({ length: config.shelfCount }, (_, index) => {
          const shelfY = sideY + ((index + 1) * sideHeight) / (config.shelfCount + 1);
          return (
            <line
              key={`side-shelf-${index}`}
              x1={sideX}
              y1={shelfY}
              x2={sideX + sideDepth - backThickness * sideScale}
              y2={shelfY}
            />
          );
        })}
      </g>
      <g fill="currentColor" fontSize="10" textAnchor="middle" className="tabular-nums">
        <text x={sideX + sideDepth / 2} y={sideY + sideHeight + 20}>
          {t('preview.overallDepth')}: {dimensionLabel(depth)}
        </text>
        <text x={sideX + sideDepth / 2} y={sideY + sideHeight + 45}>
          {dimensionLabel(depth - backThickness)} · {dimensionLabel(backThickness)}
        </text>
        <text
          x={sideX - 52}
          y={sideY + sideHeight / 2}
          transform={`rotate(-90 ${sideX - 52} ${sideY + sideHeight / 2})`}
        >
          {t('preview.overallHeight')}: {dimensionLabel(height)}
        </text>
      </g>

      <g stroke="currentColor" strokeWidth="1.4" fill="none">
        <rect x={topX} y={topY} width={topWidth} height={topDepth} />
        <line x1={topX} y1={topY + topDepth + 24} x2={topX + topWidth} y2={topY + topDepth + 24} />
        <line x1={topX} y1={topY + topDepth + 49} x2={topX + topWidth} y2={topY + topDepth + 49} strokeWidth="1.4" />
        <line x1={topX - 22} y1={topY} x2={topX - 22} y2={topY + topDepth} />
        <line x1={topX - 47} y1={topY} x2={topX - 47} y2={topY + topDepth} strokeWidth="1.4" />
      </g>
      <g fill="currentColor" fontSize="10" textAnchor="middle" className="tabular-nums">
        <text x={topX + topWidth / 2} y={topY + topDepth + 20}>
          {t('preview.overallWidth')}: {dimensionLabel(width)}
        </text>
        <text x={topX - 27} y={topY + topDepth / 2} transform={`rotate(-90 ${topX - 27} ${topY + topDepth / 2})`}>
          {t('preview.overallDepth')}: {dimensionLabel(depth)}
        </text>
      </g>

      <g stroke="currentColor" strokeWidth="1.4" fill="none">
        <rect x={sectionX} y={sectionY} width={frontWidth} height={frontHeight} fill="url(#drawing-section-hatch)" />
        <rect
          x={sectionX + carcassThickness * widthScale}
          y={sectionY + carcassThickness * widthScale}
          width={dimensions.internalWidth * widthScale}
          height={dimensions.internalHeight * widthScale}
          fill="white"
          className="dark:fill-wood-900"
        />
        {Array.from({ length: config.shelfCount }, (_, index) => {
          const shelfY =
            sectionY +
            carcassThickness * widthScale +
            ((index + 1) * dimensions.internalHeight * widthScale) / (config.shelfCount + 1);
          return (
            <rect
              key={`section-shelf-${index}`}
              x={sectionX + carcassThickness * widthScale}
              y={shelfY - (carcassThickness * widthScale) / 2}
              width={dimensions.internalWidth * widthScale}
              height={Math.max(carcassThickness * widthScale, 1)}
              fill="url(#drawing-section-hatch)"
            />
          );
        })}
        <line
          x1={sectionX}
          y1={sectionY + frontHeight + 49}
          x2={sectionX + frontWidth}
          y2={sectionY + frontHeight + 49}
        />
        <line x1={sectionX - 47} y1={sectionY} x2={sectionX - 47} y2={sectionY + frontHeight} />
      </g>
      <g fill="currentColor" fontSize="10" textAnchor="middle" className="tabular-nums">
        <text x={sectionX + frontWidth / 2} y={sectionY + frontHeight + 45}>
          {t('preview.overallWidth')}: {dimensionLabel(width)}
        </text>
        <text
          x={sectionX - 52}
          y={sectionY + frontHeight / 2}
          transform={`rotate(-90 ${sectionX - 52} ${sectionY + frontHeight / 2})`}
        >
          {t('preview.overallHeight')}: {dimensionLabel(height)}
        </text>
      </g>
    </svg>
  );
}
