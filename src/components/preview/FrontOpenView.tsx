import { useState, useCallback, useRef } from 'react';
import type { CabinetConfig, DerivedDimensions } from '../../engine/types';
import { S } from './preview-constants';
import { ViewBox, PartRect, DimLine } from './preview-svg-parts';
import type { TooltipHandlers } from './preview-svg-parts';

interface FrontOpenViewProps {
  W: number;
  H: number;
  T: number;
  thick: number;
  color: string;
  carcassMatName: string;
  d: DerivedDimensions;
  config: CabinetConfig;
  shelfPositions: number[];
  showDims: boolean;
  dimPad: number;
  fd: (mm: number) => string;
  tp: TooltipHandlers;
  setConfig: (update: Partial<CabinetConfig>) => void;
}

export function FrontOpenView({
  W,
  H,
  T,
  thick,
  color,
  carcassMatName,
  d,
  config,
  shelfPositions,
  showDims,
  dimPad,
  fd,
  tp,
  setConfig,
}: FrontOpenViewProps) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const svgYToShelfPos = useCallback(
    (clientY: number) => {
      if (!svgRef.current) return 0;
      const svg = svgRef.current;
      const pt = svg.createSVGPoint();
      pt.x = 0;
      pt.y = clientY;
      const svgPt = pt.matrixTransform(svg.getScreenCTM()!.inverse());
      const bottomY = dimPad + H - T;
      const topY = dimPad + T;
      const clampedY = Math.max(topY + T * 0.6, Math.min(bottomY - T * 0.6, svgPt.y));
      return Math.round((bottomY - clampedY) / S);
    },
    [H, T, dimPad],
  );

  const handleShelfDrag = useCallback(
    (e: React.PointerEvent) => {
      if (dragIdx === null) return;
      const pos = svgYToShelfPos(e.clientY);
      const newPositions = [...shelfPositions];
      newPositions[dragIdx] = pos;
      newPositions.sort((a, b) => a - b);
      const MIN_GAP = 50;
      for (let i = 1; i < newPositions.length; i++) {
        if (newPositions[i] - newPositions[i - 1] < MIN_GAP) {
          newPositions[i] = newPositions[i - 1] + MIN_GAP;
        }
      }
      setConfig({ shelfSpacing: 'custom', customShelfPositions: newPositions });
    },
    [dragIdx, shelfPositions, svgYToShelfPos, setConfig],
  );

  const handleShelfDragEnd = useCallback(() => {
    setDragIdx(null);
  }, []);

  return (
    <ViewBox
      w={W + dimPad * 2}
      h={H + dimPad * 2}
      svgRef={svgRef}
      onPointerMove={dragIdx !== null ? handleShelfDrag : undefined}
      onPointerUp={dragIdx !== null ? handleShelfDragEnd : undefined}
    >
      <g transform={`translate(${dimPad},${dimPad})`}>
        <rect
          x={0}
          y={0}
          width={W}
          height={H}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeOpacity={0.6}
        />
        <PartRect
          x={0}
          y={0}
          w={T}
          h={H}
          fill={color}
          label="Side Panel"
          dim={`${thick}×${config.height}`}
          material={carcassMatName}
          {...tp}
        />
        <PartRect
          x={W - T}
          y={0}
          w={T}
          h={H}
          fill={color}
          label="Side Panel"
          dim={`${thick}×${config.height}`}
          material={carcassMatName}
          {...tp}
        />
        <PartRect
          x={T}
          y={0}
          w={W - 2 * T}
          h={T}
          fill={color}
          label="Top Panel"
          dim={`${d.internalWidth}×${thick}`}
          material={carcassMatName}
          {...tp}
        />
        <PartRect
          x={T}
          y={H - T}
          w={W - 2 * T}
          h={T}
          fill={color}
          label="Bottom Panel"
          dim={`${d.internalWidth}×${thick}`}
          material={carcassMatName}
          {...tp}
        />
        {shelfPositions.map((pos, i) => {
          const sy = H - T - pos * S;
          return (
            <g
              key={i}
              onPointerDown={(e) => {
                setDragIdx(i);
                (e.target as Element).setPointerCapture(e.pointerId);
              }}
              className="cursor-ns-resize"
            >
              <rect
                x={T + 1}
                y={sy}
                width={W - 2 * T - 2}
                height={T * 0.6}
                fill={dragIdx === i ? '#FFD700' : color}
                stroke={dragIdx === i ? '#B8860B' : '#666'}
                strokeWidth={dragIdx === i ? 1.5 : 0.5}
                strokeDasharray="3,2"
                opacity={0.85}
              >
                <title>{`Shelf ${i + 1}\n${d.shelfWidth}×${d.shelfDepth} mm\n↕ Drag to reposition`}</title>
              </rect>
              {/* Drag grip indicator — three horizontal grip lines */}
              <g pointerEvents="none" opacity={0.55}>
                <line
                  x1={T + 3}
                  y1={sy + T * 0.12}
                  x2={T + 9}
                  y2={sy + T * 0.12}
                  stroke="#777"
                  strokeWidth={0.7}
                  strokeLinecap="round"
                />
                <line
                  x1={T + 3}
                  y1={sy + T * 0.27}
                  x2={T + 9}
                  y2={sy + T * 0.27}
                  stroke="#777"
                  strokeWidth={0.7}
                  strokeLinecap="round"
                />
                <line
                  x1={T + 3}
                  y1={sy + T * 0.42}
                  x2={T + 9}
                  y2={sy + T * 0.42}
                  stroke="#777"
                  strokeWidth={0.7}
                  strokeLinecap="round"
                />
              </g>
              {/* Position label during drag */}
              {dragIdx === i && (
                <g pointerEvents="none">
                  <rect x={W - T - 38} y={sy - 8} width={36} height={10} rx={2} fill="#333" opacity={0.85} />
                  <text x={W - T - 20} y={sy - 1} fontSize={6} fill="#FFD700" textAnchor="middle" fontWeight="bold">
                    {pos}mm
                  </text>
                  {/* Horizontal guide line */}
                  <line
                    x1={0}
                    y1={sy + T * 0.3}
                    x2={W}
                    y2={sy + T * 0.3}
                    stroke="#FFD700"
                    strokeWidth={0.3}
                    strokeDasharray="2,2"
                    opacity={0.5}
                  />
                </g>
              )}
            </g>
          );
        })}
        {/* Drawers at bottom */}
        {config.drawerCount > 0 &&
          Array.from({ length: config.drawerCount }).map((_, i) => {
            const drawerH = d.internalHeight * 0.15; // ~15% of internal height per drawer
            const gap = 2;
            const dy = H - T - (i + 1) * (drawerH + gap) + gap;
            return (
              <g key={`drawer-${i}`}>
                <rect
                  x={T + 2}
                  y={dy}
                  width={W - 2 * T - 4}
                  height={drawerH}
                  fill="#b8956a"
                  stroke="#8B7355"
                  strokeWidth={0.8}
                  rx={1}
                >
                  <title>{`Drawer ${i + 1}`}</title>
                </rect>
                {/* Handle */}
                <rect
                  x={W / 2 - 12}
                  y={dy + drawerH / 2 - 1.5}
                  width={24}
                  height={3}
                  rx={1.5}
                  fill="#c8a84e"
                  stroke="#a07820"
                  strokeWidth={0.5}
                />
              </g>
            );
          })}
        {showDims && (
          <>
            <DimLine x1={0} y1={-8} x2={W} y2={-8} label={fd(config.width)} pos="above" />
            <DimLine x1={T} y1={-20} x2={W - T} y2={-20} label={fd(d.internalWidth)} pos="above" />
            <DimLine x1={W + 8} y1={0} x2={W + 8} y2={H} label={fd(config.height)} pos="right" />
          </>
        )}
        {/* Bay-height annotations: cleared space in each shelf compartment */}
        {showDims &&
          shelfPositions.length > 0 &&
          (() => {
            const sorted = [...shelfPositions].sort((a, b) => a - b);
            const edges = [0, ...sorted, d.internalHeight];
            return edges.slice(0, -1).map((lo, i) => {
              const gap = edges[i + 1] - lo;
              return (
                <text
                  key={`bay-${i}`}
                  x={T + (W - 2 * T) * 0.06}
                  y={H - T - (lo + gap / 2) * S}
                  textAnchor="start"
                  dominantBaseline="middle"
                  fontSize={6}
                  fill="currentColor"
                  opacity={0.6}
                  pointerEvents="none"
                >
                  {fd(gap)}
                </text>
              );
            });
          })()}
      </g>
    </ViewBox>
  );
}
