import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { getMaterial } from '../../engine/materials';
import type { Lang } from '../../engine/types';

/** Scale factor: mm → SVG px */
const S = 0.12;

export function OptimizerView() {
  const { t, i18n } = useTranslation();
  const { optimization } = useCabinetStore();
  const lang = i18n.language as Lang;

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <Stat label={t('optimizer.sheets')} value={String(optimization.totalSheets)} />
        <Stat label={t('optimizer.yield')} value={`${optimization.overallYield}%`} />
        <Stat
          label={t('optimizer.waste')}
          value={`${(optimization.totalWaste / 1_000_000).toFixed(2)} m²`}
        />
      </div>

      {/* Individual sheets */}
      {optimization.sheets.map((sheet) => {
        const mat = getMaterial(sheet.material);
        const sw = sheet.sheetWidth * S;
        const sl = sheet.sheetLength * S;

        return (
          <div key={sheet.sheetIndex} className="border border-wood-200 dark:border-wood-700 rounded p-4">
            <h3 className="text-sm font-medium text-wood-600 dark:text-wood-300 mb-2">
              {t('optimizer.sheet')} #{sheet.sheetIndex + 1} — {mat.name[lang]} ({sheet.thickness} mm) — {sheet.yieldPercent}%
            </h3>
            <svg
              viewBox={`-5 -5 ${sw + 10} ${sl + 10}`}
              className="w-full max-w-lg border border-wood-100 dark:border-wood-800 rounded bg-white dark:bg-wood-800"
              style={{ maxHeight: 350 }}
            >
              {/* Sheet outline */}
              <rect x={0} y={0} width={sw} height={sl} fill="#f5f0e8" stroke="#aaa" strokeWidth={1} />
              {/* Parts */}
              {sheet.parts.map((p, i) => (
                <g key={i}>
                  <rect
                    x={p.x * S}
                    y={p.y * S}
                    width={p.width * S}
                    height={p.length * S}
                    fill={mat.color}
                    stroke="#555"
                    strokeWidth={0.5}
                    opacity={0.8}
                  />
                  <text
                    x={p.x * S + (p.width * S) / 2}
                    y={p.y * S + (p.length * S) / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={Math.min(8, p.width * S * 0.15)}
                    fill="#333"
                  >
                    {p.partId}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        );
      })}
    </div>
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
