/**
 * Sprint 89 — Project Build Log Panel
 *
 * Collapsible panel in the Assembly tab.  Lets users log free-text notes
 * as they build (e.g. "Left-door hinge shimmed +2 mm", "Step 4 skipped").
 * Notes are persisted in localStorage via the Zustand UI slice.
 */
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';

export function BuildLogPanel() {
  const { t } = useTranslation();
  const buildLog = useCabinetStore((s) => s.buildLog);
  const addBuildLogEntry = useCabinetStore((s) => s.addBuildLogEntry);
  const deleteBuildLogEntry = useCabinetStore((s) => s.deleteBuildLogEntry);
  const clearBuildLog = useCabinetStore((s) => s.clearBuildLog);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleAdd = () => {
    if (!draft.trim()) return;
    addBuildLogEntry(draft);
    setDraft('');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <section aria-label={t('buildLog.title')}>
      {/* Header / toggle */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="text-wood-700 dark:text-wood-200 flex w-full items-center justify-between text-sm font-semibold tracking-wide uppercase"
      >
        <span>📋 {t('buildLog.title')}</span>
        <span aria-hidden="true" className="text-wood-400 dark:text-wood-500 text-xs">
          {open ? '▲' : '▼'} {buildLog.length > 0 && `(${buildLog.length})`}
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {/* Entry composer */}
          <div className="space-y-2">
            <label htmlFor="build-log-draft" className="text-wood-600 dark:text-wood-300 sr-only text-xs">
              {t('buildLog.addPlaceholder')}
            </label>
            <textarea
              id="build-log-draft"
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('buildLog.addPlaceholder')}
              rows={2}
              className="border-wood-200 dark:border-wood-700 bg-wood-50 dark:bg-wood-800/60 text-wood-700 dark:text-wood-200 placeholder:text-wood-400 dark:placeholder:text-wood-500 focus:ring-wood-400 w-full resize-none rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-wood-400 dark:text-wood-500 text-xs">{t('buildLog.hint')}</span>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!draft.trim()}
                className="bg-wood-600 hover:bg-wood-700 disabled:bg-wood-300 dark:disabled:bg-wood-700 rounded px-3 py-1 text-xs font-medium text-white transition-colors disabled:cursor-not-allowed"
              >
                {t('buildLog.add')}
              </button>
            </div>
          </div>

          {/* Entry list */}
          {buildLog.length === 0 ? (
            <p className="text-wood-400 dark:text-wood-500 text-center text-xs">{t('buildLog.empty')}</p>
          ) : (
            <>
              <ul className="space-y-2">
                {buildLog.map((entry) => (
                  <li
                    key={entry.id}
                    className="bg-wood-50 dark:bg-wood-800/60 flex items-start gap-2 rounded-lg p-2 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-wood-700 dark:text-wood-200 break-words whitespace-pre-wrap">{entry.text}</p>
                      <time
                        dateTime={entry.createdAt}
                        className="text-wood-400 dark:text-wood-500 mt-0.5 block text-xs"
                      >
                        {new Date(entry.createdAt).toLocaleString()}
                      </time>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteBuildLogEntry(entry.id)}
                      aria-label={t('buildLog.delete')}
                      className="text-wood-400 dark:text-wood-500 shrink-0 transition-colors hover:text-red-500 dark:hover:text-red-400"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={clearBuildLog}
                className="text-wood-400 dark:text-wood-500 w-full text-center text-xs transition-colors hover:text-red-500 dark:hover:text-red-400"
              >
                {t('buildLog.clearAll')}
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
