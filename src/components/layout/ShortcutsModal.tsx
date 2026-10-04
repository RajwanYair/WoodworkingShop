import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { COMMANDS, formatShortcut } from './command-registry';

interface ShortcutsModalProps {
  onClose: () => void;
}

export function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const shortcuts = COMMANDS.flatMap((command) => {
    const bindings = 'shortcuts' in command ? (command.shortcuts ?? []) : [];
    return bindings.map((binding) => ({
      key: formatShortcut(binding).replaceAll('+', ' + '),
      label: t(command.labelKey),
      id: command.id,
    }));
  });
  shortcuts.push({ id: 'dialog.close', key: 'Escape', label: t('commandPalette.closeShortcuts') });

  /* Sprint 8 — focus trap (Tab cycling + Escape) via shared hook */
  useFocusTrap(dialogRef, true, onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop — interactive button for click-outside-to-close */}
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default bg-black/50"
        onClick={onClose}
        aria-label={t('commandPalette.closeShortcuts')}
        tabIndex={-1}
      />
      {/* Dialog panel */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('commandPalette.shortcutsTitle')}
        tabIndex={-1}
        className="dark:bg-wood-900 relative z-10 mx-4 w-full max-w-sm rounded-xl bg-white shadow-2xl outline-none"
      >
        {/* Header */}
        <div className="border-wood-200 dark:border-wood-700 flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-wood-800 dark:text-wood-100 text-base font-semibold">
            {t('commandPalette.shortcutsTitle')}
          </h2>
          <button
            onClick={onClose}
            className="text-wood-400 hover:text-wood-700 dark:hover:text-wood-200 text-lg leading-none"
            aria-label={t('commandPalette.closeShortcuts')}
          >
            ✕
          </button>
        </div>

        {/* Shortcut table */}
        <div className="p-4">
          <table className="w-full text-sm">
            <tbody>
              {shortcuts.map((shortcut) => (
                <tr
                  key={`${shortcut.id}.${shortcut.key}`}
                  className="border-wood-100 dark:border-wood-800 border-b last:border-0"
                >
                  <td className="py-1.5 pr-4 whitespace-nowrap">
                    <kbd className="bg-wood-100 dark:bg-wood-800 text-wood-700 dark:text-wood-200 rounded px-1.5 py-0.5 font-mono text-xs">
                      {shortcut.key}
                    </kbd>
                  </td>
                  <td className="text-wood-600 dark:text-wood-300 py-1.5">{shortcut.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
