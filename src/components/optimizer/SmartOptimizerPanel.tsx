import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { findOptimizations, type SmartOptimizerOptions } from '../../engine/smart-optimizer';
import { ComparisonView } from './ComparisonView';
import type { OptimizationSuggestion, SmartStrategy, Lang } from '../../engine/types';

const ALL_STRATEGIES: SmartStrategy[] = [
  'reduce-depth',
  'co-nest-strips',
  'adjust-width',
  'adjust-height',
  'material-swap',
];

export function SmartOptimizerPanel() {
  const { t, i18n } = useTranslation();
  const { config, setConfig } = useCabinetStore();
  const lang = i18n.language as Lang;

  const [strategies, setStrategies] = useState<SmartStrategy[]>([...ALL_STRATEGIES]);
  const [tolerance, setTolerance] = useState(20);
  const [results, setResults] = useState<OptimizationSuggestion[] | null>(null);
  const [running, setRunning] = useState(false);
  const [comparing, setComparing] = useState<number | null>(null);

  const toggleStrategy = (s: SmartStrategy) => {
    setStrategies((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const handleFind = () => {
    setRunning(true);
    // Use setTimeout to let the UI update before heavy computation
    setTimeout(() => {
      const opts: Partial<SmartOptimizerOptions> = { strategies, tolerance };
      const suggestions = findOptimizations(config, opts);
      setResults(suggestions);
      setRunning(false);
    }, 10);
  };

  const handleApply = (suggestion: OptimizationSuggestion) => {
    const { optimizedConfig } = suggestion;
    setConfig({
      width: optimizedConfig.width,
      height: optimizedConfig.height,
      depth: optimizedConfig.depth,
      carcassMaterial: optimizedConfig.carcassMaterial,
      backPanelMaterial: optimizedConfig.backPanelMaterial,
    });
    setResults(null);
  };

  return (
    <div className="border border-wood-200 dark:border-wood-700 rounded-lg p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-wood-700 dark:text-wood-200">{t('optimizer.smart')}</h3>
        <p className="text-xs text-wood-400 dark:text-wood-500 mt-0.5">{t('optimizer.smartDesc')}</p>
      </div>

      {/* Strategy checkboxes */}
      <div>
        <label className="text-xs font-medium text-wood-600 dark:text-wood-300 block mb-1">
          {t('optimizer.strategies')}
        </label>
        <div className="flex flex-wrap gap-2">
          {ALL_STRATEGIES.map((s) => (
            <label
              key={s}
              className="flex items-center gap-1.5 text-xs text-wood-600 dark:text-wood-300 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={strategies.includes(s)}
                onChange={() => toggleStrategy(s)}
                className="accent-primary"
              />
              {t(`optimizer.strategy_${s}`)}
            </label>
          ))}
        </div>
      </div>

      {/* Tolerance slider */}
      <div>
        <label className="text-xs font-medium text-wood-600 dark:text-wood-300 block mb-1">
          {t('optimizer.tolerance')}: ±{tolerance} mm
        </label>
        <input
          type="range"
          min={2}
          max={50}
          step={2}
          value={tolerance}
          onChange={(e) => setTolerance(Number(e.target.value))}
          className="w-full accent-primary"
        />
      </div>

      {/* Find button */}
      <button
        onClick={handleFind}
        disabled={running || strategies.length === 0}
        className="w-full py-2 rounded text-sm font-medium bg-wood-500 text-white hover:bg-wood-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {running ? '…' : t('optimizer.find')}
      </button>

      {/* Results */}
      {results !== null && results.length === 0 && (
        <p className="text-xs text-wood-400 text-center py-2">{t('optimizer.noResults')}</p>
      )}

      {results && results.length > 0 && (
        <div className="space-y-3">
          {results.map((s, idx) => (
            <div key={idx} className="border border-wood-200 dark:border-wood-700 rounded p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-wood-100 dark:bg-wood-800 text-wood-600 dark:text-wood-300">
                    {t(`optimizer.strategy_${s.strategy}`)}
                  </span>
                  <p className="text-xs text-wood-600 dark:text-wood-300 mt-1">{s.explanation[lang]}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => setComparing(comparing === idx ? null : idx)}
                    className="px-3 py-1 text-xs font-medium border border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 rounded hover:bg-wood-50 dark:hover:bg-wood-700 transition-colors"
                  >
                    {comparing === idx ? t('optimizer.hideCompare') : t('optimizer.compare')}
                  </button>
                  <button
                    onClick={() => handleApply(s)}
                    className="px-3 py-1 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                  >
                    {t('optimizer.apply')}
                  </button>
                </div>
              </div>
              {comparing === idx && <ComparisonView suggestion={s} />}
              <div className="flex gap-4 text-xs text-wood-500 dark:text-wood-400">
                {s.savings.sheetsRemoved > 0 && (
                  <span className="text-green-600 font-medium">
                    −{s.savings.sheetsRemoved} {t('optimizer.sheetsRemoved')}
                  </span>
                )}
                {s.savings.yieldImprovement > 0 && (
                  <span className="text-green-600 font-medium">
                    +{s.savings.yieldImprovement}% {t('optimizer.yieldGain')}
                  </span>
                )}
                <span>
                  {s.optimizedResult.totalSheets} {t('optimizer.sheets').toLowerCase()} /{' '}
                  {s.optimizedResult.overallYield}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
