import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { useToastStore } from '../../store/toast-store';
import { getMaterial } from '../../engine/materials';
import { downloadDxfForSheet, downloadAllSheetsDxf } from '../../utils/dxf-export';
import type { Lang, CutSheet, CutRect } from '../../engine/types';

/** Scale factor: mm → SVG px */
const S = 0.12;

/** Deuteranopia-safe palette (Wong 2011) — distinguishable without red/green */
const CB_PALETTE = ['#0072B2', '#E69F00', '#56B4E9', '#009E73', '#F0E442', '#CC79A7', '#D55E00', '#999999'];

function cbColor(index: number) {
  return CB_PALETTE[index % CB_PALETTE.length];
}

export function OptimizerView() {
  const { t, i18n } = useTranslation();
  const { optimization, combinedOptimization, cabinets, colorBlindMode, toggleColorBlindMode } = useCabinetStore();
  const lang = i18n.language as Lang;
  const [hoveredPartId, setHoveredPartId] = useState<string | null>(null);
  const multiCabinet = cabinets.length > 1;
  const displayOpt = multiCabinet ? combinedOptimization : optimization;

  return (
    <div className="space-y-6">
      {/* Summary stats + color-blind toggle */}
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-3 gap-4 flex-1">
          <Stat label={t('optimizer.sheets')} value={String(displayOpt.totalSheets)} />
          <Stat label={t('optimizer.yield')} value={`${displayOpt.overallYield}%`} />
          <Stat label={t('optimizer.waste')} value={`${(displayOpt.totalWaste / 1_000_000).toFixed(2)} m²`} />
        </div>
        <div className="ms-4 flex gap-2">
          <button
            onClick={() => { downloadAllSheetsDxf(displayOpt.sheets, 'cabinet'); useToastStore.getState().addToast(t('toast.dxfExported'), 'success'); }}
            className="px-3 py-1.5 rounded text-xs font-medium border border-wood-300 dark:border-wood-600 text-wood-500 dark:text-wood-400 hover:bg-wood-100 dark:hover:bg-wood-800 transition-colors"
            title={t('optimizer.exportDxf')}
          >
            📐 DXF
          </button>
          <button
            onClick={toggleColorBlindMode}
            className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
              colorBlindMode
                ? 'bg-blue-100 dark:bg-blue-900 border-blue-400 text-blue-700 dark:text-blue-200'
                : 'border-wood-300 dark:border-wood-600 text-wood-500 dark:text-wood-400 hover:bg-wood-100 dark:hover:bg-wood-800'
            }`}
            title="Toggle color-blind safe palette"
            aria-pressed={colorBlindMode}
          >
            👁 CB
          </button>
        </div>
      </div>

      {/* Multi-cabinet label */}
      {multiCabinet && (
        <p className="text-xs text-wood-500 dark:text-wood-400 italic">
          Combined optimization for {cabinets.length} cabinets
        </p>
      )}

      {/* Individual sheets */}
      {displayOpt.sheets.map((sheet) => (
        <SheetCard
          key={sheet.sheetIndex}
          sheet={sheet}
          lang={lang}
          hoveredPartId={hoveredPartId}
          onHoverPart={setHoveredPartId}
          colorBlindMode={colorBlindMode}
          t={t}
        />
      ))}

      {/* Part legend */}
      {hoveredPartId && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-wood-800 text-white text-xs px-3 py-1.5 rounded shadow-lg z-50 pointer-events-none">
          {hoveredPartId}
        </div>
      )}
    </div>
  );
}

function SheetCard({
  sheet, lang, hoveredPartId, onHoverPart, colorBlindMode, t,
}: {
  sheet: CutSheet; lang: Lang; hoveredPartId: string | null;
  onHoverPart: (id: string | null) => void;
  colorBlindMode: boolean;
  t: (key: string) => string;
}) {
  const mat = getMaterial(sheet.material);
  const sw = sheet.sheetWidth * S;
  const sl = sheet.sheetLength * S;

  return (
    <div className="border border-wood-200 dark:border-wood-700 rounded p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-wood-600 dark:text-wood-300">
          {t('optimizer.sheet')} #{sheet.sheetIndex + 1} — {mat.name[lang]} ({sheet.thickness} mm) — {sheet.yieldPercent}%
        </h3>
        <button
          onClick={() => { downloadDxfForSheet(sheet, `sheet-${sheet.sheetIndex + 1}.dxf`); useToastStore.getState().addToast(t('toast.dxfExported'), 'success'); }}
          className="text-[10px] px-2 py-0.5 rounded border border-wood-300 dark:border-wood-600 text-wood-500 dark:text-wood-400 hover:bg-wood-100 dark:hover:bg-wood-800 transition-colors"
          title={`Download DXF for sheet ${sheet.sheetIndex + 1}`}
        >
          📐 DXF
        </button>
      </div>
      <svg
        viewBox={`-5 -5 ${sw + 10} ${sl + 10}`}
        className="w-full max-w-lg border border-wood-100 dark:border-wood-800 rounded bg-white dark:bg-wood-800"
        style={{ maxHeight: 350 }}
        role="img"
        aria-label={`Cut sheet ${sheet.sheetIndex + 1}`}
      >
        {/* Sheet background (waste = visible background) */}
        <rect x={0} y={0} width={sw} height={sl} fill="#E8DFCF" stroke="#aaa" strokeWidth={1} />
        {/* Waste hatch pattern */}
        <defs>
          <pattern id={`waste-${sheet.sheetIndex}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#D4C4A0" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect x={0} y={0} width={sw} height={sl} fill={`url(#waste-${sheet.sheetIndex})`} />

        {/* Placed parts */}
        {sheet.parts.map((p, i) => (
          <PartRect
            key={i}
            part={p}
            scale={S}
            color={colorBlindMode ? cbColor(i) : mat.color}
            isHovered={hoveredPartId === p.partId}
            isFaded={hoveredPartId !== null && hoveredPartId !== p.partId}
            onHover={onHoverPart}
          />
        ))}
      </svg>

      {/* Part legend below the sheet */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5">
        {sheet.parts.map((p, i) => (
          <span
            key={i}
            className={`text-[10px] cursor-default transition-opacity ${
              hoveredPartId && hoveredPartId !== p.partId ? 'opacity-30' : ''
            } ${hoveredPartId === p.partId ? 'font-bold text-wood-700 dark:text-wood-100' : 'text-wood-500 dark:text-wood-400'}`}
            onMouseEnter={() => onHoverPart(p.partId)}
            onMouseLeave={() => onHoverPart(null)}
          >
            {p.partId}: {p.label} ({p.width}×{p.length})
          </span>
        ))}
      </div>
    </div>
  );
}

