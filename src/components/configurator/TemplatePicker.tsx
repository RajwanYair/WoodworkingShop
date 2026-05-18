import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TEMPLATES } from '../../engine/templates';
import { useCabinetStore } from '../../store/cabinet-store';
import { IconX } from '../layout/Icons';

interface TemplatePickerProps {
  onClose: () => void;
}

export function TemplatePicker({ onClose }: TemplatePickerProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'he';
  const setConfig = useCabinetStore((s) => s.setConfig);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus trap
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>('button:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (focusable.length > 0) focusable[0].focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleApply = (templateId: string) => {
    const tpl = TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    setConfig(tpl.config);
    // Reflect the template in the URL
    const url = new URL(window.location.href);
    url.searchParams.set('tpl', templateId);
    window.history.replaceState(null, '', url.pathname + '?' + url.searchParams.toString());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop — click outside to close */}
      <button
        type="button"
        className="absolute inset-0 bg-black/50 w-full h-full border-0 p-0 cursor-default"
        onClick={onClose}
        aria-label="Close dialog"
        tabIndex={-1}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tpl-title"
        className="relative bg-white dark:bg-wood-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col mx-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-wood-200 dark:border-wood-700">
          <div>
            <h2 id="tpl-title" className="text-lg font-bold text-wood-800 dark:text-wood-100">
              {t('templates.title')}
            </h2>
            <p className="text-xs text-wood-600 dark:text-wood-300 mt-0.5">{t('templates.subtitle')}</p>
          </div>
          <button
            onClick={onClose}
            className="text-wood-400 hover:text-wood-700 dark:hover:text-wood-200 flex items-center"
            aria-label="Close"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Grid */}
        <div className="overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => handleApply(tpl.id)}
              className="text-left p-3 rounded-lg border border-wood-200 dark:border-wood-700 hover:border-wood-500 dark:hover:border-wood-400 hover:bg-wood-50 dark:hover:bg-wood-700 transition-colors group"
            >
              <div className="font-semibold text-sm text-wood-800 dark:text-wood-100 group-hover:text-wood-600 dark:group-hover:text-wood-300 leading-tight mb-1">
                {tpl.name[lang]}
              </div>
              <div className="text-xs text-wood-600 dark:text-wood-300 leading-snug">{tpl.description[lang]}</div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-wood-200 dark:border-wood-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg bg-wood-100 dark:bg-wood-700 text-wood-700 dark:text-wood-200 hover:bg-wood-200 dark:hover:bg-wood-600 transition-colors"
          >
            {t('templates.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
