import { useState, useCallback, useRef, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { getMaterial } from '../../engine/materials';
import { computeEqualShelfPositions } from '../../engine/dimensions';

/** Scale factor: mm → SVG px */
const S = 0.2;

type ViewId = 'front' | 'frontOpen' | 'side' | 'top' | 'back' | '3d';

export const CabinetPreview = memo(function CabinetPreview() {
  const { t } = useTranslation();
  const { config, dimensions: d, setConfig } = useCabinetStore();
  const [activeView, setActiveView] = useState<ViewId>('front');
  const [showDims, setShowDims] = useState(true);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

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

  /** Convert a mouse/pointer Y in SVG space to a shelf position (mm from bottom of internal space) */
  const svgYToShelfPos = useCallback(
    (clientY: number) => {
      if (!svgRef.current) return 0;
      const svg = svgRef.current;
      const pt = svg.createSVGPoint();
      pt.x = 0;
      pt.y = clientY;
      const svgPt = pt.matrixTransform(svg.getScreenCTM()!.inverse());
      // SVG y is from top; shelf position is mm from bottom of internal space
      const bottomY = dimPad + H - T; // SVG y of bottom panel top edge
      const topY = dimPad + T;        // SVG y of top panel bottom edge
      const clampedY = Math.max(topY + T * 0.6, Math.min(bottomY - T * 0.6, svgPt.y));
      return Math.round((bottomY - clampedY) / S);
    },
    [H, T, S, dimPad],
  );

  const handleShelfDrag = useCallback(
    (e: React.PointerEvent) => {
      if (dragIdx === null) return;
      const pos = svgYToShelfPos(e.clientY);
      const newPositions = [...shelfPositions];
      newPositions[dragIdx] = pos;
      // Keep sorted
      newPositions.sort((a, b) => a - b);
      setConfig({ shelfSpacing: 'custom', customShelfPositions: newPositions });
    },
    [dragIdx, shelfPositions, svgYToShelfPos, setConfig],
  );

  const handleShelfDragEnd = useCallback(() => {
    setDragIdx(null);
  }, []);

  const views: { id: ViewId; label: string }[] = [
    { id: 'front', label: t('preview.front') },
    { id: 'frontOpen', label: t('preview.frontOpen') },
    { id: 'side', label: t('preview.side') },
    { id: 'top', label: t('preview.top') },
    { id: 'back', label: t('preview.back') },
    { id: '3d', label: t('preview.iso') },
  ];

  return (
    <div className="space-y-4">
      {/* View tab bar */}
      <div className="flex flex-wrap gap-1 items-center" role="tablist" aria-label="Cabinet view selector">
        {views.map((v) => (
          <button
            key={v.id}
            role="tab"
            aria-selected={activeView === v.id}
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
        <ViewBox
          w={W + dimPad * 2}
          h={H + dimPad * 2}
          svgRef={svgRef}
          onPointerMove={dragIdx !== null ? handleShelfDrag : undefined}
          onPointerUp={dragIdx !== null ? handleShelfDragEnd : undefined}
        >
          <g transform={`translate(${dimPad},${dimPad})`}>
            <rect x={0} y={0} width={W} height={H} fill="none" stroke="#444" strokeWidth={1.5} />
            <PartRect x={0} y={0} w={T} h={H} fill={color} label="Side Panel" dim={`${thick}×${config.height}`} />
            <PartRect x={W - T} y={0} w={T} h={H} fill={color} label="Side Panel" dim={`${thick}×${config.height}`} />
            <PartRect x={T} y={0} w={W - 2 * T} h={T} fill={color} label="Top Panel" dim={`${d.internalWidth}×${thick}`} />
            <PartRect x={T} y={H - T} w={W - 2 * T} h={T} fill={color} label="Bottom Panel" dim={`${d.internalWidth}×${thick}`} />
            {shelfPositions.map((pos, i) => {
              const sy = H - T - pos * S;
              return (
                <g
                  key={i}
                  onPointerDown={(e) => {
                    setDragIdx(i);
                    (e.target as Element).setPointerCapture(e.pointerId);
                  }}
                  style={{ cursor: 'ns-resize' }}
                >
                  <rect
                    x={T + 1}
                    y={sy}
                    width={(W - 2 * T) - 2}
                    height={T * 0.6}
                    fill={dragIdx === i ? '#FFD700' : color}
                    stroke={dragIdx === i ? '#B8860B' : '#666'}
                    strokeWidth={dragIdx === i ? 1.5 : 0.5}
                    strokeDasharray="3,2"
                    opacity={0.85}
                  >
                    <title>{`Shelf ${i + 1}\n${d.shelfWidth}×${d.shelfDepth} mm\n↕ Drag to reposition`}</title>
                  </rect>
                  {/* Drag grip indicator */}
                  <text
                    x={T + 6}
                    y={sy + T * 0.3 + 1}
                    fontSize={4}
                    fill="#999"
                    pointerEvents="none"
                  >
                    ⇕
                  </text>
                </g>
              );
            })}
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
      {activeView === '3d' && (
        <IsometricView
          w={config.width}
          h={config.height}
          d={config.depth}
          thick={thick}
          bt={bt}
          color={color}
          shelfPositions={shelfPositions}
          hasDoors={config.doorStyle !== 'none'}
          doorCount={config.doorCount}
          doorReveal={config.doorReveal}
          doorWidth={d.doorWidth}
          doorHeight={d.doorHeight}
          showDims={showDims}
        />
      )}
    </div>
  );
});

// ─── SVG sub-components ───

function ViewBox({
  w, h, children, svgRef, onPointerMove, onPointerUp,
}: {
  w: number; h: number; children: React.ReactNode;
  svgRef?: React.Ref<SVGSVGElement>;
  onPointerMove?: (e: React.PointerEvent) => void;
  onPointerUp?: (e: React.PointerEvent) => void;
}) {
  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label="Cabinet drawing"
      className="w-full max-w-lg border border-wood-200 dark:border-wood-700 rounded bg-white dark:bg-wood-800"
      style={{ maxHeight: 500, touchAction: 'none' }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
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

// ─── Isometric 3D view ───

/** Isometric projection helpers: convert (x, y, z) → SVG (sx, sy).
 *  Uses standard 30° isometric angles: cos30 ≈ 0.866, sin30 = 0.5 */
function iso(x: number, y: number, z: number): [number, number] {
  const sx = (x - z) * 0.866;
  const sy = (x + z) * 0.5 - y;
  return [sx, sy];
}

function isoQuad(
  p1: [number, number, number],
  p2: [number, number, number],
  p3: [number, number, number],
  p4: [number, number, number],
): string {
  const pts = [p1, p2, p3, p4].map(([x, y, z]) => iso(x, y, z));
  return pts.map(([sx, sy]) => `${sx},${sy}`).join(' ');
}

function IsometricView({
  w, h, d, thick, bt, color, shelfPositions, hasDoors, doorCount, doorReveal, doorWidth, doorHeight, showDims,
}: {
  w: number; h: number; d: number; thick: number; bt: number;
  color: string; shelfPositions: number[]; hasDoors: boolean;
  doorCount: number; doorReveal: number; doorWidth: number; doorHeight: number;
  showDims: boolean;
}) {
  const sc = 0.18; // scale
  const W = w * sc;
  const H = h * sc;
  const D = d * sc;
  const T = thick * sc;
  const BT = bt * sc;

  // Compute SVG bounding box from iso projection
  const corners: [number, number, number][] = [
    [0, 0, 0], [W, 0, 0], [0, H, 0], [W, H, 0],
    [0, 0, D], [W, 0, D], [0, H, D], [W, H, D],
  ];
  const projected = corners.map(([x, y, z]) => iso(x, y, z));
  const minX = Math.min(...projected.map(p => p[0]));
  const maxX = Math.max(...projected.map(p => p[0]));
  const minY = Math.min(...projected.map(p => p[1]));
  const maxY = Math.max(...projected.map(p => p[1]));
  const pad = showDims ? 60 : 30;
  const vw = maxX - minX + pad * 2;
  const vh = maxY - minY + pad * 2;
  const ox = -minX + pad;
  const oy = -minY + pad;

  const darkFill = adjustBrightness(color, -30);
  const lightFill = adjustBrightness(color, 20);

  return (
    <svg
      viewBox={`0 0 ${vw} ${vh}`}
      role="img"
      aria-label="3D isometric cabinet drawing"
      className="w-full max-w-lg border border-wood-200 dark:border-wood-700 rounded bg-white dark:bg-wood-800"
      style={{ maxHeight: 500 }}
    >
      <g transform={`translate(${ox},${oy})`}>
        {/* Back panel */}
        <polygon
          points={isoQuad([T, T, D - BT], [W - T, T, D - BT], [W - T, H - T, D - BT], [T, H - T, D - BT])}
          fill="#cba" stroke="#666" strokeWidth={0.5} opacity={0.4}
        >
          <title>{`Back Panel\n${Math.round(w - 2 * thick)}×${Math.round(h - 2 * thick)} mm`}</title>
        </polygon>

        {/* Bottom panel – top face */}
        <polygon
          points={isoQuad([T, T, 0], [W - T, T, 0], [W - T, T, D - BT], [T, T, D - BT])}
          fill={lightFill} stroke="#666" strokeWidth={0.5} opacity={0.85}
        >
          <title>{`Bottom Panel\n${Math.round(w - 2 * thick)}×${Math.round(d - bt)} mm`}</title>
        </polygon>
        {/* Bottom panel – front face */}
        <polygon
          points={isoQuad([T, 0, 0], [W - T, 0, 0], [W - T, T, 0], [T, T, 0])}
          fill={darkFill} stroke="#666" strokeWidth={0.5} opacity={0.85}
        />

        {/* Shelves */}
        {shelfPositions.map((pos, i) => {
          const sy = T + pos * sc;
          const sT = T * 0.6;
          return (
            <g key={i}>
              <polygon
                points={isoQuad([T, sy + sT, 0], [W - T, sy + sT, 0], [W - T, sy + sT, D - BT], [T, sy + sT, D - BT])}
                fill={lightFill} stroke="#888" strokeWidth={0.3} opacity={0.6}
                strokeDasharray="2,2"
              >
                <title>{`Shelf ${i + 1}\n${Math.round(w - 2 * thick)}×${Math.round(d - bt)} mm`}</title>
              </polygon>
            </g>
          );
        })}

        {/* Left side panel – outer face */}
        <polygon
          points={isoQuad([0, 0, 0], [0, 0, D], [0, H, D], [0, H, 0])}
          fill={darkFill} stroke="#666" strokeWidth={0.5} opacity={0.85}
        >
          <title>{`Side Panel\n${thick}×${h} mm`}</title>
        </polygon>

        {/* Right side panel – outer face */}
        <polygon
          points={isoQuad([W, 0, 0], [W, H, 0], [W, H, D], [W, 0, D])}
          fill={color} stroke="#666" strokeWidth={0.5} opacity={0.65}
        >
          <title>{`Side Panel\n${thick}×${h} mm`}</title>
        </polygon>

        {/* Top panel – top face */}
        <polygon
          points={isoQuad([0, H, 0], [0, H, D], [W, H, D], [W, H, 0])}
          fill={lightFill} stroke="#666" strokeWidth={0.5} opacity={0.85}
        >
          <title>{`Top Panel\n${Math.round(w - 2 * thick)}×${Math.round(d - bt)} mm`}</title>
        </polygon>

        {/* Doors (front face) */}
        {hasDoors && Array.from({ length: doorCount }).map((_, i) => {
          const dr = doorReveal * sc;
          const dw = doorWidth * sc;
          const dh = doorHeight * sc;
          const dx = dr + i * (dw + dr);
          return (
            <g key={`door-${i}`}>
              {/* Door front face */}
              <polygon
                points={isoQuad([dx, dr, 0], [dx + dw, dr, 0], [dx + dw, dr + dh, 0], [dx, dr + dh, 0])}
                fill={color} stroke="#555" strokeWidth={0.8} opacity={0.9}
              >
                <title>{`Door ${i + 1}\n${Math.round(doorWidth)}×${Math.round(doorHeight)} mm`}</title>
              </polygon>
              {/* Handle indicator */}
              <polygon
                points={isoQuad(
                  [dx + dw - 8 * sc, dr + dh * 0.45, -0.5 * sc],
                  [dx + dw - 6 * sc, dr + dh * 0.45, -0.5 * sc],
                  [dx + dw - 6 * sc, dr + dh * 0.55, -0.5 * sc],
                  [dx + dw - 8 * sc, dr + dh * 0.55, -0.5 * sc],
                )}
                fill="#888" stroke="#666" strokeWidth={0.3}
              />
            </g>
          );
        })}

        {/* Dimension annotations */}
        {showDims && (
          <>
            {/* Width – along front bottom edge */}
            <IsoDimLine
              p1={[0, 0, -12 * sc]} p2={[W, 0, -12 * sc]}
              label={`${w}`} offset={-6}
            />
            {/* Height – along front left edge */}
            <IsoDimLine
              p1={[-12 * sc, 0, 0]} p2={[-12 * sc, H, 0]}
              label={`${h}`} offset={-6}
            />
            {/* Depth – along bottom left edge */}
            <IsoDimLine
              p1={[-12 * sc, 0, 0]} p2={[-12 * sc, 0, D]}
              label={`${d}`} offset={-6}
            />
          </>
        )}
      </g>
    </svg>
  );
}

function IsoDimLine({ p1, p2, label, offset: _offset }: {
  p1: [number, number, number]; p2: [number, number, number]; label: string; offset: number;
}) {
  const [x1, y1] = iso(...p1);
  const [x2, y2] = iso(...p2);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return (
    <g fill="#888" stroke="#888" strokeWidth={0.5}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <circle cx={x1} cy={y1} r={1.5} />
      <circle cx={x2} cy={y2} r={1.5} />
      <text x={mx} y={my - 4} textAnchor="middle" fontSize={7} fill="#888" stroke="none">
        {label}
      </text>
    </g>
  );
}

/** Simple brightness adjustment for hex colors */
function adjustBrightness(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xFF) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xFF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xFF) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
