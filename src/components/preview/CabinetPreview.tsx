import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { getMaterial } from '../../engine/materials';
import { computeEqualShelfPositions } from '../../engine/dimensions';

/** Scale factor: mm → SVG px */
const S = 0.2;

type ViewId = 'front' | 'frontOpen' | 'side' | 'top' | 'back';

export function CabinetPreview() {
  const { t } = useTranslation();
  const { config, dimensions: d } = useCabinetStore();
  const [activeView, setActiveView] = useState<ViewId>('front');
  const [showDims, setShowDims] = useState(true);

  const thick = getMaterial(config.carcassMaterial).thickness;
  const bt = getMaterial(config.backPanelMaterial).thickness;
  const color = getMaterial(config.carcassMaterial).color;
  const shelfPositions =
    config.shelfSpacing === 'custom' && config.customShelfPositions.length > 0
      ? config.customShelfPositions
      : computeEqualShelfPositions(d.internalHeight, config.shelfCount);

  const W = config.width * S;
  const H = config.height * S;
  const D = config.depth * S;
  const T = thick * S;
  const dimPad = showDims ? 45 : 30; // extra space for dimension lines

  const views: { id: ViewId; label: string }[] = [
    { id: 'front', label: t('preview.front') },
    { id: 'frontOpen', label: t('preview.frontOpen') },
    { id: 'side', label: t('preview.side') },
    { id: 'top', label: t('preview.top') },
    { id: 'back', label: t('preview.back') },
  ];

  return (
    <div className="space-y-4">
      {/* View tab bar */}
      <div className="flex flex-wrap gap-1 items-center">
        {views.map((v) => (
          <button
            key={v.id}
            onClick={() => setActiveView(v.id)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              activeView === v.id
                ? 'bg-wood-500 text-white'
                : 'bg-wood-100 dark:bg-wood-800 text-wood-600 dark:text-wood-300 hover:bg-wood-200 dark:hover:bg-wood-700'
            }`}
          >
            {v.label}
          </button>
        ))}
        <label className="ms-auto flex items-center gap-1.5 text-xs text-wood-500 dark:text-wood-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showDims}
            onChange={(e) => setShowDims(e.target.checked)}
            className="accent-primary"
          />
          Dimensions
        </label>
      </div>

      {/* Active view */}
      {activeView === 'front' && (
        <ViewBox w={W + dimPad * 2} h={H + dimPad * 2}>
          <g transform={`translate(${dimPad},${dimPad})`}>
            <rect x={0} y={0} width={W} height={H} fill="none" stroke="#444" strokeWidth={1.5} />
            <PartRect x={0} y={0} w={T} h={H} fill={color} label="Side Panel" dim={`${thick}×${config.height}`} />
            <PartRect x={W - T} y={0} w={T} h={H} fill={color} label="Side Panel" dim={`${thick}×${config.height}`} />
            <PartRect x={T} y={0} w={W - 2 * T} h={T} fill={color} label="Top Panel" dim={`${d.internalWidth}×${thick}`} />
            <PartRect x={T} y={H - T} w={W - 2 * T} h={T} fill={color} label="Bottom Panel" dim={`${d.internalWidth}×${thick}`} />
            {config.doorStyle !== 'none' && renderDoors(config, d, S, color)}
            {showDims && (
              <>
                <DimLine x1={0} y1={-8} x2={W} y2={-8} label={`${config.width}`} pos="above" />
                <DimLine x1={W + 8} y1={0} x2={W + 8} y2={H} label={`${config.height}`} pos="right" />
              </>
            )}
          </g>
        </ViewBox>
      )}

      {activeView === 'frontOpen' && (
        <ViewBox w={W + dimPad * 2} h={H + dimPad * 2}>
          <g transform={`translate(${dimPad},${dimPad})`}>
            <rect x={0} y={0} width={W} height={H} fill="none" stroke="#444" strokeWidth={1.5} />
            <PartRect x={0} y={0} w={T} h={H} fill={color} label="Side Panel" dim={`${thick}×${config.height}`} />
            <PartRect x={W - T} y={0} w={T} h={H} fill={color} label="Side Panel" dim={`${thick}×${config.height}`} />
            <PartRect x={T} y={0} w={W - 2 * T} h={T} fill={color} label="Top Panel" dim={`${d.internalWidth}×${thick}`} />
            <PartRect x={T} y={H - T} w={W - 2 * T} h={T} fill={color} label="Bottom Panel" dim={`${d.internalWidth}×${thick}`} />
            {shelfPositions.map((pos, i) => (
              <PartRect
                key={i}
                x={T + 1}
                y={H - T - pos * S}
                w={(W - 2 * T) - 2}
                h={T * 0.6}
                fill={color}
                dashed
                label={`Shelf ${i + 1}`}
                dim={`${d.shelfWidth}×${d.shelfDepth}`}
              />
            ))}
            {showDims && (
              <>
                <DimLine x1={0} y1={-8} x2={W} y2={-8} label={`${config.width}`} pos="above" />
                <DimLine x1={T} y1={-20} x2={W - T} y2={-20} label={`${d.internalWidth}`} pos="above" />
                <DimLine x1={W + 8} y1={0} x2={W + 8} y2={H} label={`${config.height}`} pos="right" />
              </>
            )}
          </g>
        </ViewBox>
      )}

      {activeView === 'side' && (
        <ViewBox w={D + dimPad * 2} h={H + dimPad * 2}>
          <g transform={`translate(${dimPad},${dimPad})`}>
            <rect x={0} y={0} width={D} height={H} fill="none" stroke="#444" strokeWidth={1.5} />
            <rect x={0} y={0} width={D} height={H} fill={color} opacity={0.3} />
            <PartRect x={D - bt * S} y={0} w={bt * S} h={H} fill="#cba" label="Back Panel" dim={`${bt}×${config.height}`} />
            {shelfPositions.map((pos, i) => (
              <PartRect
                key={i}
                x={0}
                y={H - T - pos * S}
                w={D - bt * S}
                h={T * 0.6}
                fill={color}
                dashed
                label={`Shelf ${i + 1}`}
                dim={`${d.shelfDepth}×${thick}`}
              />
            ))}
            {showDims && (
              <>
                <DimLine x1={0} y1={-8} x2={D} y2={-8} label={`${config.depth}`} pos="above" />
                <DimLine x1={D + 8} y1={0} x2={D + 8} y2={H} label={`${config.height}`} pos="right" />
              </>
            )}
          </g>
        </ViewBox>
      )}

      {activeView === 'top' && (
        <ViewBox w={W + dimPad * 2} h={D + dimPad * 2}>
          <g transform={`translate(${dimPad},${dimPad})`}>
            <rect x={0} y={0} width={W} height={D} fill="none" stroke="#444" strokeWidth={1.5} />
            <PartRect x={0} y={0} w={T} h={D} fill={color} label="Side Panel" dim={`${thick}×${config.depth}`} />
            <PartRect x={W - T} y={0} w={T} h={D} fill={color} label="Side Panel" dim={`${thick}×${config.depth}`} />
            <PartRect x={T} y={0} w={W - 2 * T} h={T} fill={color} label="Top Panel" dim={`${d.internalWidth}×${thick}`} />
            <PartRect x={T} y={D - bt * S} w={W - 2 * T} h={bt * S} fill="#cba" label="Back Panel" dim={`${d.backPanelWidth}×${bt}`} />
            {showDims && (
              <>
                <DimLine x1={0} y1={-8} x2={W} y2={-8} label={`${config.width}`} pos="above" />
                <DimLine x1={W + 8} y1={0} x2={W + 8} y2={D} label={`${config.depth}`} pos="right" />
              </>
            )}
          </g>
        </ViewBox>
      )}

      {activeView === 'back' && (
        <ViewBox w={W + dimPad * 2} h={H + dimPad * 2}>
          <g transform={`translate(${dimPad},${dimPad})`}>
            <PartRect x={0} y={0} w={W} h={H} fill="#cba" label="Back Panel" dim={`${d.backPanelWidth}×${d.backPanelHeight}`} />
            <text x={W / 2} y={H / 2} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="#666">
              {Math.round(d.backPanelWidth)} × {Math.round(d.backPanelHeight)}
            </text>
            {showDims && (
              <>
                <DimLine x1={0} y1={-8} x2={W} y2={-8} label={`${config.width}`} pos="above" />
                <DimLine x1={W + 8} y1={0} x2={W + 8} y2={H} label={`${config.height}`} pos="right" />
              </>
            )}
          </g>
        </ViewBox>
      )}
    </div>
  );
}

// ─── SVG sub-components ───

function ViewBox({ w, h, children }: { w: number; h: number; children: React.ReactNode }) {
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full max-w-lg border border-wood-200 dark:border-wood-700 rounded bg-white dark:bg-wood-800"
      style={{ maxHeight: 500 }}
    >
      {children}
    </svg>
  );
}

/** Interactive part rectangle with hover tooltip */
function PartRect({
  x, y, w, h, fill, label, dim, dashed,
}: {
  x: number; y: number; w: number; h: number;
  fill: string; label: string; dim: string; dashed?: boolean;
}) {
  return (
    <rect
      x={x} y={y} width={w} height={h}
      fill={fill} stroke="#666" strokeWidth={0.5}
      strokeDasharray={dashed ? '3,2' : undefined}
      opacity={0.85}
    >
      <title>{`${label}\n${dim} mm`}</title>
    </rect>
  );
}

/** Dimension annotation line with ticks and centered label */
function DimLine({
  x1, y1, x2, y2, label, pos,
}: {
  x1: number; y1: number; x2: number; y2: number;
  label: string; pos: 'above' | 'right';
}) {
  const tickLen = 4;
  const isHorizontal = pos === 'above';
  const mid = isHorizontal
    ? { x: (x1 + x2) / 2, y: y1 - 5 }
    : { x: x1 + 6, y: (y1 + y2) / 2 };

  return (
    <g className="text-wood-500" fill="#888" stroke="#888" strokeWidth={0.5}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      {/* End ticks */}
      {isHorizontal ? (
        <>
          <line x1={x1} y1={y1 - tickLen} x2={x1} y2={y1 + tickLen} />
          <line x1={x2} y1={y2 - tickLen} x2={x2} y2={y2 + tickLen} />
        </>
      ) : (
        <>
          <line x1={x1 - tickLen} y1={y1} x2={x1 + tickLen} y2={y1} />
          <line x1={x2 - tickLen} y1={y2} x2={x2 + tickLen} y2={y2} />
        </>
      )}
      <text
        x={mid.x}
        y={mid.y}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={7}
        fill="#888"
        stroke="none"
        style={isHorizontal ? undefined : { writingMode: 'vertical-rl' as const }}
      >
        {label}
      </text>
    </g>
  );
}

function renderDoors(
  config: { doorCount: number; doorReveal: number; width: number; height: number },
  d: { doorHeight: number; doorWidth: number },
  scale: number,
  color: string,
) {
  const r = config.doorReveal * scale;
  const dw = d.doorWidth * scale;
  const dh = d.doorHeight * scale;
  const doors = [];

  for (let i = 0; i < config.doorCount; i++) {
    const x = r + i * (dw + r);
    doors.push(
      <PartRect
        key={i}
        x={x} y={r} w={dw} h={dh}
        fill={color}
        label={`Door ${i + 1}`}
        dim={`${Math.round(d.doorWidth)}×${Math.round(d.doorHeight)}`}
      />,
    );
  }
  return <>{doors}</>;
}
