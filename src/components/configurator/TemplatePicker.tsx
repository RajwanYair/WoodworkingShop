import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { TEMPLATES } from '../../engine/templates';
import type { CabinetTemplate } from '../../engine/templates';
import { useCabinetStore } from '../../store/cabinet-store';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { IconX } from '../layout/Icons';

/** 80×60 schematic front-face SVG for a template card.
 *  Draws: outer carcass, optional toe-kick, door divider or shelves, handle dots. */
function TemplateThumbnail({ tpl }: { tpl: CabinetTemplate }) {
  const { config } = tpl;
  const maxW = config.width;
  const maxH = config.height;
  // Scale so the larger dimension fits in 70 px (leaving 5 px margin each side).
  const scale = 70 / Math.max(maxW, maxH);
  const w = maxW * scale;
  const h = maxH * scale;
  const ox = (80 - w) / 2;
  const oy = (60 - h) / 2;
  const T = 2; // wall thickness in px
  const kick = Math.round((config.kickHeight ?? 0) * scale);
  const hasDoors = config.doorStyle !== 'none' && config.doorCount > 0;
  const doorCount = config.doorCount ?? 1;
  const doorMidX = ox + w / 2;

  return (
    <svg viewBox="0 0 80 60" aria-hidden="true" className="text-wood-700 dark:text-wood-200 h-15 w-20 shrink-0">
      {/* Carcass outline */}
      <rect x={ox} y={oy} width={w} height={h} fill="none" stroke="currentColor" strokeWidth={T} rx={1} />
      {/* Toe kick — lighter fill at bottom */}
      {kick > 0 && (
        <rect x={ox + T * 2} y={oy + h - kick} width={w - T * 4} height={kick} fill="currentColor" opacity={0.15} />
      )}
      {/* Door divider (for 2-door) or shelves */}
      {hasDoors ? (
        <>
          {doorCount === 2 && (
            <line
              x1={doorMidX}
              y1={oy + T}
              x2={doorMidX}
              y2={oy + h - kick - T}
              stroke="currentColor"
              strokeWidth={0.8}
              opacity={0.5}
            />
          )}
          {/* Handle dot(s) */}
          {doorCount === 2 ? (
            <>
              <circle cx={doorMidX - w * 0.15} cy={oy + h * 0.55} r={1.5} fill="currentColor" opacity={0.7} />
              <circle cx={doorMidX + w * 0.15} cy={oy + h * 0.55} r={1.5} fill="currentColor" opacity={0.7} />
            </>
          ) : (
            <circle cx={ox + w * 0.65} cy={oy + h * 0.5} r={1.5} fill="currentColor" opacity={0.7} />
          )}
        </>
      ) : (
        /* Shelf lines */
        Array.from({ length: Math.max(1, config.shelfCount) }, (_, i) => {
          const shelfY = oy + T + ((h - 2 * T - kick) / (config.shelfCount + 1)) * (i + 1);
          return (
            <line
              key={i}
              x1={ox + T}
              y1={shelfY}
              x2={ox + w - T}
              y2={shelfY}
              stroke="currentColor"
              strokeWidth={0.8}
              opacity={0.5}
            />
          );
        })
      )}
    </svg>
  );
}

interface TemplatePickerProps {
  onClose: () => void;
}

export function TemplatePicker({ onClose }: TemplatePickerProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'he';
  const setConfig = useCabinetStore((s) => s.setConfig);
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(dialogRef, true, onClose);

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
        className="absolute inset-0 h-full w-full cursor-default border-0 bg-black/50 p-0"
        onClick={onClose}
        aria-label="Close dialog"
        tabIndex={-1}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tpl-title"
        className="dark:bg-wood-800 relative mx-4 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="border-wood-200 dark:border-wood-700 flex items-center justify-between border-b p-4">
          <div>
            <h2 id="tpl-title" className="text-wood-800 dark:text-wood-100 text-lg font-bold">
              {t('templates.title')}
            </h2>
            <p className="text-wood-600 dark:text-wood-300 mt-0.5 text-xs">{t('templates.subtitle')}</p>
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
        <div className="grid grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-3">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => handleApply(tpl.id)}
              className="border-wood-200 dark:border-wood-700 hover:border-wood-500 dark:hover:border-wood-400 hover:bg-wood-50 dark:hover:bg-wood-700 group flex flex-col items-center gap-2 rounded-lg border p-3 text-left transition-colors"
            >
              <TemplateThumbnail tpl={tpl} />
              <div className="w-full">
                <div className="text-wood-800 dark:text-wood-100 group-hover:text-wood-600 dark:group-hover:text-wood-300 mb-0.5 text-center text-xs leading-tight font-semibold">
                  {tpl.name[lang]}
                </div>
                <div className="text-wood-500 dark:text-wood-400 line-clamp-2 text-center text-xs leading-snug">
                  {tpl.description[lang]}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="border-wood-200 dark:border-wood-700 flex justify-end border-t p-4">
          <button
            onClick={onClose}
            className="bg-wood-100 dark:bg-wood-700 text-wood-700 dark:text-wood-200 hover:bg-wood-200 dark:hover:bg-wood-600 rounded-lg px-4 py-2 text-sm transition-colors"
          >
            {t('templates.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
