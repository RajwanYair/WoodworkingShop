import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { findOptimizations } from '../../engine/smart-optimizer';
import type { Lang, OptimizationSuggestion, SmartStrategy } from '../../engine/types';
import {
  IconLightbulb,
  IconRefresh,
  IconGrainVertical,
  IconGrainHorizontal,
  IconChevronDown,
  IconChevronRight,
  IconX,
} from '../layout/Icons';

const STRATEGY_ICON: Record<SmartStrategy, React.ReactElement> = {
  'reduce-depth': <IconGrainVertical size={14} className="text-amber-800 dark:text-amber-300" />,
  'co-nest-strips': <IconRefresh size={14} className="text-amber-800 dark:text-amber-300" />,
  'adjust-width': <IconGrainHorizontal size={14} className="text-amber-800 dark:text-amber-300" />,
  'adjust-height': <IconGrainVertical size={14} className="text-amber-800 dark:text-amber-300" />,
  'material-swap': <IconRefresh size={14} className="text-amber-800 dark:text-amber-300" />,
  'shelf-count-reduce': <IconChevronDown size={14} className="text-amber-800 dark:text-amber-300" />,
  exhaustive: <IconRefresh size={14} className="text-amber-800 dark:text-amber-300" />,
};

function suggestionKey(s: OptimizationSuggestion): string {
  const c = s.optimizedConfig;
  return `${c.width}|${c.height}|${c.depth}|${c.carcassMaterial}|${s.strategy}`;
}

export function OptimizationNotesPanel() {
  const { t, i18n } = useTranslation();
  const { config, setConfig } = useCabinetStore();
  const lang = i18n.language as Lang;

  const [tolerance, setTolerance] = useState(20);
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [open, setOpen] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-compute whenever config or tolerance changes (debounced 150 ms to avoid
  // hammering the optimizer on every slider tick).
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSuggestions(findOptimizations(config, { tolerance }));
    }, 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [config, tolerance]);

  const visible = suggestions.filter((s) => !dismissed.has(suggestionKey(s)));

  const handleApply = (s: OptimizationSuggestion) => {
    const c = s.optimizedConfig;
    setConfig({
      width: c.width,
      height: c.height,
      depth: c.depth,
      carcassMaterial: c.carcassMaterial,
      backPanelMaterial: c.backPanelMaterial,
    });
    setDismissed((prev) => new Set([...prev, suggestionKey(s)]));
  };

  const handleDismiss = (s: OptimizationSuggestion) => {
    setDismissed((prev) => new Set([...prev, suggestionKey(s)]));
  };

  // Always render the header/threshold even when no suggestions, so the user
  // can see the current tolerance setting. Hide the card list when empty.
  return (
    <div className="overflow-hidden rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-900/10">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-amber-200 px-4 py-2.5 dark:border-amber-700/50">
        <div className="flex items-center gap-2">
          <span className="text-amber-800 dark:text-amber-300">
            <IconLightbulb size={16} />
          </span>
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">{t('optimizer.notes')}</h3>
          {visible.length > 0 && (
            <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] leading-none font-medium text-white">
              {visible.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Tolerance slider */}
          <label className="flex items-center gap-1.5 text-xs text-amber-700 select-none dark:text-amber-400">
            {t('optimizer.tolerance')} ±
            <input
              type="number"
              min={2}
              max={60}
              step={2}
              value={tolerance}
              onChange={(e) => setTolerance(Number(e.target.value))}
              className="dark:bg-wood-800 w-12 rounded border border-amber-300 bg-white px-1 py-0.5 text-center text-xs focus:ring-1 focus:ring-amber-400 focus:outline-none dark:border-amber-700"
              aria-label={t('optimizer.tolerance')}
            />
            mm
          </label>
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-0.5 text-amber-800 select-none hover:underline dark:text-amber-300"
            aria-expanded={open}
          >
            {open ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
          </button>
        </div>
      </div>

      {/* ── Suggestion cards ── */}
      {open && (
        <div className="space-y-2 p-3">
          {visible.length === 0 ? (
            <p className="py-1 text-center text-xs text-amber-800 dark:text-amber-300">{t('optimizer.notesEmpty')}</p>
          ) : (
            visible.map((s) => {
              const key = suggestionKey(s);
              return (
                <div
                  key={key}
                  className="dark:bg-wood-800/60 flex items-start justify-between gap-3 rounded border border-amber-200 bg-white px-3 py-2 dark:border-amber-700/40"
                >
                  {/* Left: icon + description */}
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <span className="mt-0.5 flex shrink-0 items-center text-base leading-none">
                      {STRATEGY_ICON[s.strategy]}
                    </span>
                    <div className="min-w-0">
                      <p className="text-wood-700 dark:text-wood-200 truncate text-xs font-medium">
                        {s.explanation[lang]}
                      </p>
                      <div className="mt-0.5 flex flex-wrap gap-3">
                        {s.savings.sheetsRemoved > 0 && (
                          <span className="text-[11px] font-semibold text-green-600 dark:text-green-400">
                            −{s.savings.sheetsRemoved} {t('optimizer.sheetsRemoved')}
                          </span>
                        )}
                        {s.savings.yieldImprovement > 0 && (
                          <span className="text-[11px] font-semibold text-green-600 dark:text-green-400">
                            +{s.savings.yieldImprovement}% {t('optimizer.yieldGain')}
                          </span>
                        )}
                        {s.savings.wasteReduced > 0 && (
                          <span className="text-wood-600 dark:text-wood-300 text-[11px]">
                            −{(s.savings.wasteReduced / 1_000_000).toFixed(3)} m² {t('optimizer.wasteReduced')}
                          </span>
                        )}
                        <span className="text-wood-400 dark:text-wood-500 text-[11px]">
                          → {s.optimizedResult.totalSheets} {t('optimizer.sheets').toLowerCase()} /{' '}
                          {s.optimizedResult.overallYield}%
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Right: actions */}
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      onClick={() => handleApply(s)}
                      className="rounded bg-green-600 px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-green-700"
                    >
                      {t('optimizer.apply')}
                    </button>
                    <button
                      onClick={() => handleDismiss(s)}
                      className="border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-100 dark:hover:bg-wood-700 flex items-center rounded border px-2.5 py-1 text-[11px] font-medium transition-colors"
                      aria-label={t('optimizer.notesDismiss')}
                    >
                      <IconX size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
          {dismissed.size > 0 && (
            <button
              onClick={() => setDismissed(new Set())}
              className="w-full text-end text-[10px] text-amber-800 hover:underline dark:text-amber-300"
            >
              {t('optimizer.notesRestore')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
