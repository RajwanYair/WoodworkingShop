import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface ShortcutsModalProps {
  onClose: () => void;
}

const SHORTCUTS = [
  { key: 'Alt + 1', descEn: 'Configurator tab', descHe: 'לשונית קונפיגורטור' },
  { key: 'Alt + 2', descEn: 'Preview tab', descHe: 'לשונית תצוגה מקדימה' },
  { key: 'Alt + 3', descEn: 'Optimizer tab', descHe: 'לשונית אופטימיזציה' },
  { key: 'Alt + 4', descEn: 'Assembly tab', descHe: 'לשונית הרכבה' },
  { key: 'Alt + 5', descEn: 'PDF tab', descHe: 'לשונית PDF' },
  { key: 'Ctrl + Z', descEn: 'Undo', descHe: 'בטל' },
  { key: 'Ctrl + Y', descEn: 'Redo', descHe: 'בצע שוב' },
  { key: 'Ctrl + Shift + Z', descEn: 'Redo (alternate)', descHe: 'בצע שוב (חלופי)' },
  { key: 'Ctrl + P', descEn: 'Print', descHe: 'הדפס' },
  { key: '?', descEn: 'Show / hide this panel', descHe: 'הצג / הסתר לוח זה' },
  { key: 'Escape', descEn: 'Close this panel', descHe: 'סגור לוח זה' },
];

export function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  const { i18n } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const isHe = i18n.language === 'he';

  /* Close on Escape */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  /* Trap focus inside dialog */
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label={isHe ? 'קיצורי מקלדת' : 'Keyboard Shortcuts'}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative bg-white dark:bg-wood-900 rounded-xl shadow-2xl w-full max-w-sm mx-4 outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-wood-200 dark:border-wood-700">
          <h2 className="text-base font-semibold text-wood-800 dark:text-wood-100">
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
                <tr
                  key={s.key}
                  className="border-b border-wood-100 dark:border-wood-800 last:border-0"
                >
                  <td className="py-1.5 pr-4 whitespace-nowrap">
                    <kbd className="font-mono bg-wood-100 dark:bg-wood-800 text-wood-700 dark:text-wood-200 px-1.5 py-0.5 rounded text-xs">
                      {s.key}
                    </kbd>
                  </td>
                  <td className="py-1.5 text-wood-600 dark:text-wood-300">
                    {isHe ? s.descHe : s.descEn}
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
