/**
 * Sprint 246 — Spline Joint Calculator Panel
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatMillimeters, formatNumber } from '../../i18n/format';
import { calculateSplineJoint } from '../../engine/spline-joint';

export function SplineJointPanel() {
  const { t, i18n } = useTranslation();

  const [boardThicknessMm, setBoardThicknessMm] = useState(19);
  const [splineThicknessMm, setSplineThicknessMm] = useState(3);
  const [slotDepthPerBoardMm, setSlotDepthPerBoardMm] = useState(6);
  const [jointLengthMm, setJointLengthMm] = useState(120);
  const [splineCount, setSplineCount] = useState(2);

  const result = useMemo(() => {
    try {
      return {
        data: calculateSplineJoint({
          boardThicknessMm,
          splineThicknessMm,
          slotDepthPerBoardMm,
          jointLengthMm,
          splineCount,
        }),
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }, [boardThicknessMm, splineThicknessMm, slotDepthPerBoardMm, jointLengthMm, splineCount]);

  return (
    <section aria-label={t('splineJoint.title')} className="space-y-3">
      <h3 className="text-wood-700 dark:text-wood-200 text-sm font-semibold tracking-wide uppercase">
        {t('splineJoint.title')}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('splineJoint.boardThickness')} (mm)</span>
          <input
            type="number"
            min={1}
            max={100}
            step={0.5}
            value={boardThicknessMm}
            onChange={(event) => setBoardThicknessMm(Number(event.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-accent rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('splineJoint.splineThickness')} (mm)</span>
          <input
            type="number"
            min={0.5}
            max={20}
            step={0.1}
            value={splineThicknessMm}
            onChange={(event) => setSplineThicknessMm(Number(event.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-accent rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('splineJoint.slotDepthPerBoard')} (mm)</span>
          <input
            type="number"
            min={0.5}
            max={40}
            step={0.1}
            value={slotDepthPerBoardMm}
            onChange={(event) => setSlotDepthPerBoardMm(Number(event.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-accent rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('splineJoint.jointLength')} (mm)</span>
          <input
            type="number"
            min={1}
            max={3000}
            step={1}
            value={jointLengthMm}
            onChange={(event) => setJointLengthMm(Number(event.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-accent rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('splineJoint.splineCount')}</span>
          <input
            type="number"
            min={1}
            max={20}
            step={1}
            value={splineCount}
            onChange={(event) => setSplineCount(Number(event.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-accent rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>
      </div>

      {result.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {result.error}
        </p>
      )}

      {result.data && (
        <dl className="bg-wood-50 dark:bg-wood-900/40 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg p-3 text-sm">
          <dt className="text-wood-500 dark:text-wood-400">{t('splineJoint.recommendedSlotWidth')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {formatMillimeters(result.data.recommendedSlotWidthMm, i18n.language, 2)}
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('splineJoint.totalInsertionDepth')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {formatMillimeters(result.data.totalInsertionDepthMm, i18n.language, 2)}
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('splineJoint.remainingWallThickness')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {formatMillimeters(result.data.remainingWallThicknessMm, i18n.language, 2)}
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('splineJoint.totalSplineLength')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {formatMillimeters(result.data.totalSplineLengthMm, i18n.language, 1)}
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('splineJoint.glueAreaPerSpline')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {formatNumber(result.data.glueAreaPerSplineMm2, i18n.language, { maximumFractionDigits: 0 })} mm²
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('splineJoint.totalGlueArea')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {formatNumber(result.data.totalGlueAreaMm2, i18n.language, { maximumFractionDigits: 0 })} mm²
          </dd>
        </dl>
      )}
    </section>
  );
}
