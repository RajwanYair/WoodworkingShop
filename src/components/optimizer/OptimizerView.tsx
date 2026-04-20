import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { getMaterial } from '../../engine/materials';
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
  const { optimization, colorBlindMode, toggleColorBlindMode } = useCabinetStore();
  const lang = i18n.language as Lang;
  const [hoveredPartId, setHoveredPartId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Summary stats + color-blind toggle */}
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-3 gap-4 flex-1">
          <Stat label={t('optimizer.sheets')} value={String(optimization.totalSheets)} />
          <Stat label={t('optimizer.yield')} value={`${optimization.overallYield}%`} />
          <Stat label={t('optimizer.waste')} value={`${(optimization.totalWaste / 1_000_000).toFixed(2)} m²`} />
        </div>
        <button
          onClick={toggleColorBlindMode}
          className={`ms-4 px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
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

      {/* Individual sheets */}
      {optimization.sheets.map((sheet) => (
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
      <h3 className="text-sm font-medium text-wood-600 dark:text-wood-300 mb-2">
        {t('optimizer.sheet')} #{sheet.sheetIndex + 1} — {mat.name[lang]} ({sheet.thickness} mm) — {sheet.yieldPercent}%
      </h3>
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

/** Interactive part rect with hover highlight + tooltip */
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
      <title>{`${part.partId}: ${part.label}\n${part.width} × ${part.length} mm`}</title>
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
