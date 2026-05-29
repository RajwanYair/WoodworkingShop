/**
 * Sprint 235 — Lumber Planer Pass Calculator Panel
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculatePlanerPasses } from '../../engine/planer-passes';

export function PlanerPassesPanel() {
  const { t } = useTranslation();

  const [initialThicknessMm, setInitialThicknessMm] = useState(50);
  const [targetThicknessMm, setTargetThicknessMm] = useState(45);
  const [maxPassDepthMm, setMaxPassDepthMm] = useState(1.5);
  const [boardLengthMm, setBoardLengthMm] = useState(1000);
  const [snipeLengthMm, setSnipeLengthMm] = useState(50);

  const result = useMemo(() => {
    try {
      return {
        data: calculatePlanerPasses({
          initialThicknessMm,
          targetThicknessMm,
          maxPassDepthMm,
          boardLengthMm,
          snipeLengthMm,
        }),
        error: null,
      };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [initialThicknessMm, targetThicknessMm, maxPassDepthMm, boardLengthMm, snipeLengthMm]);

  return (
    <section aria-label={t('planerPasses.title')} className="space-y-3">
      <h3 className="text-wood-700 dark:text-wood-200 text-sm font-semibold tracking-wide uppercase">
        🪵 {t('planerPasses.title')}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('planerPasses.initialThickness')} (mm)</span>
          <input
            type="number"
            min={6}
            max={200}
            step={1}
            value={initialThicknessMm}
            onChange={(e) => setInitialThicknessMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('planerPasses.targetThickness')} (mm)</span>
          <input
            type="number"
            min={1}
            max={199}
            step={1}
            value={targetThicknessMm}
            onChange={(e) => setTargetThicknessMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('planerPasses.maxPassDepth')} (mm)</span>
          <input
            type="number"
            min={0.5}
            max={3}
            step={0.5}
            value={maxPassDepthMm}
            onChange={(e) => setMaxPassDepthMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('planerPasses.snipeLength')} (mm)</span>
          <input
            type="number"
            min={0}
            max={150}
            step={5}
            value={snipeLengthMm}
            onChange={(e) => setSnipeLengthMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 col-span-2 flex flex-col gap-1 text-sm">
          <span>{t('planerPasses.boardLength')} (mm)</span>
          <input
            type="number"
            min={100}
            max={6000}
            step={50}
            value={boardLengthMm}
            onChange={(e) => setBoardLengthMm(Number(e.target.value))}
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
        <dl className="bg-wood-50 dark:bg-wood-900 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg p-3 text-sm">
          <dt className="text-wood-500 dark:text-wood-400">{t('planerPasses.passCount')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">{result.data.passCount}</dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('planerPasses.depthPerPass')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">{result.data.depthPerPassMm} mm</dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('planerPasses.totalRemoval')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">{result.data.totalRemovalMm} mm</dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('planerPasses.snipeAllowance')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.snipeAllowanceMm} mm
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('planerPasses.effectiveLength')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.effectiveLengthMm} mm
          </dd>
        </dl>
      )}
    </section>
  );
}
