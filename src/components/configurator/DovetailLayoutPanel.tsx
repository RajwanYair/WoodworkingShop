import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateDovetailLayout, type DovetailStyle, type DovetailType } from '../../engine/dovetail-layout';

const JOINT_TYPES: DovetailType[] = ['through', 'half_blind'];
const CUT_STYLES: DovetailStyle[] = ['hand_cut', 'machine_cut'];

export function DovetailLayoutPanel() {
  const { t } = useTranslation();
  const [boardWidthMm, setBoardWidthMm] = useState(250);
  const [boardThicknessMm, setBoardThicknessMm] = useState(18);
  const [tailCount, setTailCount] = useState(4);
  const [angleDegrees, setAngleDegrees] = useState(8);
  const [jointType, setJointType] = useState<DovetailType>('through');
  const [style, setStyle] = useState<DovetailStyle>('hand_cut');

  const result = useMemo(() => {
    try {
      return {
        data: calculateDovetailLayout({ boardWidthMm, boardThicknessMm, tailCount, angleDegrees, jointType, style }),
        error: null,
      };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : String(error) };
    }
  }, [boardWidthMm, boardThicknessMm, tailCount, angleDegrees, jointType, style]);

  return (
    <section aria-label={t('dovetailLayout.title')} className="space-y-3">
      <h3 className="text-wood-700 dark:text-wood-200 text-sm font-semibold">{t('dovetailLayout.title')}</h3>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('dovetailLayout.boardWidth')} (mm)</span>
          <input
            type="number"
            min="1"
            value={boardWidthMm}
            onChange={(event) => setBoardWidthMm(Number(event.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 rounded border px-2 py-1 font-mono text-sm"
          />
        </label>
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('dovetailLayout.boardThickness')} (mm)</span>
          <input
            type="number"
            min="1"
            value={boardThicknessMm}
            onChange={(event) => setBoardThicknessMm(Number(event.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 rounded border px-2 py-1 font-mono text-sm"
          />
        </label>
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('dovetailLayout.tailCount')}</span>
          <input
            type="number"
            min="1"
            step="1"
            value={tailCount}
            onChange={(event) => setTailCount(Number(event.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 rounded border px-2 py-1 font-mono text-sm"
          />
        </label>
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('dovetailLayout.angle')} (°)</span>
          <input
            type="number"
            min="5"
            max="20"
            value={angleDegrees}
            onChange={(event) => setAngleDegrees(Number(event.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 rounded border px-2 py-1 font-mono text-sm"
          />
        </label>
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('dovetailLayout.jointType')}</span>
          <select
            value={jointType}
            onChange={(event) => setJointType(event.target.value as DovetailType)}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 rounded border px-2 py-1 text-sm"
          >
            {JOINT_TYPES.map((option) => (
              <option key={option} value={option}>
                {t(`dovetailLayout.${option === 'half_blind' ? 'halfBlind' : option}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('dovetailLayout.style')}</span>
          <select
            value={style}
            onChange={(event) => setStyle(event.target.value as DovetailStyle)}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 rounded border px-2 py-1 text-sm"
          >
            {CUT_STYLES.map((option) => (
              <option key={option} value={option}>
                {t(`dovetailLayout.${option === 'hand_cut' ? 'handCut' : 'machineCut'}`)}
              </option>
            ))}
          </select>
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
          className="bg-wood-50 dark:bg-wood-800 grid grid-cols-2 gap-x-4 gap-y-1 rounded-md p-3 text-sm"
        >
          <dt className="text-wood-500 dark:text-wood-400">{t('dovetailLayout.slopeRatio')}</dt>
          <dd className="font-mono">{result.data.slopeRatio}</dd>
          <dt className="text-wood-500 dark:text-wood-400">{t('dovetailLayout.tailCount')}</dt>
          <dd className="font-mono">{result.data.tailCount}</dd>
          <dt className="text-wood-500 dark:text-wood-400">{t('dovetailLayout.pinWidth')}</dt>
          <dd className="font-mono">{result.data.pins[1]?.widthMm ?? 0} mm</dd>
          <dt className="text-wood-500 dark:text-wood-400">{t('dovetailLayout.tailWidth')}</dt>
          <dd className="font-mono">{result.data.tails[0]?.narrowWidthMm ?? 0} mm</dd>
          <dt className="text-wood-500 dark:text-wood-400">{t('dovetailLayout.socketDepth')}</dt>
          <dd className="font-mono">{result.data.socketDepthMm} mm</dd>
        </dl>
      )}
    </section>
  );
}
