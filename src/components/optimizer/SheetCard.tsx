/** Sprint A3 (Phase 16.5) — extracted from OptimizerView.tsx */
import { getMaterial } from '../../engine/materials';
import { downloadDxfForSheet } from '../../utils/dxf-export';
import { useToastStore } from '../../store/toast-store';
import { IconDxf, IconGcode, IconGrainVertical } from '../layout/Icons';
import type { CutSheet, CutRect, Lang, DefectZone } from '../../engine/types';
import { YieldBar } from './OptimizerStats';

/** Scale factor: mm → SVG px */
const S = 0.12;

/** Deuteranopia-safe palette (Wong 2011) — distinguishable without red/green */
const CB_PALETTE = ['#0072B2', '#E69F00', '#56B4E9', '#009E73', '#F0E442', '#CC79A7', '#D55E00', '#999999'];

function cbColor(index: number) {
  return CB_PALETTE[index % CB_PALETTE.length];
}

/** Interactive part rect with hover highlight + tooltip + edge banding indicators */
function PartRect({
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
        opacity={isFaded ? 0.25 : 0.88}
        rx={1}
        filter={shadowFilterId ? `url(#${shadowFilterId})` : undefined}
        className="transition-all duration-150"
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

export function SheetCard({
  sheet,
  lang,
  hoveredPartId,
  onHoverPart,
  colorBlindMode,
  showPartNames,
  showGrainHatch,
  defectZones = [],
  filePrefix,
  partFilter,
  onGcodePreview,
  rotationLockedPartIds,
  onToggleRotationLock,
  t,
}: {
  sheet: CutSheet;
  lang: Lang;
  hoveredPartId: string | null;
  onHoverPart: (id: string | null) => void;
  colorBlindMode: boolean;
  showPartNames: boolean;
  showGrainHatch: boolean;
  /** Phase 12 / Sprint 13 — defect zones to render as red blocked areas on this sheet. */
  defectZones?: DefectZone[];
  filePrefix: string;
  partFilter: string;
  onGcodePreview: (filename: string, sheet: CutSheet) => void;
  rotationLockedPartIds: Record<string, boolean>;
  onToggleRotationLock: (partId: string) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const mat = getMaterial(sheet.material);
  const sw = sheet.sheetWidth * S;
  const sl = sheet.sheetLength * S;
  /** Sprint 46: lower-cased filter term for matching part IDs and labels */
  const filterTerm = partFilter.trim().toLowerCase();

  return (
    <div className="border-wood-200 dark:border-wood-700 rounded border p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-wood-600 dark:text-wood-300 min-w-0 flex-1 truncate text-sm font-medium">
          {t('optimizer.sheet')} #{sheet.sheetIndex + 1} — {mat.name[lang]} ({sheet.thickness} mm)
          {/* Sprint 77 — part count badge */}
          <span
            className="text-wood-100 dark:text-wood-800 bg-wood-500 dark:bg-wood-400 ms-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
            aria-label={`${sheet.parts.length} parts`}
          >
            {sheet.parts.length}
          </span>
          {/* Sprint 81 — per-sheet waste area label */}
          <span className="text-wood-400 dark:text-wood-500 ms-1.5 text-[10px] font-normal">
            · {t('optimizer.sheetWaste')}:{' '}
            {(
              (sheet.sheetWidth * sheet.sheetLength - sheet.parts.reduce((s, p) => s + p.width * p.length, 0)) /
              1_000_000
            ).toFixed(3)}{' '}
            m²
          </span>
          {mat.hasGrain && (
            <span
              className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-amber-100 px-1 text-[10px] font-normal text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
              title="Grain direction preserved — parts were not rotated 90°"
            >
              <IconGrainVertical size={10} className="inline" /> grain
            </span>
          )}
          {/* Sprint 42 — grain conflict badge on sheet header */}
          {(() => {
            const conflictCount = sheet.parts.filter((p) => p.grainConflict).length;
            return conflictCount > 0 ? (
              <span
                className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-red-100 px-1 text-[10px] font-normal text-red-700 dark:bg-red-900/30 dark:text-red-300"
                title={`${conflictCount} part(s) had grain direction compromised to fit the sheet`}
              >
                ⚠ {conflictCount} grain {conflictCount === 1 ? 'conflict' : 'conflicts'}
              </span>
            ) : null;
          })()}
        </h3>
        <YieldBar yieldPercent={sheet.yieldPercent} />
        {mat.pricePerSheet != null && (
          <span
            className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] whitespace-nowrap text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
            title={t('optimizer.sheetWasteCostTitle')}
          >
            {t('optimizer.sheetWasteCost', {
              cost: (mat.pricePerSheet * (1 - sheet.yieldPercent / 100)).toFixed(2),
            })}
          </span>
        )}
        <button
          onClick={() => {
            void downloadDxfForSheet(sheet, `${filePrefix}-sheet-${sheet.sheetIndex + 1}.dxf`);
            useToastStore.getState().addToast(t('toast.dxfExported'), 'success');
          }}
          className="border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-100 dark:hover:bg-wood-800 flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] transition-colors"
          title={`Download DXF for sheet ${sheet.sheetIndex + 1}`}
        >
          <IconDxf size={11} /> DXF
        </button>
        <button
          onClick={() => {
            const filename = `${filePrefix}-sheet-${sheet.sheetIndex + 1}.nc`;
            onGcodePreview(filename, sheet);
          }}
          className="border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-100 dark:hover:bg-wood-800 flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] transition-colors"
          title={`Preview G-code for sheet ${sheet.sheetIndex + 1}`}
          aria-label={`Preview G-code for sheet ${sheet.sheetIndex + 1}`}
        >
          <IconGcode size={11} /> G-code
        </button>
      </div>
      <svg
        viewBox={`-18 -18 ${sw + 36} ${sl + 36}`}
        className="border-wood-100 dark:border-wood-800 dark:bg-wood-800 w-full max-w-lg rounded border bg-white"
        style={{ maxHeight: 380 }}
        role="img"
        aria-label={`Cut sheet ${sheet.sheetIndex + 1}`}
      >
        {/* ── Defs ── */}
        <defs>
          <pattern
            id={`waste-${sheet.sheetIndex}`}
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="6" stroke="#C8B89A" strokeWidth="0.6" />
          </pattern>
          {/* Phase 12 / Sprint 11 — grain direction hatch patterns (green = aligned, amber = conflict) */}
          <pattern
            id={`grain-${sheet.sheetIndex}-v-ok`}
            data-testid={`grain-pattern-${sheet.sheetIndex}-v-ok`}
            width="4"
            height="4"
            patternUnits="userSpaceOnUse"
          >
            <line x1="2" y1="0" x2="2" y2="4" stroke="#16a34a" strokeWidth="0.9" />
          </pattern>
          <pattern
            id={`grain-${sheet.sheetIndex}-h-ok`}
            data-testid={`grain-pattern-${sheet.sheetIndex}-h-ok`}
            width="4"
            height="4"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="2" x2="4" y2="2" stroke="#16a34a" strokeWidth="0.9" />
          </pattern>
          <pattern
            id={`grain-${sheet.sheetIndex}-v-conflict`}
            data-testid={`grain-pattern-${sheet.sheetIndex}-v-conflict`}
            width="4"
            height="4"
            patternUnits="userSpaceOnUse"
          >
            <line x1="2" y1="0" x2="2" y2="4" stroke="#d97706" strokeWidth="0.9" />
          </pattern>
          <pattern
            id={`grain-${sheet.sheetIndex}-h-conflict`}
            data-testid={`grain-pattern-${sheet.sheetIndex}-h-conflict`}
            width="4"
            height="4"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="2" x2="4" y2="2" stroke="#d97706" strokeWidth="0.9" />
          </pattern>
          {/* Phase 12 / Sprint 13 — defect zone cross-hatch pattern (red diagonal) */}
          <pattern
            id={`defect-${sheet.sheetIndex}`}
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="6" stroke="#dc2626" strokeWidth="1.2" />
            <line x1="3" y1="0" x2="3" y2="6" stroke="#dc2626" strokeWidth="0.5" />
          </pattern>
          {/* Drop shadow filter for part rects */}
          <filter id={`shadow-${sheet.sheetIndex}`} x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0.5" dy="0.5" stdDeviation="0.8" floodColor="#0003" />
          </filter>
        </defs>

        {/* Sheet background (waste = visible background) */}
        <rect x={0} y={0} width={sw} height={sl} fill="#EDE4D2" stroke="#999" strokeWidth={1} rx={1} />
        <rect x={0} y={0} width={sw} height={sl} fill={`url(#waste-${sheet.sheetIndex})`} />

        {/* ── Ruler ticks — top edge (every 100 mm) ── */}
        {Array.from({ length: Math.floor(sheet.sheetWidth / 100) + 1 }).map((_, ti) => {
          const tx = ti * 100 * S;
          const isMajor = ti % 5 === 0;
          return (
            <g key={`tx-${ti}`}>
              <line x1={tx} y1={-2} x2={tx} y2={isMajor ? -8 : -5} stroke="#888" strokeWidth={0.5} />
              {isMajor && (
                <text x={tx} y={-10} textAnchor="middle" fontSize={4} fill="#888">
                  {ti * 100}
                </text>
              )}
            </g>
          );
        })}
        {/* ── Ruler ticks — left edge (every 100 mm) ── */}
        {Array.from({ length: Math.floor(sheet.sheetLength / 100) + 1 }).map((_, ti) => {
          const ty = ti * 100 * S;
          const isMajor = ti % 5 === 0;
          return (
            <g key={`ty-${ti}`}>
              <line x1={-2} y1={ty} x2={isMajor ? -8 : -5} y2={ty} stroke="#888" strokeWidth={0.5} />
              {isMajor && (
                <text x={-10} y={ty + 1.5} textAnchor="end" fontSize={4} fill="#888">
                  {ti * 100}
                </text>
              )}
            </g>
          );
        })}
        {/* Sheet dimension labels */}
        <text x={sw / 2} y={-12} textAnchor="middle" fontSize={5} fill="#666" fontWeight="500">
          {sheet.sheetWidth} mm
        </text>
        <text
          x={-14}
          y={sl / 2}
          textAnchor="middle"
          fontSize={5}
          fill="#666"
          fontWeight="500"
          transform={`rotate(-90, -14, ${sl / 2})`}
        >
          {sheet.sheetLength} mm
        </text>

        {/* Placed parts */}
        {sheet.parts.map((p, i) => (
          <PartRect
            key={i}
            part={p}
            scale={S}
            color={colorBlindMode ? cbColor(i) : mat.color}
            isHovered={
              hoveredPartId === p.partId ||
              (filterTerm !== '' &&
                (p.partId.toLowerCase().includes(filterTerm) || p.label.toLowerCase().includes(filterTerm)))
            }
            isFaded={
              (hoveredPartId !== null && hoveredPartId !== p.partId) ||
              (filterTerm !== '' &&
                !p.partId.toLowerCase().includes(filterTerm) &&
                !p.label.toLowerCase().includes(filterTerm))
            }
            onHover={onHoverPart}
            showLabel={showPartNames}
            shadowFilterId={`shadow-${sheet.sheetIndex}`}
            showGrain={mat.hasGrain}
            showGrainHatch={showGrainHatch}
            grainHatchPatternIdBase={`grain-${sheet.sheetIndex}`}
          />
        ))}

        {/* Phase 12 / Sprint 13 — defect zones rendered as red cross-hatched overlays */}
        {defectZones.map((dz, di) => (
          <g key={`dz-${di}`}>
            <rect
              x={dz.x * S}
              y={dz.y * S}
              width={dz.width * S}
              height={dz.length * S}
              fill={`url(#defect-${sheet.sheetIndex})`}
              opacity={0.75}
            />
            <rect
              x={dz.x * S}
              y={dz.y * S}
              width={dz.width * S}
              height={dz.length * S}
              fill="none"
              stroke="#dc2626"
              strokeWidth={0.8}
              strokeDasharray="2 1"
            />
          </g>
        ))}

        {/* ── Scale bar (Sprint 159): 100 mm reference at bottom-right ── */}
        {/* 100 mm × S = 12 SVG units */}
        <g transform={`translate(${sw - 14}, ${sl + 6})`}>
          <line x1={0} y1={0} x2={12} y2={0} stroke="#888" strokeWidth={1} />
          <line x1={0} y1={-2} x2={0} y2={2} stroke="#888" strokeWidth={0.8} />
          <line x1={12} y1={-2} x2={12} y2={2} stroke="#888" strokeWidth={0.8} />
          <text x={6} y={-3} textAnchor="middle" fontSize={3.5} fill="#888">
            100 mm
          </text>
        </g>
      </svg>

      {/* Part legend below the sheet */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5">
        {sheet.parts.map((p, i) => {
          const isLocked = rotationLockedPartIds[p.partId] === true;
          return (
            <span
              key={i}
              className={`cursor-default text-[10px] transition-opacity ${
                (hoveredPartId && hoveredPartId !== p.partId) ||
                (filterTerm &&
                  !p.partId.toLowerCase().includes(filterTerm) &&
                  !p.label.toLowerCase().includes(filterTerm))
                  ? 'opacity-30'
                  : ''
              } ${hoveredPartId === p.partId || (filterTerm && (p.partId.toLowerCase().includes(filterTerm) || p.label.toLowerCase().includes(filterTerm))) ? 'text-wood-700 dark:text-wood-100 font-bold' : 'text-wood-600 dark:text-wood-300'}`}
              onMouseEnter={() => onHoverPart(p.partId)}
              onMouseLeave={() => onHoverPart(null)}
              title={
                p.rationale
                  ? `${p.partId}: ${p.label}\n${p.rationale}${p.grainConflict ? '\n⚠ Grain direction compromised' : ''}${isLocked ? '\n🔒 Rotation locked' : ''}`
                  : undefined
              }
            >
              {p.partId}: {p.label} ({p.width}×{p.length}){p.grainConflict ? ' ⚠' : ''}
              {/* Sprint 16 — rotation lock toggle button */}
              <button
                type="button"
                onClick={() => onToggleRotationLock(p.partId)}
                className="hover:text-wood-900 dark:hover:text-wood-50 focus:ring-wood-500 ms-1 inline-flex items-center rounded text-[10px] focus:ring-1 focus:outline-none"
                aria-label={isLocked ? t('optimizer.unlockRotation') : t('optimizer.lockRotation')}
                title={isLocked ? t('optimizer.unlockRotation') : t('optimizer.lockRotation')}
                aria-pressed={isLocked}
              >
                {isLocked ? '🔒' : '🔓'}
              </button>
            </span>
          );
        })}
      </div>

      {/* Sprint 131 — Grain direction legend: only shown for grain-locked materials */}
      {mat.hasGrain && (
        <p className="mt-1.5 flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-300">
          <IconGrainVertical size={12} className="inline" />
          {t('optimizer.grainLegend')}
        </p>
      )}
    </div>
  );
}