/** Interactive part rect with hover highlight + tooltip + edge banding indicators */
function PartRect({
  part, scale, color, isHovered, isFaded, onHover,
}: {
  part: CutRect; scale: number; color: string;
  isHovered: boolean; isFaded: boolean;
  onHover: (id: string | null) => void;
}) {
  const x = part.x * scale;
  const y = part.y * scale;
  const w = part.width * scale;
  const h = part.length * scale;
  const hasEB = part.edgeBanding && part.edgeBanding !== 'None' && part.edgeBanding !== 'ללא';
  const is4Edge = hasEB && part.edgeBanding!.includes('4');
  const ebColor = '#FF6B35'; // orange indicator for edge banding

  return (
    <g
      onMouseEnter={() => onHover(part.partId)}
      onMouseLeave={() => onHover(null)}
      style={{ cursor: 'pointer' }}
    >
      <rect
        x={x} y={y} width={w} height={h}
        fill={isHovered ? '#FFD700' : color}
        stroke={isHovered ? '#B8860B' : '#555'}
        strokeWidth={isHovered ? 1.5 : 0.5}
        opacity={isFaded ? 0.3 : 0.85}
        className="transition-all duration-150"
      />
      {/* Edge banding indicators — colored lines on banded edges */}
      {hasEB && (
        <>
          {/* Front edge (bottom of part) */}
          <line x1={x} y1={y + h} x2={x + w} y2={y + h} stroke={ebColor} strokeWidth={2} opacity={isFaded ? 0.2 : 0.9} />
          {is4Edge && (
            <>
              <line x1={x} y1={y} x2={x + w} y2={y} stroke={ebColor} strokeWidth={2} opacity={isFaded ? 0.2 : 0.9} />
              <line x1={x} y1={y} x2={x} y2={y + h} stroke={ebColor} strokeWidth={2} opacity={isFaded ? 0.2 : 0.9} />
              <line x1={x + w} y1={y} x2={x + w} y2={y + h} stroke={ebColor} strokeWidth={2} opacity={isFaded ? 0.2 : 0.9} />
            </>
          )}
        </>
      )}
      {/* Grain direction arrow */}
      {w > 8 && h > 8 && (
        part.grainVertical ? (
          <g opacity={isFaded ? 0.15 : 0.45} pointerEvents="none">
            <line x1={x + w - 3} y1={y + 4} x2={x + w - 3} y2={y + h - 4} stroke="#444" strokeWidth={0.6} />
            <polygon points={`${x + w - 3},${y + 4} ${x + w - 4.5},${y + 7} ${x + w - 1.5},${y + 7}`} fill="#444" />
          </g>
        ) : (
          <g opacity={isFaded ? 0.15 : 0.45} pointerEvents="none">
            <line x1={x + 4} y1={y + h - 3} x2={x + w - 4} y2={y + h - 3} stroke="#444" strokeWidth={0.6} />
            <polygon points={`${x + w - 4},${y + h - 3} ${x + w - 7},${y + h - 4.5} ${x + w - 7},${y + h - 1.5}`} fill="#444" />
          </g>
        )
      )}
      <text
        x={x + w / 2}
        y={y + h / 2 - 2}
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
        y={y + h / 2 + 5}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={Math.min(5, w * 0.1)}
        fill="#666"
      >
        {part.width}×{part.length}
      </text>
      <title>{`${part.partId}: ${part.label}\n${part.width} × ${part.length} mm\nGrain: ${part.grainVertical ? '↕ vertical' : '↔ horizontal'}${hasEB ? `\nEdge: ${part.edgeBanding}` : ''}`}</title>
    </g>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-wood-50 dark:bg-wood-800 rounded p-3 text-center">
      <div className="text-lg font-bold text-wood-700 dark:text-wood-200">{value}</div>
      <div className="text-xs text-wood-500 dark:text-wood-400">{label}</div>
    </div>
  );
}
