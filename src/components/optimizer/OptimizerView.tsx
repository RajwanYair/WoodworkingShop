import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { useToastStore } from '../../store/toast-store';
import { getMaterial } from '../../engine/materials';
import { generateParts } from '../../engine/parts';
import { generateHardware } from '../../engine/hardware';
import { downloadDxfForSheet, downloadAllSheetsDxf } from '../../utils/dxf-export';
import { downloadGcodeForSheet, downloadAllSheetsGcode } from '../../utils/gcode-export';
import { downloadBomCsv } from '../../utils/bom-export';
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

  // Sprint A3 part 2: hints — surface low-yield sheets and same-thickness
  // material consolidation opportunities so the user knows to consult the
  // Smart Optimizer below.
  const lowYieldSheet = displayOpt.sheets.find((s) => s.yieldPercent > 0 && s.yieldPercent < 25);
  const materialSwapPair = (() => {
    const byThickness = new Map<number, Set<string>>();
    for (const s of displayOpt.sheets) {
      const set = byThickness.get(s.thickness) ?? new Set<string>();
      set.add(s.material);
      byThickness.set(s.thickness, set);
    }
    for (const [thickness, mats] of byThickness) {
      if (mats.size >= 2) {
        const arr = Array.from(mats);
        return { a: arr[0], b: arr[1], t: thickness };
      }
    }
    return null;
  })();

  return (
    <div className="space-y-6">
      {/* Hints (Sprint A3 part 2) */}
      {(lowYieldSheet || materialSwapPair) && (
        <div className="space-y-2">
          {lowYieldSheet && (
            <div className="rounded border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
              ⚠ {t('optimizer.lowYieldWarning', {
                num: lowYieldSheet.sheetIndex + 1,
                yield: lowYieldSheet.yieldPercent,
              })}
            </div>
          )}
          {materialSwapPair && (
            <div className="rounded border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 text-xs text-blue-800 dark:text-blue-200">
              💡 {t('optimizer.materialSwapHint', {
                a: getMaterial(materialSwapPair.a).name[lang],
                b: getMaterial(materialSwapPair.b).name[lang],
                t: materialSwapPair.t,
              })}
            </div>
          )}
        </div>
      )}

      {/* Summary stats + color-blind toggle */}
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-3 gap-4 flex-1">
          <Stat label={t('optimizer.sheets')} value={String(displayOpt.totalSheets)} />
          <Stat label={t('optimizer.yield')} value={`${displayOpt.overallYield}%`} />
          <Stat label={t('optimizer.waste')} value={`${(displayOpt.totalWaste / 1_000_000).toFixed(2)} m²`} />
        </div>
        <div className="ms-4 flex gap-2">
          <button
            onClick={() => {
              downloadAllSheetsDxf(displayOpt.sheets, 'cabinet');
              useToastStore.getState().addToast(t('toast.dxfExported'), 'success');
            }}
            className="px-3 py-1.5 rounded text-xs font-medium border border-wood-300 dark:border-wood-600 text-wood-500 dark:text-wood-400 hover:bg-wood-100 dark:hover:bg-wood-800 transition-colors"
            title={t('optimizer.exportDxf')}
          >
            📐 DXF
          </button>
          <button
            onClick={() => {
              downloadAllSheetsGcode(displayOpt.sheets, 'cabinet');
              useToastStore.getState().addToast(t('toast.gcodeExported'), 'success');
            }}
            className="px-3 py-1.5 rounded text-xs font-medium border border-wood-300 dark:border-wood-600 text-wood-500 dark:text-wood-400 hover:bg-wood-100 dark:hover:bg-wood-800 transition-colors"
            title={t('optimizer.exportGcode')}
            aria-label={t('optimizer.exportGcode')}
          >
            ⚙ G-code
          </button>
          <button
            onClick={() => {
              const bomData = cabinets.map((c) => ({
                name: c.name,
                parts: generateParts(c.config),
                hardware: generateHardware(c.config),
              }));
              downloadBomCsv(bomData, lang);
              useToastStore.getState().addToast(t('toast.bomExported'), 'success');
            }}
            className="px-3 py-1.5 rounded text-xs font-medium border border-wood-300 dark:border-wood-600 text-wood-500 dark:text-wood-400 hover:bg-wood-100 dark:hover:bg-wood-800 transition-colors"
            title={t('optimizer.exportBom')}
            aria-label={t('optimizer.exportBom')}
          >
            📋 BOM
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
  sheet,
  lang,
  hoveredPartId,
  onHoverPart,
  colorBlindMode,
  t,
}: {
  sheet: CutSheet;
  lang: Lang;
  hoveredPartId: string | null;
  onHoverPart: (id: string | null) => void;
  colorBlindMode: boolean;
  t: (key: string) => string;
}) {
  const mat = getMaterial(sheet.material);
  const sw = sheet.sheetWidth * S;
  const sl = sheet.sheetLength * S;

  return (
    <div className="border border-wood-200 dark:border-wood-700 rounded p-4">
      <div className="flex items-center justify-between mb-2 gap-3">
        <h3 className="text-sm font-medium text-wood-600 dark:text-wood-300 flex-1 min-w-0 truncate">
          {t('optimizer.sheet')} #{sheet.sheetIndex + 1} — {mat.name[lang]} ({sheet.thickness} mm)
          {mat.hasGrain && (
            <span
              className="ml-1.5 text-[10px] font-normal text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 px-1 rounded"
              title="Grain direction preserved — parts were not rotated 90°"
            >
              ↕ grain
            </span>
          )}
        </h3>
        <YieldBar yieldPercent={sheet.yieldPercent} />
        {mat.pricePerSheet != null && (
          <span
            className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 px-1.5 py-0.5 rounded whitespace-nowrap"
            title={t('optimizer.sheetWasteCostTitle')}
          >
            {t('optimizer.sheetWasteCost', {
              cost: (mat.pricePerSheet * (1 - sheet.yieldPercent / 100)).toFixed(2),
            })}
          </span>
        )}
        <button
          onClick={() => {
            downloadDxfForSheet(sheet, `sheet-${sheet.sheetIndex + 1}.dxf`);
            useToastStore.getState().addToast(t('toast.dxfExported'), 'success');
          }}
          className="text-[10px] px-2 py-0.5 rounded border border-wood-300 dark:border-wood-600 text-wood-500 dark:text-wood-400 hover:bg-wood-100 dark:hover:bg-wood-800 transition-colors"
          title={`Download DXF for sheet ${sheet.sheetIndex + 1}`}
        >
          📐 DXF
        </button>
        <button
          onClick={() => {
            downloadGcodeForSheet(sheet, `sheet-${sheet.sheetIndex + 1}.nc`);
            useToastStore.getState().addToast(t('toast.gcodeExported'), 'success');
          }}
          className="text-[10px] px-2 py-0.5 rounded border border-wood-300 dark:border-wood-600 text-wood-500 dark:text-wood-400 hover:bg-wood-100 dark:hover:bg-wood-800 transition-colors"
          title={`Download G-code for sheet ${sheet.sheetIndex + 1}`}
          aria-label={`Download G-code for sheet ${sheet.sheetIndex + 1}`}
        >
          ⚙ G-code
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
          <pattern
            id={`waste-${sheet.sheetIndex}`}
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
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
  part,
  scale,
  color,
  isHovered,
  isFaded,
  onHover,
}: {
  part: CutRect;
  scale: number;
  color: string;
  isHovered: boolean;
  isFaded: boolean;
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
    <g onMouseEnter={() => onHover(part.partId)} onMouseLeave={() => onHover(null)} style={{ cursor: 'pointer' }}>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
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
      {/* Grain direction arrow */}
      {w > 8 &&
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

function YieldBar({ yieldPercent }: { yieldPercent: number }) {
  // Color: <33 red, <66 amber, else green.
  const color =
    yieldPercent < 33
      ? 'bg-red-500'
      : yieldPercent < 66
        ? 'bg-amber-500'
        : 'bg-green-500';
  const label = `${yieldPercent}%`;
  return (
    <div
      className="flex items-center gap-2 shrink-0"
      title={`Sheet utilization ${label}`}
      role="meter"
      aria-valuenow={yieldPercent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Yield ${label}`}
    >
      <div className="w-24 h-2 bg-wood-200 dark:bg-wood-700 rounded overflow-hidden">
        <div className={`${color} h-full transition-all`} style={{ width: `${Math.min(100, yieldPercent)}%` }} />
      </div>
      <span className="text-xs font-mono w-10 text-right text-wood-600 dark:text-wood-300">{label}</span>
    </div>
  );
}
