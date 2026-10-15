import type { CutRect } from '../../engine/core/types';

/** Interactive part rect with hover highlight + tooltip + edge banding indicators */
export function PartRect({
  part,
  scale,
  color,
  isHovered,
  isFaded,
  onHover,
  showLabel,
  shadowFilterId,
  showGrain,
  showGrainHatch = false,
  grainHatchPatternIdBase,
  isHiddenByAnim = false,
}: {
  part: CutRect;
  scale: number;
  color: string;
  isHovered: boolean;
  isFaded: boolean;
  onHover: (id: string | null) => void;
  showLabel: boolean;
  shadowFilterId?: string;
  showGrain: boolean;
  showGrainHatch?: boolean;
  grainHatchPatternIdBase?: string;
  /** Sprint 70 — when true, suppress opacity to 0 for step-by-step placement animation. */
  isHiddenByAnim?: boolean;
}) {
  const x = part.x * scale;
  const y = part.y * scale;
  const w = part.width * scale;
  const h = part.length * scale;
  const hasEB = part.edgeBanding && part.edgeBanding !== 'None' && part.edgeBanding !== 'ללא';
  const is4Edge = hasEB && part.edgeBanding!.includes('4');
  const ebColor = '#FF6B35'; // orange indicator for edge banding

  return (
    <g onMouseEnter={() => onHover(part.partId)} onMouseLeave={() => onHover(null)} style={{ cursor: 'pointer' }}>
      <rect
        x={x + 0.3}
        y={y + 0.3}
        width={w - 0.6}
        height={h - 0.6}
        fill={isHovered ? '#FFD700' : color}
        stroke={isHovered ? '#B8860B' : '#555'}
        strokeWidth={isHovered ? 1.5 : 0.6}
        opacity={isFaded ? 0.25 : isHiddenByAnim ? 0 : 0.88}
        rx={1}
        filter={shadowFilterId ? `url(#${shadowFilterId})` : undefined}
        className="transition-all duration-300"
      />
      {/* Phase 12 / Sprint 11 — grain direction hatch overlay */}
      {showGrainHatch && showGrain && grainHatchPatternIdBase != null && (
        <rect
          x={x + 0.5}
          y={y + 0.5}
          width={w - 1}
          height={h - 1}
          fill={`url(#${grainHatchPatternIdBase}-${part.grainVertical ? 'v' : 'h'}-${part.grainConflict === true ? 'conflict' : 'ok'})`}
          opacity={isFaded ? 0.3 : 0.65}
          rx={0.5}
          pointerEvents="none"
          data-testid={`grain-overlay-${part.grainConflict === true ? 'conflict' : 'ok'}`}
        />
      )}
      {/* Edge banding indicators — colored lines on banded edges */}
      {hasEB && (
        <>
          {/* Front edge (bottom of part) */}
          <line
            x1={x}
            y1={y + h}
            x2={x + w}
            y2={y + h}
            stroke={ebColor}
            strokeWidth={2}
            opacity={isFaded ? 0.2 : 0.9}
          />
          {is4Edge && (
            <>
              <line x1={x} y1={y} x2={x + w} y2={y} stroke={ebColor} strokeWidth={2} opacity={isFaded ? 0.2 : 0.9} />
              <line x1={x} y1={y} x2={x} y2={y + h} stroke={ebColor} strokeWidth={2} opacity={isFaded ? 0.2 : 0.9} />
              <line
                x1={x + w}
                y1={y}
                x2={x + w}
                y2={y + h}
                stroke={ebColor}
                strokeWidth={2}
                opacity={isFaded ? 0.2 : 0.9}
              />
            </>
          )}
        </>
      )}
      {/* Grain direction arrow — only for grain-sensitive materials */}
      {showGrain &&
        w > 8 &&
        h > 8 &&
        (part.grainVertical ? (
          <g opacity={isFaded ? 0.15 : 0.45} pointerEvents="none">
            <line x1={x + w - 3} y1={y + 4} x2={x + w - 3} y2={y + h - 4} stroke="#444" strokeWidth={0.6} />
            <polygon points={`${x + w - 3},${y + 4} ${x + w - 4.5},${y + 7} ${x + w - 1.5},${y + 7}`} fill="#444" />
          </g>
        ) : (
          <g opacity={isFaded ? 0.15 : 0.45} pointerEvents="none">
            <line x1={x + 4} y1={y + h - 3} x2={x + w - 4} y2={y + h - 3} stroke="#444" strokeWidth={0.6} />
            <polygon
              points={`${x + w - 4},${y + h - 3} ${x + w - 7},${y + h - 4.5} ${x + w - 7},${y + h - 1.5}`}
              fill="#444"
            />
          </g>
        ))}
      {/* Sprint 42 — grain conflict indicator: red triangle in top-right corner */}
      {part.grainConflict && (
        <polygon
          points={`${x + w},${y} ${x + w - 7},${y} ${x + w},${y + 7}`}
          fill="#EF4444"
          opacity={isFaded ? 0.2 : 0.85}
          pointerEvents="none"
          aria-label="Grain direction compromised"
        />
      )}
      {/* Part label (name) — shown when showLabel is true and rect is tall enough */}
      {showLabel && w > 12 && h > 16 && (
        <text
          x={x + w / 2}
          y={y + h / 2 - 8}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={Math.min(5.5, w * 0.1)}
          fill={isHovered ? '#333' : '#666'}
          opacity={isFaded ? 0.3 : 0.9}
          pointerEvents="none"
        >
          {part.label.length > 13 ? part.label.slice(0, 12) + '…' : part.label}
        </text>
      )}
      <text
        x={x + w / 2}
        y={showLabel && w > 12 && h > 16 ? y + h / 2 + 1 : y + h / 2 - 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={Math.min(7, w * 0.14)}
        fontWeight={isHovered ? 'bold' : 'normal'}
        fill={isHovered ? '#333' : '#444'}
      >
        {part.partId}
      </text>
      <text
        x={x + w / 2}
        y={showLabel && w > 12 && h > 16 ? y + h / 2 + 9 : y + h / 2 + 5}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={Math.min(5, w * 0.1)}
        fill="#666"
      >
        {part.width}×{part.length}
      </text>
      <title>{`${part.partId}: ${part.label}\n${part.width} × ${part.length} mm\nGrain: ${part.grainVertical ? '↕ vertical' : '↔ horizontal'}${hasEB ? `\nEdge: ${part.edgeBanding}` : ''}${part.grainConflict ? '\n⚠ Grain direction compromised — rotated to fit' : ''}${part.rationale ? `\n${part.rationale}` : ''}`}</title>
      {/* Sprint 9 — placement rationale ⓘ marker in top-left corner when rationale is available */}
      {part.rationale && w > 10 && h > 10 && (
        <g pointerEvents="none" opacity={isFaded ? 0.2 : 0.75} aria-hidden="true">
          <circle cx={x + 4} cy={y + 4} r={3} fill="#3b82f6" />
          <text
            x={x + 4}
            y={y + 4}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={3.5}
            fill="white"
            fontWeight="bold"
          >
            i
          </text>
        </g>
      )}
    </g>
  );
}
