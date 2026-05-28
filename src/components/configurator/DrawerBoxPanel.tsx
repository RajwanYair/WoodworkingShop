/**
 * Sprint 223 — Drawer Box Sizing Calculator Panel
 *
 * Shown in the Configurator tab. Calculates drawer box dimensions
 * from cabinet opening, slide type, and material thickness.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateDrawerBox, type DrawerSlideType } from '../../engine/drawer-box';

const SLIDE_TYPES: DrawerSlideType[] = ['side', 'bottom', 'center'];

export function DrawerBoxPanel() {
  const { t } = useTranslation();

  const [openingWidthMm, setOpeningWidthMm] = useState(500);
  const [openingHeightMm, setOpeningHeightMm] = useState(150);
  const [openingDepthMm, setOpeningDepthMm] = useState(550);
  const [slideType, setSlideType] = useState<DrawerSlideType>('side');
  const [sideThicknessMm, setSideThicknessMm] = useState(12);

  const result = useMemo(() => {
    try {
      return {
        data: calculateDrawerBox({ openingWidthMm, openingHeightMm, openingDepthMm, slideType, sideThicknessMm }),
        error: null,
      };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [openingWidthMm, openingHeightMm, openingDepthMm, slideType, sideThicknessMm]);

  return (
    <section aria-label={t('drawerBox.title')} className="space-y-3">
      <h3 className="text-wood-700 dark:text-wood-200 text-sm font-semibold tracking-wide uppercase">
        🗂️ {t('drawerBox.title')}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Opening width */}
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('drawerBox.openingWidth')} (mm)</span>
          <input
            type="number"
            min={100}
            max={1200}
            value={openingWidthMm}
            onChange={(e) => setOpeningWidthMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        {/* Opening height */}
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('drawerBox.openingHeight')} (mm)</span>
          <input
            type="number"
            min={50}
            max={600}
            value={openingHeightMm}
            onChange={(e) => setOpeningHeightMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        {/* Cabinet depth */}
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('drawerBox.openingDepth')} (mm)</span>
          <input
            type="number"
            min={100}
            max={900}
            value={openingDepthMm}
            onChange={(e) => setOpeningDepthMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        {/* Side thickness */}
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('drawerBox.sideThickness')} (mm)</span>
          <input
            type="number"
            min={6}
            max={25}
            value={sideThicknessMm}
            onChange={(e) => setSideThicknessMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>
      </div>

      {/* Slide type */}
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('drawerBox.slideType')}>
        {SLIDE_TYPES.map((st) => (
          <button
            key={st}
            onClick={() => setSlideType(st)}
            aria-pressed={slideType === st}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              slideType === st
                ? 'bg-wood-600 text-white'
                : 'bg-wood-100 dark:bg-wood-800 text-wood-600 dark:text-wood-300 hover:bg-wood-200 dark:hover:bg-wood-700'
            }`}
          >
            {t(`drawerBox.${st}`)}
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
        <div className="bg-wood-50 dark:bg-wood-800/60 space-y-1.5 rounded-lg p-3 text-sm" aria-live="polite">
          <div className="text-wood-600 dark:text-wood-300 flex justify-between">
            <span>{t('drawerBox.boxWidth')}</span>
            <span className="font-mono font-medium">{result.data.boxWidthMm.toFixed(1)} mm</span>
          </div>
          <div className="text-wood-600 dark:text-wood-300 flex justify-between">
            <span>{t('drawerBox.boxHeight')}</span>
            <span className="font-mono font-medium">{result.data.boxHeightMm.toFixed(1)} mm</span>
          </div>
          <div className="text-wood-600 dark:text-wood-300 flex justify-between">
            <span>{t('drawerBox.boxDepth')}</span>
            <span className="font-mono font-medium">{result.data.boxDepthMm.toFixed(1)} mm</span>
          </div>
          <div className="border-wood-200 dark:border-wood-700 border-t pt-1.5">
            <div className="text-wood-600 dark:text-wood-300 flex justify-between">
              <span>{t('drawerBox.falseFrontWidth')}</span>
              <span className="font-mono font-medium">{result.data.falseFrontWidthMm.toFixed(1)} mm</span>
            </div>
            <div className="text-wood-600 dark:text-wood-300 flex justify-between">
              <span>{t('drawerBox.falseFrontHeight')}</span>
              <span className="font-mono font-medium">{result.data.falseFrontHeightMm.toFixed(1)} mm</span>
            </div>
          </div>
          {result.data.noteKey && (
            <p className="pt-1 text-xs text-amber-600 dark:text-amber-400">⚠ {t(`drawerBox.${result.data.noteKey}`)}</p>
          )}
        </div>
      )}
    </section>
  );
}
