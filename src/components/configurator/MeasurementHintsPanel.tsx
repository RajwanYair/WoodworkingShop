import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { getMeasurementHints, type HintLevel } from '../../engine/measurement-assistant';

const LEVEL_STYLE: Record<HintLevel, string> = {
  standard: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200',
  ergonomic: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200',
  tip: 'border-wood-200 bg-wood-50 text-wood-700 dark:border-wood-700 dark:bg-wood-900 dark:text-wood-200',
};

const LEVEL_ICON: Record<HintLevel, string> = {
  standard: '📐',
  ergonomic: '🦾',
  tip: '💡',
};

/**
 * Sprint 85 — Measurement assistant panel.
 * Renders rule-based ergonomic & best-practice hints for the current config.
 * Only visible when there are hints to show.
 */
export function MeasurementHintsPanel() {
  const { t } = useTranslation();
  const config = useCabinetStore((s) => s.config);
  const hints = useMemo(() => getMeasurementHints(config), [config]);

  if (hints.length === 0) return null;

  return (
    <section aria-label={t('measurementAssistant.title')} className="space-y-2">
      <h3 className="text-wood-600 dark:text-wood-300 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
        📏 {t('measurementAssistant.title')}
      </h3>
      <ul className="space-y-1.5">
        {hints.map((hint) => (
          <li
            key={hint.id}
            className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${LEVEL_STYLE[hint.level]}`}
          >
            <span aria-hidden="true" className="mt-px shrink-0">
              {LEVEL_ICON[hint.level]}
            </span>
            <span>{t(hint.messageKey, hint.values as Record<string, string | number>)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
