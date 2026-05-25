import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ValidationIssue, ValidationSeverity, CabinetConfig } from '../../engine/types';
import { IconWarning, IconInfo, IconX } from '../layout/Icons';
import { useCabinetStore } from '../../store/cabinet-store';

interface ValidationPanelProps {
  issues: ValidationIssue[];
}

const SEVERITY_ORDER: Record<ValidationSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

function SeverityIcon({ severity }: { severity: ValidationSeverity }) {
  if (severity === 'error') return <IconWarning className="shrink-0 text-red-600 dark:text-red-400" size={16} />;
  if (severity === 'warning') return <IconWarning className="shrink-0 text-amber-500 dark:text-amber-400" size={16} />;
  return <IconInfo className="shrink-0 text-blue-500 dark:text-blue-400" size={16} />;
}

const SEVERITY_ROW_CLASS: Record<ValidationSeverity, string> = {
  error: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
  warning: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
  info: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
};

const SEVERITY_TEXT_CLASS: Record<ValidationSeverity, string> = {
  error: 'text-red-800 dark:text-red-200',
  warning: 'text-amber-800 dark:text-amber-200',
  info: 'text-blue-800 dark:text-blue-200',
};

/**
 * Shows manufacturing constraint validation issues derived from validateConfig().
 * Issues are dismissable individually. The panel hides when all are dismissed.
 */
export function ValidationPanel({ issues }: ValidationPanelProps) {
  const { t, i18n } = useTranslation();
  const { setConfig } = useCabinetStore();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(false);

  const visible = useMemo(
    () =>
      issues
        .filter((issue) => !dismissed.has(issue.code))
        .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]),
    [issues, dismissed],
  );

  if (visible.length === 0) return null;

  const errorCount = visible.filter((i) => i.severity === 'error').length;
  const warnCount = visible.filter((i) => i.severity === 'warning').length;
  const infoCount = visible.filter((i) => i.severity === 'info').length;

  const lang = (i18n.language?.startsWith('he') ? 'he' : 'en') as 'en' | 'he';

  const dismissIssue = (code: string) => {
    setDismissed((prev) => new Set([...prev, code]));
  };

  const fixIssue = (issue: ValidationIssue) => {
    // v3.58.0 \u2014 prefer the rich `fix.patch` (multi-field, programmatic) over
    // the legacy `field`/`suggestedValue` pair. Either path will close the issue.
    if (issue.fix?.patch) {
      setConfig(issue.fix.patch);
    } else if (issue.field !== undefined && issue.suggestedValue !== undefined) {
      const patch: Partial<CabinetConfig> = {};
      Object.assign(patch, { [issue.field]: issue.suggestedValue });
      setConfig(patch);
    }
    dismissIssue(issue.code);
  };

  const hasFix = (issue: ValidationIssue): boolean =>
    issue.fix?.patch !== undefined || (issue.field !== undefined && issue.suggestedValue !== undefined);

  const fixLabel = (issue: ValidationIssue): string =>
    issue.fix?.labelKey ? t(issue.fix.labelKey) : t('validation.fix');

  const dismissAll = () => {
    setDismissed(new Set(visible.map((i) => i.code)));
  };

  return (
    <section
      aria-label={t('validation.title')}
      className="border-wood-200 dark:border-wood-700 overflow-hidden rounded-lg border"
    >
      {/* Header */}
      <div className="bg-wood-50 dark:bg-wood-800 border-wood-200 dark:border-wood-700 flex items-center justify-between border-b px-3 py-2">
        <button
          type="button"
          className="text-wood-700 dark:text-wood-200 hover:text-wood-900 dark:hover:text-wood-50 flex items-center gap-2 text-sm font-semibold transition-colors"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          aria-controls="validation-issue-list"
        >
          {errorCount > 0 ? (
            <IconWarning className="text-red-600 dark:text-red-400" size={16} />
          ) : (
            <IconWarning className="text-amber-500 dark:text-amber-400" size={16} />
          )}
          {t('validation.title')}
          {/* Sprint 72 — colored severity count badges */}
          {errorCount > 0 && (
            <span
              className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-100 px-1 text-xs font-bold text-red-700 dark:bg-red-900/50 dark:text-red-300"
              aria-label={t('validation.error', { count: errorCount, postProcess: 'interval' })}
            >
              {errorCount}
            </span>
          )}
          {warnCount > 0 && (
            <span
              className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1 text-xs font-bold text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
              aria-label={t('validation.warning', { count: warnCount, postProcess: 'interval' })}
            >
              {warnCount}
            </span>
          )}
          {infoCount > 0 && (
            <span
              className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-100 px-1 text-xs font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
              aria-label={t('validation.info', { count: infoCount, postProcess: 'interval' })}
            >
              {infoCount}
            </span>
          )}
        </button>

        <button
          type="button"
          className="text-wood-500 dark:text-wood-400 hover:text-wood-700 dark:hover:text-wood-200 text-xs underline transition-colors"
          onClick={dismissAll}
          aria-label={t('validation.dismissAll')}
        >
          {t('validation.dismissAll')}
        </button>
      </div>

      {/* Issue list */}
      {!collapsed && (
        <ul
          id="validation-issue-list"
          className="divide-wood-100 dark:divide-wood-800 divide-y"
          aria-live="polite"
          aria-atomic="false"
        >
          {visible.map((issue) => (
            <li
              key={issue.code}
              className={`flex items-start gap-2 border-s-2 px-3 py-2 text-sm ${SEVERITY_ROW_CLASS[issue.severity]}`}
              title={issue.code}
            >
              <SeverityIcon severity={issue.severity} />

              <div className="min-w-0 flex-1">
                <p className={`leading-snug ${SEVERITY_TEXT_CLASS[issue.severity]}`}>{issue.message[lang]}</p>
                {issue.suggestedValue !== undefined && (
                  <p className="text-wood-500 dark:text-wood-400 mt-0.5 text-xs">
                    {t('validation.suggestedValue', { value: issue.suggestedValue })}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {hasFix(issue) && (
                  <button
                    type="button"
                    className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-800/60"
                    onClick={() => fixIssue(issue)}
                    aria-label={fixLabel(issue)}
                  >
                    {fixLabel(issue)}
                  </button>
                )}
                <button
                  type="button"
                  className="text-wood-400 hover:text-wood-700 dark:hover:text-wood-200 transition-colors"
                  onClick={() => dismissIssue(issue.code)}
                  aria-label={t('validation.dismiss')}
                >
                  <IconX size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
