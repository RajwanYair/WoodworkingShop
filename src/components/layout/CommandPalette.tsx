import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { getRecentCommands, invokeCommand, searchCommands } from '../../utils/command-palette';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState('');
  const recentCommands = open && !query.trim() ? getRecentCommands() : [];
  const recentIds = new Set(recentCommands.map((command) => command.id));
  const results = [
    ...recentCommands.map((command) => ({ command, score: 101 })),
    ...searchCommands(query).filter(({ command }) => !recentIds.has(command.id)),
  ];

  useFocusTrap(dialogRef, open, onClose);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setError('');
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(0, results.length - 1)));
  }, [results.length]);

  if (!open) return null;

  const invoke = async (id: string) => {
    try {
      await invokeCommand(id);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('commandPalette.actionFailed'));
    }
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && results.length > 0) {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp' && results.length > 0) {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === 'Enter' && results[activeIndex]) {
      event.preventDefault();
      void invoke(results[activeIndex].command.id);
    }
  };

  const activeOptionId = results[activeIndex]
    ? `${inputId}-option-${results[activeIndex].command.id.replace(/[^\w-]/g, '-')}`
    : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-3 pt-[12vh] sm:px-6">
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
        aria-label={t('commandPalette.close')}
        tabIndex={-1}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${inputId}-title`}
        tabIndex={-1}
        className="border-wood-300 dark:border-wood-700 dark:bg-wood-900 relative z-10 flex max-h-[76vh] w-full max-w-xl flex-col overflow-hidden rounded-lg border bg-white shadow-2xl outline-none"
      >
        <div className="border-wood-200 dark:border-wood-700 flex items-center gap-3 border-b px-4 py-3">
          <label id={`${inputId}-title`} htmlFor={inputId} className="sr-only">
            {t('commandPalette.title')}
          </label>
          <input
            id={inputId}
            type="search"
            role="combobox"
            aria-label={t('commandPalette.search')}
            aria-controls={`${inputId}-listbox`}
            aria-expanded="true"
            aria-activedescendant={activeOptionId}
            autoComplete="off"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
              setError('');
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder={t('commandPalette.search')}
            className="border-wood-300 dark:border-wood-700 bg-wood-50 dark:bg-wood-800 text-wood-900 dark:text-wood-100 focus-visible:ring-wood-500 min-w-0 flex-1 rounded-md border px-3 py-2 text-base outline-none focus-visible:ring-2"
          />
          <kbd className="text-wood-700 dark:text-wood-300 hidden rounded border px-1.5 py-1 font-mono text-xs sm:inline">
            Esc
          </kbd>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('commandPalette.close')}
            className="text-wood-500 hover:text-wood-800 dark:hover:text-wood-100 rounded p-2"
          >
            ×
          </button>
        </div>
        <ul
          id={`${inputId}-listbox`}
          role="listbox"
          aria-label={t('commandPalette.results')}
          className="overflow-y-auto p-2"
        >
          {results.map(({ command }, index) => {
            const optionId = `${inputId}-option-${command.id.replace(/[^\w-]/g, '-')}`;
            return (
              <li key={command.id} role="presentation">
                <button
                  id={optionId}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === index}
                  tabIndex={-1}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => void invoke(command.id)}
                  className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-start text-sm ${
                    activeIndex === index
                      ? 'bg-wood-100 text-wood-900 dark:bg-wood-800 dark:text-wood-100'
                      : 'text-wood-700 hover:bg-wood-50 dark:text-wood-200 dark:hover:bg-wood-800'
                  }`}
                >
                  <span className="min-w-0 truncate">{command.label}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    {recentIds.has(command.id) && (
                      <span className="text-wood-700 dark:text-wood-300 text-xs">{t('commandPalette.recent')}</span>
                    )}
                    {command.shortcut && (
                      <kbd className="text-wood-700 dark:text-wood-300 font-mono text-xs">{command.shortcut}</kbd>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
          {results.length === 0 && (
            <li className="text-wood-500 dark:text-wood-400 px-3 py-6 text-center text-sm">
              {t('commandPalette.noResults')}
            </li>
          )}
        </ul>
        <div className="border-wood-200 dark:border-wood-700 min-h-8 border-t px-4 py-2" aria-live="polite">
          {error && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
