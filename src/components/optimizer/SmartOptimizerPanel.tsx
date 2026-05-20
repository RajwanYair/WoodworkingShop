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
    <div className="border-wood-200 dark:border-wood-700 space-y-4 rounded-lg border p-4">
      <div>
        <h3 className="text-wood-700 dark:text-wood-200 text-sm font-semibold">{t('optimizer.smart')}</h3>
        <p className="text-wood-400 dark:text-wood-500 mt-0.5 text-xs">{t('optimizer.smartDesc')}</p>
      </div>

      {/* Strategy checkboxes */}
      <div>
        <label className="text-wood-600 dark:text-wood-300 mb-1 block text-xs font-medium">
          {t('optimizer.strategies')}
        </label>
        <div className="flex flex-wrap gap-2">
          {ALL_STRATEGIES.map((s) => (
            <label
              key={s}
              className="text-wood-600 dark:text-wood-300 flex cursor-pointer items-center gap-1.5 text-xs select-none"
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
        <label className="text-wood-600 dark:text-wood-300 mb-1 block text-xs font-medium">
          {t('optimizer.tolerance')}: ±{tolerance} mm
        </label>
        <input
          type="range"
          min={2}
          max={50}
          step={2}
          value={tolerance}
          onChange={(e) => setTolerance(Number(e.target.value))}
          className="accent-primary w-full"
        />
      </div>

      {/* Find button */}
      <button
        onClick={handleFind}
        disabled={running || strategies.length === 0}
        className="bg-wood-600 hover:bg-wood-700 w-full rounded py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        {running ? '…' : t('optimizer.find')}
      </button>

      {/* Results */}
      {results !== null && results.length === 0 && (
        <p className="text-wood-400 py-2 text-center text-xs">{t('optimizer.noResults')}</p>
      )}

      {results && results.length > 0 && (
        <div className="space-y-3">
          {results.map((s, idx) => (
            <div key={idx} className="border-wood-200 dark:border-wood-700 space-y-2 rounded border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <span className="bg-wood-100 dark:bg-wood-800 text-wood-600 dark:text-wood-300 rounded px-1.5 py-0.5 text-xs font-medium">
                    {t(`optimizer.strategy_${s.strategy}`)}
                  </span>
                  <p className="text-wood-600 dark:text-wood-300 mt-1 text-xs">{s.explanation[lang]}</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    onClick={() => setComparing(comparing === idx ? null : idx)}
                    className="border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-50 dark:hover:bg-wood-700 rounded border px-3 py-1 text-xs font-medium transition-colors"
                  >
                    {comparing === idx ? t('optimizer.hideCompare') : t('optimizer.compare')}
                  </button>
                  <button
                    onClick={() => handleApply(s)}
                    className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-green-700"
                  >
                    {t('optimizer.apply')}
                  </button>
                </div>
              </div>
              {comparing === idx && <ComparisonView suggestion={s} />}
              <div className="text-wood-600 dark:text-wood-300 flex gap-4 text-xs">
                {s.savings.sheetsRemoved > 0 && (
                  <span className="font-medium text-green-600">
                    −{s.savings.sheetsRemoved} {t('optimizer.sheetsRemoved')}
                  </span>
                )}
                {s.savings.yieldImprovement > 0 && (
                  <span className="font-medium text-green-600">
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
