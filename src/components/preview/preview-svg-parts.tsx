import { useState } from 'react';
import type { CabinetConfig } from '../../engine/types';

export interface TooltipHandlers {
  onHover: (e: React.MouseEvent, label: string, dim: string, material?: string) => void;
  onLeave: () => void;
  onMove: (e: React.MouseEvent) => void;
}

export function ViewBox({
  w,
  h,
  children,
  svgRef,
  onPointerMove,
  onPointerUp,
}: {
  w: number;
  h: number;
  children: React.ReactNode;
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
      className="border-wood-200 dark:border-wood-700 dark:bg-wood-800 text-wood-600 dark:text-wood-200 max-h-125 w-full max-w-lg touch-none rounded border bg-white"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <defs>
        <filter id="part-shadow" x="-8%" y="-8%" width="116%" height="116%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="#000" floodOpacity="0.18" />
        </filter>
        <filter id="part-hover-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#FFD700" floodOpacity="0.5" />
        </filter>
        <pattern id="svg-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.25" opacity="0.12" />
        </pattern>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#svg-grid)" pointerEvents="none" />
      {children}
      <ScaleBar viewW={w} viewH={h} />
    </svg>
  );
}

/**
 * Sprint 108 — Scale bar overlay. 1 SVG px = 1/S = 5 mm at S=0.2.
 * Picks a "nice" length (100/200/500/1000 mm) that fits in ~20% of the
 * view width, draws a labelled bracket in the bottom-left.
 */
function ScaleBar({ viewW, viewH }: { viewW: number; viewH: number }) {
  const mmPerPx = 1 / 0.2; // matches the S constant in preview-constants.ts
  const targetPx = viewW * 0.2;
  const targetMm = targetPx * mmPerPx;
  // Snap to a friendly value.
  const ladder = [50, 100, 200, 500, 1000, 2000];
  const niceMm = ladder.reduce((best, v) => (Math.abs(v - targetMm) < Math.abs(best - targetMm) ? v : best), ladder[0]);
  const barPx = niceMm / mmPerPx;
  const padX = 8;
  const padY = 8;
  const y = viewH - padY;
  const scaleLabel = niceMm >= 1000 ? `${niceMm / 1000} m` : `${niceMm} mm`;
  return (
    <g aria-hidden="true" pointerEvents="none">
      <rect
        x={padX - 4}
        y={y - 13}
        width={barPx + 8}
        height={17}
        rx={3}
        fill="white"
        fillOpacity={0.65}
        stroke="none"
      />
      <g fill="currentColor" stroke="currentColor">
        <line x1={padX} y1={y} x2={padX + barPx} y2={y} strokeWidth={1.4} />
        <line x1={padX} y1={y - 4} x2={padX} y2={y + 1} strokeWidth={1.4} />
        <line x1={padX + barPx} y1={y - 4} x2={padX + barPx} y2={y + 1} strokeWidth={1.4} />
        <text x={padX + barPx / 2} y={y - 5} fontSize={7} textAnchor="middle" stroke="none" fontWeight="600">
          {scaleLabel}
        </text>
      </g>
    </g>
  );
}

/** Interactive part rectangle with hover tooltip */
export function PartRect({
  x,
  y,
  w,
  h,
  fill,
  label,
  dim,
  dashed,
  material,
  onHover,
  onLeave,
  onMove,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  label: string;
  dim: string;
  dashed?: boolean;
  material?: string;
  onHover?: (e: React.MouseEvent, label: string, dim: string, material?: string) => void;
  onLeave?: () => void;
  onMove?: (e: React.MouseEvent) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      fill={fill}
      stroke={hovered ? '#FFD700' : '#555'}
      strokeWidth={hovered ? 1.8 : 0.5}
      strokeDasharray={dashed ? '3,2' : undefined}
      opacity={hovered ? 1 : 0.88}
      filter={hovered ? 'url(#part-hover-glow)' : 'url(#part-shadow)'}
      className="cursor-pointer [transition:stroke_0.12s,stroke-width_0.12s,opacity_0.12s,filter_0.12s]"
      onMouseEnter={(e) => {
        setHovered(true);
        onHover?.(e, label, dim, material);
      }}
      onMouseMove={onMove}
      onMouseLeave={() => {
        setHovered(false);
        onLeave?.();
      }}
    >
      <title>{`${label}\n${dim} mm${material ? `\n${material}` : ''}`}</title>
    </rect>
  );
}

/** Dimension annotation line with arrowheads and centred label.
 * Uses `currentColor` so it adapts to the SVG's Tailwind text-colour class. */
