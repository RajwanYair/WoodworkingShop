/**
 * Sprint 229 — Frame and Panel Calculator Panel
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateFramePanel } from '../../engine/frame-panel';

export function FramePanelCalcPanel() {
  const { t } = useTranslation();

  const [frameWidthMm, setFrameWidthMm] = useState(600);
  const [frameHeightMm, setFrameHeightMm] = useState(900);
  const [stileWidthMm, setStileWidthMm] = useState(60);
  const [railWidthMm, setRailWidthMm] = useState(70);
  const [grooveDepthMm, setGrooveDepthMm] = useState(9.5);
  const [panelFloatMm, setPanelFloatMm] = useState(3);

  const result = useMemo(() => {
    try {
      return {
        data: calculateFramePanel({
          frameWidthMm,
          frameHeightMm,
          stileWidthMm,
          railWidthMm,
          grooveDepthMm,
          panelFloatMm,
        }),
        error: null,
      };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [frameWidthMm, frameHeightMm, stileWidthMm, railWidthMm, grooveDepthMm, panelFloatMm]);

  return (
    <section aria-label={t('framePanel.title')} className="space-y-3">
      <h3 className="text-wood-700 dark:text-wood-200 text-sm font-semibold tracking-wide uppercase">
        🪟 {t('framePanel.title')}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('framePanel.frameWidth')} (mm)</span>
          <input
            type="number"
            min={100}
            max={2400}
            step={10}
            value={frameWidthMm}
            onChange={(e) => setFrameWidthMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('framePanel.frameHeight')} (mm)</span>
          <input
            type="number"
            min={100}
            max={3000}
            step={10}
            value={frameHeightMm}
            onChange={(e) => setFrameHeightMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('framePanel.stileWidth')} (mm)</span>
          <input
            type="number"
            min={20}
            max={200}
            step={5}
            value={stileWidthMm}
            onChange={(e) => setStileWidthMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('framePanel.railWidth')} (mm)</span>
          <input
            type="number"
            min={20}
            max={200}
            step={5}
            value={railWidthMm}
            onChange={(e) => setRailWidthMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('framePanel.grooveDepth')} (mm)</span>
          <input
            type="number"
            min={6}
            max={20}
            step={0.5}
            value={grooveDepthMm}
            onChange={(e) => setGrooveDepthMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('framePanel.panelFloat')} (mm)</span>
          <input
            type="number"
            min={1}
            max={10}
            step={0.5}
            value={panelFloatMm}
            onChange={(e) => setPanelFloatMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>
      </div>

      {result.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {result.error}
        </p>
      )}

      {result.data && (
        <dl
          aria-live="polite"
          aria-label={t('framePanel.title')}
          className="bg-wood-50 dark:bg-wood-800 grid grid-cols-2 gap-x-4 gap-y-1 rounded-md p-3 text-sm"
        >
          <dt className="text-wood-500 dark:text-wood-400">{t('framePanel.panelWidth')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.panelWidthMm.toFixed(1)} mm
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('framePanel.panelHeight')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.panelHeightMm.toFixed(1)} mm
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('framePanel.expansionAllowance')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono">
            W: {result.data.widthFloatMm} mm · H: {result.data.heightFloatMm} mm
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('framePanel.grooveDepth')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono">{result.data.grooveDepthMm} mm</dd>
        </dl>
      )}
    </section>
  );
}
