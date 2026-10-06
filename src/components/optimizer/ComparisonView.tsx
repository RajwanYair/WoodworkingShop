import { useTranslation } from 'react-i18next';
import { formatNumber } from '../../i18n/format';
import type { CabinetConfig, OptimizationResult, OptimizationSuggestion } from '../../engine/types';
import { resolveEngineLang } from './resolve-engine-lang';

export function ComparisonView({ suggestion }: { suggestion: OptimizationSuggestion }) {
  const { t, i18n } = useTranslation();
  const lang = resolveEngineLang(i18n.language);

  return (
    <div className="border-wood-200 dark:border-wood-700 bg-wood-50/50 dark:bg-wood-800/30 space-y-3 rounded-lg border p-4">
      <h4 className="text-wood-700 dark:text-wood-200 text-xs font-semibold tracking-wide uppercase">
        {t('optimizer.comparison')}
      </h4>
      <p className="text-wood-600 dark:text-wood-300 text-xs">{suggestion.explanation[lang]}</p>

      <div className="grid grid-cols-2 gap-4">
        <ConfigCard
          title={t('optimizer.original')}
          config={suggestion.originalConfig}
          result={suggestion.originalResult}
          t={t}
          locale={i18n.language}
          accent="red"
        />
        <ConfigCard
          title={t('optimizer.optimized')}
          config={suggestion.optimizedConfig}
          result={suggestion.optimizedResult}
          t={t}
          locale={i18n.language}
          accent="green"
        />
      </div>

      {/* Changes summary */}
      <div className="border-wood-200 dark:border-wood-700 border-t pt-3">
        <h5 className="text-wood-600 dark:text-wood-300 mb-2 text-xs font-medium">{t('optimizer.changes')}</h5>
        <div className="flex flex-wrap gap-3 text-xs">
          {renderDiff('W', suggestion.originalConfig.width, suggestion.optimizedConfig.width, 'mm', i18n.language)}
          {renderDiff('H', suggestion.originalConfig.height, suggestion.optimizedConfig.height, 'mm', i18n.language)}
          {renderDiff('D', suggestion.originalConfig.depth, suggestion.optimizedConfig.depth, 'mm', i18n.language)}
          {suggestion.originalConfig.carcassMaterial !== suggestion.optimizedConfig.carcassMaterial && (
            <span className="rounded bg-yellow-100 px-2 py-0.5 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
              Material changed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfigCard({
  title,
  config,
  result,
  t,
  locale,
  accent,
}: {
  title: string;
  config: CabinetConfig;
  result: OptimizationResult;
  t: (k: string) => string;
  locale: string;
  accent: 'red' | 'green';
}) {
  const ringColor = accent === 'red' ? 'ring-red-300 dark:ring-red-700' : 'ring-green-300 dark:ring-green-700';

  return (
    <div className={`ring-2 ${ringColor} dark:bg-wood-800 space-y-2 rounded bg-white p-3`}>
      <div className={`text-xs font-bold ${accent === 'red' ? 'text-red-600' : 'text-green-600'}`}>{title}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-wood-600 dark:text-wood-300">{t('config.width')}</span>
        <span className="font-medium">{formatNumber(config.width, locale)} mm</span>
        <span className="text-wood-600 dark:text-wood-300">{t('config.height')}</span>
        <span className="font-medium">{formatNumber(config.height, locale)} mm</span>
        <span className="text-wood-600 dark:text-wood-300">{t('config.depth')}</span>
        <span className="font-medium">{formatNumber(config.depth, locale)} mm</span>
      </div>
      <div className="border-wood-100 dark:border-wood-700 grid grid-cols-2 gap-x-4 gap-y-1 border-t pt-1 text-xs">
        <span className="text-wood-600 dark:text-wood-300">{t('optimizer.sheets')}</span>
        <span className="font-medium">{formatNumber(result.totalSheets, locale)}</span>
        <span className="text-wood-600 dark:text-wood-300">{t('optimizer.yield')}</span>
        <span className="font-medium">{formatNumber(result.overallYield, locale)}%</span>
        <span className="text-wood-600 dark:text-wood-300">{t('optimizer.waste')}</span>
        <span className="font-medium">
          {formatNumber(result.totalWaste / 1_000_000, locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{' '}
          m²
        </span>
      </div>
    </div>
  );
}

function renderDiff(label: string, oldVal: number, newVal: number, unit: string, locale: string) {
  if (oldVal === newVal) return null;
  const diff = newVal - oldVal;
  const color = diff < 0 ? 'text-green-600' : 'text-orange-600';
  return (
    <span className={`${color} font-medium`}>
      {label}: {formatNumber(oldVal, locale)}→{formatNumber(newVal, locale)} {unit} ({diff > 0 ? '+' : ''}
      {formatNumber(diff, locale)})
    </span>
  );
}
