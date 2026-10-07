import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { RTL_LANGS, loadLocale, SUPPORTED_LANGUAGES } from '../../i18n';
import type { CalculatorId } from '../configurator/calculator-catalog';
import { useCabinetStore } from '../../store/cabinet-store';
import { useToastStore } from '../../store/toast-store';
import { COMMANDS, dispatchCommandAction, formatShortcut } from './command-registry';
import {
  groupSearchResults,
  getRecentCommands,
  invokeCommand,
  registerCommands,
  searchCommands,
  unregisterCommand,
  type PaletteCommand,
} from '../../utils/command-palette';
import { listProjects } from '../../utils/project-storage';
import { IconSearch, IconX } from './Icons';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onOpenCalculator: (id: CalculatorId) => void;
}

export function CommandPalette({ open, onClose, onOpenCalculator }: CommandPaletteProps) {
  const { t, i18n } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [, setCommandsRevision] = useState(0);
  const addToast = useToastStore((state) => state.addToast);
  const recentCommands = query.trim() ? [] : getRecentCommands();
  const recentIds = new Set(recentCommands.map((command) => command.id));
  const results = [
    ...recentCommands.map((command) => ({
      command: { ...command, category: t('commandPalette.categoryRecent') },
      score: 100,
    })),
    ...searchCommands(query, 100).filter((result) => !recentIds.has(result.command.id)),
  ];
  const groups = groupSearchResults(results);
  const resultIndexes = new Map(results.map((result, index) => [result.command.id, index]));
  const selected = results[activeIndex]?.command;

  const close = useCallback(() => onClose(), [onClose]);
  useFocusTrap(dialogRef, open, close);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
      return;
    }
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    let disposed = false;
    const registeredIds: string[] = [];
    const projectCategory = t('commandPalette.categoryProjects');
    const languageCategory = t('commandPalette.categoryLanguages');
    const commands: PaletteCommand[] = COMMANDS.filter((command) => command.showInPalette).map((command) => {
      const shortcut = 'shortcuts' in command ? command.shortcuts?.[0] : undefined;
      return {
        id: command.id,
        label: t(command.labelKey),
        category: t(command.categoryKey),
        shortcut: shortcut ? formatShortcut(shortcut) : undefined,
        keywords: 'keywords' in command ? [...command.keywords] : undefined,
        when: () => {
          const state = useCabinetStore.getState();
          return command.when({ canUndo: state.canUndo, canRedo: state.canRedo });
        },
        action: () => {
          const state = useCabinetStore.getState();
          command.handler({
            run: dispatchCommandAction,
            setActiveTab: (tab) => state.setActiveTab(tab),
            openCalculator: onOpenCalculator,
          });
        },
      };
    });

    for (const language of SUPPORTED_LANGUAGES) {
      commands.push({
        id: `language.${language.code}`,
        label: t('commandPalette.switchLanguage', { language: language.nativeLabel }),
        category: languageCategory,
        action: async () => {
          await loadLocale(language.code);
          await i18n.changeLanguage(language.code);
          document.documentElement.dir = RTL_LANGS.has(language.code) ? 'rtl' : 'ltr';
          useCabinetStore
            .getState()
            .setConfig({ lang: language.code === 'he' || language.code === 'ar' ? 'he' : 'en' });
        },
      });
    }

    registerCommands(commands);
    registeredIds.push(...commands.map((command) => command.id));
    setCommandsRevision((revision) => revision + 1);

    void listProjects()
      .then((projects) => {
        if (disposed) return;
        const recentProjects = [...projects]
          .sort((left, right) => right.savedAt.localeCompare(left.savedAt))
          .slice(0, 10)
          .map<PaletteCommand>((project) => ({
            id: `project.${project.id}`,
            label: t('commandPalette.openProject', { name: project.name }),
            category: projectCategory,
            keywords: [project.name],
            action: () => {
              const state = useCabinetStore.getState();
              state.loadProject(project.cabinets);
              state.setProjectName(project.name);
            },
          }));
        registerCommands(recentProjects);
        registeredIds.push(...recentProjects.map((command) => command.id));
        setCommandsRevision((revision) => revision + 1);
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      registeredIds.forEach(unregisterCommand);
    };
  }, [addToast, i18n, onOpenCalculator, t]);

  useEffect(() => setActiveIndex(0), [query]);

  const runCommand = (command: PaletteCommand) => {
    void invokeCommand(command.id)
      .then(onClose)
      .catch(() => addToast(t('commandPalette.commandFailed'), 'error'));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && results.length > 0) {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp' && results.length > 0) {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === 'Enter' && selected) {
      event.preventDefault();
      runCommand(selected);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-3 pt-[10vh] sm:px-6"
      data-print="hide"
    >
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
        aria-labelledby="command-palette-title"
        tabIndex={-1}
        className="dark:bg-wood-900 border-wood-300 dark:border-wood-700 relative w-full max-w-2xl overflow-hidden rounded-md border bg-white shadow-2xl outline-none"
      >
        <div className="border-wood-200 dark:border-wood-700 flex items-center gap-3 border-b px-4">
          <IconSearch size={19} />
          <input
            ref={inputRef}
            role="combobox"
            aria-label={t('commandPalette.searchPlaceholder')}
            aria-autocomplete="list"
            aria-expanded={results.length > 0}
            aria-controls={results.length > 0 ? 'command-palette-results' : undefined}
            aria-activedescendant={selected ? `command-option-${activeIndex}` : undefined}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('commandPalette.searchPlaceholder')}
            autoComplete="off"
            className="dark:text-wood-100 dark:placeholder:text-wood-300 text-wood-800 placeholder:text-wood-600 min-w-0 flex-1 border-0 bg-transparent py-4 text-base outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label={t('commandPalette.close')}
            className="text-wood-500 hover:text-wood-800 dark:hover:text-wood-100 inline-flex h-8 w-8 items-center justify-center rounded"
          >
            <IconX size={17} />
          </button>
        </div>
        <h2 id="command-palette-title" className="sr-only">
          {t('commandPalette.title')}
        </h2>
        {results.length === 0 ? (
          <p className="text-wood-700 dark:text-wood-300 px-4 py-8 text-center text-sm" aria-live="polite">
            {t('commandPalette.noResults')}
          </p>
        ) : (
          <div
            id="command-palette-results"
            role="listbox"
            aria-label={t('commandPalette.title')}
            className="max-h-[70vh] overflow-y-auto p-2"
          >
            {groups.map((group) => (
              <div key={group.category} role="group" aria-label={group.category} className="mb-2 last:mb-0">
                <p className="text-wood-700 dark:text-wood-300 px-2 py-1 text-xs font-semibold">{group.category}</p>
                {group.commands.map((command) => {
                  const index = resultIndexes.get(command.id) ?? 0;
                  return (
                    <button
                      key={command.id}
                      id={`command-option-${index}`}
                      type="button"
                      role="option"
                      aria-selected={activeIndex === index}
                      onMouseMove={() => setActiveIndex(index)}
                      onClick={() => runCommand(command)}
                      className={`flex w-full items-center justify-between gap-4 rounded px-3 py-2 text-start text-sm ${
                        activeIndex === index
                          ? 'bg-wood-100 text-wood-900 dark:bg-wood-800 dark:text-wood-50'
                          : 'text-wood-700 hover:bg-wood-50 dark:text-wood-200 dark:hover:bg-wood-800'
                      }`}
                    >
                      <span className="min-w-0 truncate">{command.label}</span>
                      {command.shortcut && (
                        <kbd className="text-wood-700 dark:text-wood-200 shrink-0 font-mono text-xs">
                          {command.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
