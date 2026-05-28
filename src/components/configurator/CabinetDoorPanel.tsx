/**
 * Sprint 222 — Cabinet Door Sizing Calculator Panel
 *
 * Shown in the Configurator tab. Calculates door leaf dimensions,
 * hinge count, and advisory notes from an opening size and overlay style.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateCabinetDoor, type DoorOverlay } from '../../engine/cabinet-door';

const OVERLAY_OPTIONS: DoorOverlay[] = ['full', 'half', 'inset'];

export function CabinetDoorPanel() {
  const { t } = useTranslation();

  const [openingWidthMm, setOpeningWidthMm] = useState(550);
  const [openingHeightMm, setOpeningHeightMm] = useState(700);
  const [doorCount, setDoorCount] = useState<1 | 2>(1);
  const [overlay, setOverlay] = useState<DoorOverlay>('full');

  const result = useMemo(() => {
    try {
      return {
        data: calculateCabinetDoor({ openingWidthMm, openingHeightMm, doorCount, overlay }),
        error: null,
      };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [openingWidthMm, openingHeightMm, doorCount, overlay]);

  return (
    <section aria-label={t('cabinetDoor.title')} className="space-y-3">
      <h3 className="text-wood-700 dark:text-wood-200 text-sm font-semibold tracking-wide uppercase">
        🚪 {t('cabinetDoor.title')}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Opening width */}
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('cabinetDoor.openingWidth')} (mm)</span>
          <input
            type="number"
            min={100}
            max={1800}
            value={openingWidthMm}
            onChange={(e) => setOpeningWidthMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        {/* Opening height */}
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('cabinetDoor.openingHeight')} (mm)</span>
          <input
            type="number"
            min={100}
            max={2700}
            value={openingHeightMm}
            onChange={(e) => setOpeningHeightMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>
      </div>

      {/* Overlay style */}
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('cabinetDoor.overlay')}>
        {OVERLAY_OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => setOverlay(opt)}
            aria-pressed={overlay === opt}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              overlay === opt
                ? 'bg-wood-600 text-white'
                : 'bg-wood-100 dark:bg-wood-800 text-wood-600 dark:text-wood-300 hover:bg-wood-200 dark:hover:bg-wood-700'
            }`}
          >
            {t(`cabinetDoor.${opt}`)}
          </button>
        ))}
      </div>

      {/* Door count */}
      <div className="flex gap-3" role="group" aria-label={t('cabinetDoor.doorCount')}>
        {([1, 2] as const).map((n) => (
          <button
            key={n}
            onClick={() => setDoorCount(n)}
            aria-pressed={doorCount === n}
            className={`flex-1 rounded border py-1.5 text-sm font-medium transition-colors ${
              doorCount === n
                ? 'bg-wood-600 border-wood-500 text-white'
                : 'bg-wood-50 dark:bg-wood-800 border-wood-200 dark:border-wood-700 text-wood-600 dark:text-wood-300 hover:bg-wood-100'
            }`}
          >
            {n === 1 ? '1 door' : '2 doors'}
          </button>
        ))}
      </div>

      {/* Error */}
      {result.error && (
        <p className="rounded bg-red-50 p-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400" role="alert">
          {result.error}
        </p>
      )}

      {/* Results */}
      {result.data && (
        <div className="bg-wood-50 dark:bg-wood-800/60 space-y-2 rounded-lg p-3 text-sm" aria-live="polite">
          <div className="space-y-1">
            <div className="text-wood-600 dark:text-wood-300 flex justify-between">
              <span>{t('cabinetDoor.leafWidth')}</span>
              <span className="font-mono font-medium">{result.data.doorLeaf.widthMm.toFixed(1)} mm</span>
            </div>
            <div className="text-wood-600 dark:text-wood-300 flex justify-between">
              <span>{t('cabinetDoor.leafHeight')}</span>
              <span className="font-mono font-medium">{result.data.doorLeaf.heightMm.toFixed(1)} mm</span>
            </div>
            <div className="text-wood-600 dark:text-wood-300 flex justify-between">
              <span>{t('cabinetDoor.hingeCount')}</span>
              <span className="font-mono font-medium">{result.data.hingeCount}</span>
            </div>
          </div>

          {/* Advisory notes */}
          {result.data.notes.length > 0 && (
            <ul className="border-wood-200 dark:border-wood-700 space-y-0.5 border-t pt-2">
              {result.data.notes.map((noteKey) => (
                <li key={noteKey} className="text-xs text-amber-600 dark:text-amber-400">
                  ⚠ {t(`cabinetDoor.${noteKey}`)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
