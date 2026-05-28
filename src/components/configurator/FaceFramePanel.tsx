/**
 * Sprint 221 — Face Frame Calculator Panel
 *
 * Shown in the Configurator tab below FinishCalculatorPanel.
 * Lets users enter cabinet dimensions and get a cut list for the face frame
 * (stiles + rails + opening dimensions) in real time.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateFaceFrame } from '../../engine/face-frame';

export function FaceFramePanel() {
  const { t } = useTranslation();

  const [widthMm, setWidthMm] = useState(600);
  const [heightMm, setHeightMm] = useState(720);
  const [stileWidthMm, setStileWidthMm] = useState(38);
  const [railWidthMm, setRailWidthMm] = useState(38);
  const [openingCount, setOpeningCount] = useState(1);

  const result = useMemo(() => {
    try {
      return {
        data: calculateFaceFrame({
          cabinetWidthMm: widthMm,
          cabinetHeightMm: heightMm,
          stileWidthMm,
          railWidthMm,
          openingCount,
        }),
        error: null,
      };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [widthMm, heightMm, stileWidthMm, railWidthMm, openingCount]);

  return (
    <section aria-label={t('faceFrame.title')} className="space-y-3">
      <h3 className="text-wood-700 dark:text-wood-200 text-sm font-semibold tracking-wide uppercase">
        🖼️ {t('faceFrame.title')}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Cabinet width */}
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('faceFrame.cabinetWidth')} (mm)</span>
          <input
            type="number"
            min={100}
            max={2400}
            value={widthMm}
            onChange={(e) => setWidthMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        {/* Cabinet height */}
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('faceFrame.cabinetHeight')} (mm)</span>
          <input
            type="number"
            min={100}
            max={2700}
            value={heightMm}
            onChange={(e) => setHeightMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        {/* Stile width */}
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('faceFrame.stileWidth')} (mm)</span>
          <input
            type="number"
            min={19}
            max={100}
            value={stileWidthMm}
            onChange={(e) => setStileWidthMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        {/* Rail width */}
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('faceFrame.railWidth')} (mm)</span>
          <input
            type="number"
            min={19}
            max={100}
            value={railWidthMm}
            onChange={(e) => setRailWidthMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>
      </div>

      {/* Opening count */}
      <label className="text-wood-600 dark:text-wood-300 flex items-center gap-3 text-sm">
        <span className="w-36 shrink-0">{t('faceFrame.openingCount')}</span>
        <input
          type="range"
          min={1}
          max={4}
          step={1}
          value={openingCount}
          onChange={(e) => setOpeningCount(Number(e.target.value))}
          aria-label={t('faceFrame.openingCount')}
          className="accent-wood-500 flex-1"
        />
        <span className="w-4 text-center font-mono">{openingCount}</span>
      </label>

      {/* Error */}
      {result.error && (
        <p className="rounded bg-red-50 p-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400" role="alert">
          {result.error}
        </p>
      )}

      {/* Results */}
      {result.data && (
        <div className="bg-wood-50 dark:bg-wood-800/60 space-y-2 rounded-lg p-3 text-sm" aria-live="polite">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="text-wood-600 dark:text-wood-300 flex justify-between">
              <span>{t('faceFrame.openingWidth')}</span>
              <span className="font-mono font-medium">{result.data.openingWidthMm.toFixed(1)} mm</span>
            </div>
            <div className="text-wood-600 dark:text-wood-300 flex justify-between">
              <span>{t('faceFrame.openingHeight')}</span>
              <span className="font-mono font-medium">{result.data.openingHeightMm.toFixed(1)} mm</span>
            </div>
            <div className="text-wood-600 dark:text-wood-300 flex justify-between">
              <span>{t('faceFrame.stileLength')}</span>
              <span className="font-mono font-medium">{result.data.stileLengthMm.toFixed(1)} mm</span>
            </div>
            <div className="text-wood-600 dark:text-wood-300 flex justify-between">
              <span>{t('faceFrame.topRailLength')}</span>
              <span className="font-mono font-medium">{result.data.railLengthMm.toFixed(1)} mm</span>
            </div>
            <div className="text-wood-600 dark:text-wood-300 col-span-2 flex justify-between">
              <span>{t('faceFrame.totalGlueSurface')}</span>
              <span className="font-mono font-medium">{(result.data.totalGlueSurfaceMm2 / 100).toFixed(0)} cm²</span>
            </div>
          </div>

          {/* Parts list */}
          <div className="border-wood-200 dark:border-wood-700 border-t pt-2">
            <p className="text-wood-600 dark:text-wood-400 mb-1.5 text-xs font-semibold tracking-wide uppercase">
              {t('faceFrame.partList')}
            </p>
            <ul className="space-y-1">
              {result.data.partList.map((part) => (
                <li key={part.label} className="text-wood-700 dark:text-wood-200 flex justify-between text-xs">
                  <span>
                    {part.qty}× {part.label}
                  </span>
                  <span className="font-mono">
                    {part.lengthMm.toFixed(1)} × {part.widthMm} mm
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
