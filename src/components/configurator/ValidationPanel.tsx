import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ValidationIssue, ValidationSeverity, CabinetConfig } from '../../engine/types';
import { IconWarning, IconInfo, IconX, IconCheck } from '../layout/Icons';
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
    if (issue.field !== undefined && issue.suggestedValue !== undefined) {
      const patch: Partial<CabinetConfig> = {};
      Object.assign(patch, { [issue.field]: issue.suggestedValue });
      setConfig(patch);
    }
    dismissIssue(issue.code);
  };

  const dismissAll = () => {
    setDismissed(new Set(visible.map((i) => i.code)));
  };

  return (
    <section
      aria-label={t('validation.title')}
      className="rounded-lg border border-wood-200 dark:border-wood-700 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-wood-50 dark:bg-wood-800 border-b border-wood-200 dark:border-wood-700">
        <button
          type="button"
          className="flex items-center gap-2 text-sm font-semibold text-wood-700 dark:text-wood-200 hover:text-wood-900 dark:hover:text-wood-50 transition-colors"
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
              className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300"
              aria-label={t('validation.error', { count: errorCount, postProcess: 'interval' })}
            >
              {errorCount}
            </span>
          )}
          {warnCount > 0 && (
            <span
              className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300"
              aria-label={t('validation.warning', { count: warnCount, postProcess: 'interval' })}
            >
              {warnCount}
            </span>
          )}
          {infoCount > 0 && (
            <span
              className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
              aria-label={t('validation.info', { count: infoCount, postProcess: 'interval' })}
            >
              {infoCount}
            </span>
          )}
        </button>

        <button
          type="button"
          className="text-xs text-wood-500 dark:text-wood-400 hover:text-wood-700 dark:hover:text-wood-200 underline transition-colors"
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
          className="divide-y divide-wood-100 dark:divide-wood-800"
          aria-live="polite"
          aria-atomic="false"
        >
          {visible.map((issue) => (
            <li
              key={issue.code}
              className={`flex items-start gap-2 px-3 py-2 text-sm border-s-2 ${SEVERITY_ROW_CLASS[issue.severity]}`}
              title={issue.code}
            >
              <SeverityIcon severity={issue.severity} />

              <div className="flex-1 min-w-0">
                <p className={`leading-snug ${SEVERITY_TEXT_CLASS[issue.severity]}`}>{issue.message[lang]}</p>
                {issue.suggestedValue !== undefined && (
                  <p className="mt-0.5 text-xs text-wood-500 dark:text-wood-400">
                    {t('validation.suggestedValue', { value: issue.suggestedValue })}
                  </p>
                )}
              </div>

              <div className="shrink-0 flex items-center gap-1">
                {issue.field !== undefined && issue.suggestedValue !== undefined && (
                  <button
                    type="button"
                    className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/60 transition-colors font-medium"
                    onClick={() => fixIssue(issue)}
                    aria-label={t('validation.fix')}
                  >
                    {t('validation.fix')}
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

/** Compact badge showing error/warning counts for use in tab headers. */
export function ValidationBadge({ issues }: ValidationPanelProps) {
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warnCount = issues.filter((i) => i.severity === 'warning').length;

  if (errorCount === 0 && warnCount === 0) return null;

  if (errorCount > 0) {
    return (
      <span
        className="ms-1.5 inline-flex items-center justify-center min-w-[1.1rem] h-4 rounded-full bg-red-600 text-white text-[10px] font-bold px-1"
        aria-label={`${errorCount} error${errorCount > 1 ? 's' : ''}`}
      >
        {errorCount}
      </span>
    );
  }

  return (
    <span
      className="ms-1.5 inline-flex items-center justify-center min-w-[1.1rem] h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold px-1"
      aria-label={`${warnCount} warning${warnCount > 1 ? 's' : ''}`}
    >
      {warnCount}
    </span>
  );
}

/** Simple "all clear" confirmation shown when 0 issues. */
export function ValidationAllClear() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 px-1 py-1">
      <IconCheck size={14} className="shrink-0" />
      {t('validation.noIssues')}
    </div>
  );
}
