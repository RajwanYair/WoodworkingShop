import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { APP_SHORTCUTS, APP_TAB_COMMANDS } from '../../utils/command-palette';

interface ShortcutsModalProps {
  onClose: () => void;
}

const SHORTCUTS: { key: string; descEn?: string; descHe?: string; descKey?: string }[] = [
  ...Object.values(APP_SHORTCUTS).map(({ shortcut, labelKey }) => ({
    key: shortcut.includes('+') ? shortcut.replaceAll('+', ' + ') : shortcut,
    descKey: labelKey,
  })),
  ...APP_TAB_COMMANDS.filter((command) => command.shortcut !== null).map(({ shortcut, labelKey }) => ({
    key: shortcut.replaceAll('+', ' + '),
    descKey: labelKey,
  })),
  { key: 'Escape', descEn: 'Close this panel', descHe: 'סגור לוח זה' },
];

export function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  const { i18n, t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const isHe = i18n.language === 'he';

  /* Sprint 8 — focus trap (Tab cycling + Escape) via shared hook */
  useFocusTrap(dialogRef, true, onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop — interactive button for click-outside-to-close */}
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default bg-black/50"
        onClick={onClose}
        aria-label={isHe ? 'סגור' : 'Close dialog'}
        tabIndex={-1}
      />
      {/* Dialog panel */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={isHe ? 'קיצורי מקלדת' : 'Keyboard Shortcuts'}
        tabIndex={-1}
        className="dark:bg-wood-900 relative z-10 mx-4 w-full max-w-sm rounded-xl bg-white shadow-2xl outline-none"
      >
        {/* Header */}
        <div className="border-wood-200 dark:border-wood-700 flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-wood-800 dark:text-wood-100 text-base font-semibold">
            {isHe ? 'קיצורי מקלדת' : 'Keyboard Shortcuts'}
          </h2>
          <button
            onClick={onClose}
            className="text-wood-400 hover:text-wood-700 dark:hover:text-wood-200 text-lg leading-none"
            aria-label={isHe ? 'סגור' : 'Close'}
          >
            ✕
          </button>
        </div>

        {/* Shortcut table */}
        <div className="p-4">
          <table className="w-full text-sm">
            <tbody>
              {SHORTCUTS.map((s) => (
                <tr key={s.key} className="border-wood-100 dark:border-wood-800 border-b last:border-0">
                  <td className="py-1.5 pr-4 whitespace-nowrap">
                    <kbd className="bg-wood-100 dark:bg-wood-800 text-wood-700 dark:text-wood-200 rounded px-1.5 py-0.5 font-mono text-xs">
                      {s.key}
                    </kbd>
                  </td>
                  <td className="text-wood-600 dark:text-wood-300 py-1.5">
                    {s.descKey ? t(s.descKey) : isHe ? s.descHe : s.descEn}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
