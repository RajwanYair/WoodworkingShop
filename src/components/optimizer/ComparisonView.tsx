import { useTranslation } from 'react-i18next';
import type { CabinetConfig, OptimizationResult, OptimizationSuggestion, Lang } from '../../engine/types';

export function ComparisonView({ suggestion }: { suggestion: OptimizationSuggestion }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;

  return (
    <div className="border border-wood-200 dark:border-wood-700 rounded-lg p-4 space-y-3 bg-wood-50/50 dark:bg-wood-800/30">
      <h4 className="text-xs font-semibold text-wood-700 dark:text-wood-200 uppercase tracking-wide">
        {t('optimizer.comparison')}
      </h4>
      <p className="text-xs text-wood-500 dark:text-wood-400">
        {suggestion.explanation[lang]}
      </p>

      <div className="grid grid-cols-2 gap-4">
        <ConfigCard
          title={t('optimizer.original')}
          config={suggestion.originalConfig}
          result={suggestion.originalResult}
          t={t}
          accent="red"
        />
        <ConfigCard
          title={t('optimizer.optimized')}
          config={suggestion.optimizedConfig}
          result={suggestion.optimizedResult}
          t={t}
          accent="green"
        />
      </div>

      {/* Changes summary */}
      <div className="border-t border-wood-200 dark:border-wood-700 pt-3">
        <h5 className="text-xs font-medium text-wood-600 dark:text-wood-300 mb-2">
          {t('optimizer.changes')}
        </h5>
        <div className="flex flex-wrap gap-3 text-xs">
          {renderDiff('W', suggestion.originalConfig.width, suggestion.optimizedConfig.width, 'mm')}
          {renderDiff('H', suggestion.originalConfig.height, suggestion.optimizedConfig.height, 'mm')}
          {renderDiff('D', suggestion.originalConfig.depth, suggestion.optimizedConfig.depth, 'mm')}
          {suggestion.originalConfig.carcassMaterial !== suggestion.optimizedConfig.carcassMaterial && (
            <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded">
              Material changed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfigCard({
  title, config, result, t, accent,
}: {
  title: string; config: CabinetConfig; result: OptimizationResult;
  t: (k: string) => string; accent: 'red' | 'green';
}) {
  const ringColor = accent === 'red' ? 'ring-red-300 dark:ring-red-700' : 'ring-green-300 dark:ring-green-700';

  return (
    <div className={`ring-2 ${ringColor} rounded p-3 bg-white dark:bg-wood-800 space-y-2`}>
      <div className={`text-xs font-bold ${accent === 'red' ? 'text-red-600' : 'text-green-600'}`}>
        {title}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-wood-500">{t('config.width')}</span>
        <span className="font-medium">{config.width} mm</span>
        <span className="text-wood-500">{t('config.height')}</span>
        <span className="font-medium">{config.height} mm</span>
        <span className="text-wood-500">{t('config.depth')}</span>
        <span className="font-medium">{config.depth} mm</span>
      </div>
      <div className="border-t border-wood-100 dark:border-wood-700 pt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-wood-500">{t('optimizer.sheets')}</span>
        <span className="font-medium">{result.totalSheets}</span>
        <span className="text-wood-500">{t('optimizer.yield')}</span>
        <span className="font-medium">{result.overallYield}%</span>
        <span className="text-wood-500">{t('optimizer.waste')}</span>
        <span className="font-medium">{(result.totalWaste / 1_000_000).toFixed(2)} m²</span>
      </div>
    </div>
  );
}

function renderDiff(label: string, oldVal: number, newVal: number, unit: string) {
  if (oldVal === newVal) return null;
  const diff = newVal - oldVal;
  const color = diff < 0 ? 'text-green-600' : 'text-orange-600';
  return (
    <span className={`${color} font-medium`}>
      {label}: {oldVal}→{newVal} {unit} ({diff > 0 ? '+' : ''}{diff})
    </span>
  );
}
