import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { validateConstraints, applyConstraints, getDimensionRange } from '../../engine/constraint-solver';
import type { ConstraintViolation, DimensionField } from '../../engine/constraint-solver';
import type { CabinetConfig } from '../../engine/types';

/** Map a DimensionField to its localisation key suffix. */
const FIELD_LABEL_KEY: Record<DimensionField, string> = {
  width: 'config.width',
  height: 'config.height',
  depth: 'config.depth',
  shelfCount: 'config.shelves',
  drawerCount: 'config.drawers',
  kickHeight: 'config.kickHeight',
  doorReveal: 'config.doorReveal',
};

/** Map ConstraintOp to icon. */
const OP_ICON: Record<string, string> = {
  min: '↑',
  max: '↓',
  step: '⌗',
  ratio: '⚖',
};

interface ViolationRowProps {
  violation: ConstraintViolation;
  onApply: (field: DimensionField, value: number) => void;
}

function ViolationRow({ violation, onApply }: ViolationRowProps) {
  const { t } = useTranslation();
  return (
    <li className="border-wood-200 dark:border-wood-700 flex flex-col gap-1 border-b py-2 last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <span
          className="bg-wood-100 text-wood-700 dark:bg-wood-800 dark:text-wood-300 inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-xs"
          aria-label={violation.field}
        >
          <span aria-hidden="true">{OP_ICON[violation.op] ?? '!'}</span>
          {t(FIELD_LABEL_KEY[violation.field])}
        </span>
        <button
          type="button"
          className="bg-wood-600 hover:bg-wood-700 shrink-0 rounded px-2 py-0.5 text-xs font-medium text-white transition-colors"
          onClick={() => onApply(violation.field, violation.correctedValue)}
          aria-label={`${t('constraints.fixField', { field: t(FIELD_LABEL_KEY[violation.field]) })}: ${violation.correctedValue}`}
        >
          {t('constraints.fix')} → {violation.correctedValue}
        </button>
      </div>
      <p className="text-wood-500 dark:text-wood-400 text-xs">{violation.message}</p>
    </li>
  );
}

interface RangeHintRowProps {
  field: DimensionField;
  config: CabinetConfig;
}

function RangeHintRow({ field, config }: RangeHintRowProps) {
  const { t } = useTranslation();
  const range = useMemo(() => getDimensionRange(field, config), [field, config]);
  const currentValue = config[field] as number;
  const pct = Math.max(0, Math.min(100, ((currentValue - range.min) / Math.max(range.max - range.min, 1)) * 100));

  return (
    <li className="space-y-1 py-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-wood-600 dark:text-wood-300 font-medium">{t(FIELD_LABEL_KEY[field])}</span>
        <span className="text-wood-500 dark:text-wood-400 font-mono">
          {currentValue} / {range.min}–{range.max}
        </span>
      </div>
      <div
        className="bg-wood-200 dark:bg-wood-700 h-1.5 w-full overflow-hidden rounded-full"
        role="meter"
        aria-valuenow={currentValue}
        aria-valuemin={range.min}
        aria-valuemax={range.max}
        aria-label={`${t(FIELD_LABEL_KEY[field])}: ${currentValue}`}
      >
        <div className="bg-wood-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </li>
  );
}

const RANGE_HINT_FIELDS: DimensionField[] = ['width', 'height', 'depth'];

/** Collapsible panel showing real-time constraint violations and dimension range hints (Sprint 110). */
export function ConstraintSuggestionsPanel() {
  const { t } = useTranslation();
  const { config, setConfig } = useCabinetStore();
  const [open, setOpen] = useState(false);

  const violations = useMemo(() => validateConstraints(config), [config]);
  const hasViolations = violations.length > 0;

  const handleFix = (field: DimensionField, correctedValue: number) => {
    setConfig({ [field]: correctedValue } as Partial<CabinetConfig>);
  };

  const handleFixAll = () => {
    const corrected = applyConstraints(config);
    setConfig({
      width: corrected.width,
      height: corrected.height,
      depth: corrected.depth,
      shelfCount: corrected.shelfCount,
      drawerCount: corrected.drawerCount,
      kickHeight: corrected.kickHeight,
      doorReveal: corrected.doorReveal,
    });
  };

  return (
    <section
      className={`mb-3 rounded-lg border ${
        hasViolations
          ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950'
          : 'border-wood-200 bg-wood-50 dark:border-wood-700 dark:bg-wood-900'
      }`}
      aria-label={t('constraints.panelLabel')}
    >
      <button
        type="button"
        className={`flex w-full items-center justify-between px-3 py-2 text-sm font-semibold ${
          hasViolations ? 'text-amber-700 dark:text-amber-300' : 'text-wood-700 dark:text-wood-200'
        }`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true">{hasViolations ? '⚠' : '✓'}</span>
          {t('constraints.title')}
          {hasViolations && (
            <span className="inline-flex items-center rounded-full bg-amber-500 px-1.5 py-0.5 text-xs font-bold text-white">
              {violations.length}
            </span>
          )}
        </span>
        <span aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="space-y-3 px-3 pb-3">
          {/* Violation list */}
          {hasViolations ? (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-wood-600 dark:text-wood-300 text-xs font-medium">{t('constraints.violations')}</p>
                <button
                  type="button"
                  className="rounded bg-amber-500 px-2 py-0.5 text-xs font-medium text-white transition-colors hover:bg-amber-600"
                  onClick={handleFixAll}
                >
                  {t('constraints.fixAll')}
                </button>
              </div>
              <ul aria-label={t('constraints.violations')} className="divide-wood-100 dark:divide-wood-800 divide-y">
                {violations.map((v, i) => (
                  <ViolationRow key={`${v.field}-${v.op}-${i}`} violation={v} onApply={handleFix} />
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-wood-500 dark:text-wood-400 flex items-center gap-1.5 py-1 text-xs">
              <span aria-hidden="true">✓</span>
              {t('constraints.allValid')}
            </p>
          )}

          {/* Dimension range hints */}
          <div>
            <p className="text-wood-600 dark:text-wood-300 mb-1 text-xs font-medium">{t('constraints.rangeHints')}</p>
            <ul aria-label={t('constraints.rangeHints')} className="space-y-1">
              {RANGE_HINT_FIELDS.map((field) => (
                <RangeHintRow key={field} field={field} config={config} />
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