export function DimLine({
  x1,
  y1,
  x2,
  y2,
  label,
  pos,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  pos: 'above' | 'right';
}) {
  const AH = 2.5; // arrowhead half-width
  const AL = 5; // arrowhead length
  const tickLen = 4;
  const isHorizontal = pos === 'above';
  const mid = isHorizontal ? { x: (x1 + x2) / 2, y: y1 - 6 } : { x: x1 + 8, y: (y1 + y2) / 2 };

  return (
    <g fill="currentColor" stroke="currentColor" strokeWidth={0.5} strokeLinecap="round">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      {isHorizontal ? (
        <>
          {/* Extension ticks */}
          <line x1={x1} y1={y1 - tickLen} x2={x1} y2={y1 + tickLen} />
          <line x1={x2} y1={y2 - tickLen} x2={x2} y2={y2 + tickLen} />
          {/* Left-pointing arrowhead */}
          <polygon points={`${x1},${y1} ${x1 + AL},${y1 - AH} ${x1 + AL},${y1 + AH}`} stroke="none" />
          {/* Right-pointing arrowhead */}
          <polygon points={`${x2},${y2} ${x2 - AL},${y2 - AH} ${x2 - AL},${y2 + AH}`} stroke="none" />
        </>
      ) : (
        <>
          {/* Extension ticks */}
          <line x1={x1 - tickLen} y1={y1} x2={x1 + tickLen} y2={y1} />
          <line x1={x2 - tickLen} y1={y2} x2={x2 + tickLen} y2={y2} />
          {/* Up-pointing arrowhead */}
          <polygon points={`${x1},${y1} ${x1 - AH},${y1 + AL} ${x1 + AH},${y1 + AL}`} stroke="none" />
          {/* Down-pointing arrowhead */}
          <polygon points={`${x2},${y2} ${x2 - AH},${y2 - AL} ${x2 + AH},${y2 - AL}`} stroke="none" />
        </>
      )}
      <rect
        x={isHorizontal ? mid.x - label.length * 2.6 : mid.x - 4}
        y={isHorizontal ? mid.y - 5 : mid.y - label.length * 2.6}
        width={isHorizontal ? label.length * 5.2 : 8}
        height={isHorizontal ? 10 : label.length * 5.2}
        rx={2}
        fill="white"
        fillOpacity={0.7}
        stroke="none"
      />
      <text
        x={mid.x}
        y={mid.y}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={8}
        fill="currentColor"
        stroke="none"
        className={isHorizontal ? undefined : '[writing-mode:vertical-rl]'}
      >
        {label}
      </text>
    </g>
  );
}

interface DoorsOverlayProps {
  config: Pick<CabinetConfig, 'doorCount' | 'doorReveal' | 'doorStyle' | 'width' | 'height'>;
  d: { doorHeight: number; doorWidth: number };
  scale: number;
  color: string;
  material?: string;
  tp?: TooltipHandlers;
}

export function DoorsOverlay({ config, d, scale, color, material, tp }: DoorsOverlayProps) {
  const r = config.doorReveal * scale;
  const dw = d.doorWidth * scale;
  const dh = d.doorHeight * scale;
  const doors = [];
  const shakerInset = 30 * scale; // 30mm inset for shaker frame

  for (let i = 0; i < config.doorCount; i++) {
    const x = r + i * (dw + r);
    const isGlass = config.doorStyle === 'glass';
    const doorFill = isGlass ? '#b8d8f0' : color;
    const doorLabel = isGlass ? `Glass Door ${i + 1}` : `Door ${i + 1}`;
    doors.push(
      <PartRect
        key={`door-${i}`}
        x={x}
        y={r}
        w={dw}
        h={dh}
        fill={doorFill}
        label={doorLabel}
        dim={`${Math.round(d.doorWidth)}×${Math.round(d.doorHeight)}`}
        material={isGlass ? 'Tempered Glass 4mm' : material}
        {...(tp ?? {})}
      />,
    );
    if (isGlass) {
      // Glass shine — two highlight lines for depth
      doors.push(
        <g key={`glass-shine-${i}`}>
          <line
            x1={x + dw * 0.2}
            y1={r + dh * 0.08}
            x2={x + dw * 0.32}
            y2={r + dh * 0.85}
            stroke="#ffffff90"
            strokeWidth={2}
            strokeLinecap="round"
          />
          <line
            x1={x + dw * 0.38}
            y1={r + dh * 0.08}
            x2={x + dw * 0.44}
            y2={r + dh * 0.45}
            stroke="#ffffff50"
            strokeWidth={1}
            strokeLinecap="round"
          />
        </g>,
      );
    }
    if (config.doorStyle === 'shaker' && dw > shakerInset * 2.5 && dh > shakerInset * 2.5) {
      doors.push(
        <rect
          key={`shaker-${i}`}
          x={x + shakerInset}
          y={r + shakerInset}
          width={dw - shakerInset * 2}
          height={dh - shakerInset * 2}
          fill="none"
          stroke="#00000030"
          strokeWidth={1.5}
          rx={1}
        />,
      );
    }
    // Door handle on the inner edge of each door
    {
      const isLastDoor = i === config.doorCount - 1;
      const handleX = isLastDoor && config.doorCount > 1 ? x + 2 : x + dw - 5;
      const handleColor = isGlass ? '#aaa' : '#c8a84e';
      const handleStroke = isGlass ? '#888' : '#a07820';
      doors.push(
        <rect
          key={`handle-${i}`}
          x={handleX}
          y={r + dh * 0.43}
          width={3}
          height={dh * 0.14}
          rx={1.5}
          fill={handleColor}
          stroke={handleStroke}
          strokeWidth={0.5}
          pointerEvents="none"
        />,
      );
    }
  }
  return <>{doors}</>;
}
