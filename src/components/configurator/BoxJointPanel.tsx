/**
 * Sprint 232 — Box Joint Calculator Panel
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateBoxJoint } from '../../engine/box-joint';

export function BoxJointPanel() {
  const { t } = useTranslation();

  const [boardWidthMm, setBoardWidthMm] = useState(150);
  const [fingerWidthMm, setFingerWidthMm] = useState(12);
  const [depthMm, setDepthMm] = useState(18);

  const result = useMemo(() => {
    try {
      return {
        data: calculateBoxJoint({ boardWidthMm, fingerWidthMm, depthMm }),
        error: null,
      };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [boardWidthMm, fingerWidthMm, depthMm]);

  return (
    <section aria-label={t('boxJoint.title')} className="space-y-3">
      <h3 className="text-wood-700 dark:text-wood-200 text-sm font-semibold tracking-wide uppercase">
        🔲 {t('boxJoint.title')}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('boxJoint.boardWidth')} (mm)</span>
          <input
            type="number"
            min={30}
            max={600}
            step={5}
            value={boardWidthMm}
            onChange={(e) => setBoardWidthMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('boxJoint.fingerWidth')} (mm)</span>
          <input
            type="number"
            min={3}
            max={50}
            step={1}
            value={fingerWidthMm}
            onChange={(e) => setFingerWidthMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 col-span-2 flex flex-col gap-1 text-sm">
          <span>{t('boxJoint.depth')} (mm)</span>
          <input
            type="number"
            min={6}
            max={50}
            step={1}
            value={depthMm}
            onChange={(e) => setDepthMm(Number(e.target.value))}
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
          <dt className="text-wood-500 dark:text-wood-400">{t('boxJoint.fingerCount')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">{result.data.fingerCount}</dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('boxJoint.actualFingerWidth')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.actualFingerWidthMm} mm
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('boxJoint.socketCount')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">{result.data.socketCount}</dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('boxJoint.glueSurface')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">{result.data.glueSurfaceMm2} mm²</dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('boxJoint.edgeWaste')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">{result.data.edgeWasteMm} mm</dd>
        </dl>
      )}
    </section>
  );
}
