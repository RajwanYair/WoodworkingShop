import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateDowelJoint, type JointOrientation } from '../../engine/dowel-joint';

const ORIENTATIONS: JointOrientation[] = ['edge_to_face', 'edge_to_edge', 'mitre'];
const ORIENTATION_LABELS: Record<JointOrientation, string> = {
  edge_to_face: 'edgeToFace',
  edge_to_edge: 'edgeToEdge',
  mitre: 'mitre',
};

export function DowelJointPanel() {
  const { t } = useTranslation();
  const [jointLengthMm, setJointLengthMm] = useState(600);
  const [boardThicknessMm, setBoardThicknessMm] = useState(18);
  const [orientation, setOrientation] = useState<JointOrientation>('edge_to_face');

  const result = useMemo(() => {
    try {
      return {
        data: calculateDowelJoint({ jointLengthMm, boardThicknessMm, orientation }),
        error: null,
      };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : String(error) };
    }
  }, [jointLengthMm, boardThicknessMm, orientation]);

  return (
    <section aria-label={t('dowelJoint.title')} className="space-y-3">
      <h3 className="text-wood-700 dark:text-wood-200 text-sm font-semibold">{t('dowelJoint.title')}</h3>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('dowelJoint.jointLength')} (mm)</span>
          <input
            type="number"
            min="1"
            value={jointLengthMm}
            onChange={(event) => setJointLengthMm(Number(event.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 rounded border px-2 py-1 font-mono text-sm"
          />
        </label>
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('dowelJoint.boardThickness')} (mm)</span>
          <input
            type="number"
            min="1"
            value={boardThicknessMm}
            onChange={(event) => setBoardThicknessMm(Number(event.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 rounded border px-2 py-1 font-mono text-sm"
          />
        </label>
        <label className="text-wood-600 dark:text-wood-300 col-span-2 flex flex-col gap-1 text-sm">
          <span>{t('dowelJoint.orientation')}</span>
          <select
            value={orientation}
            onChange={(event) => setOrientation(event.target.value as JointOrientation)}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 rounded border px-2 py-1 text-sm"
          >
            {ORIENTATIONS.map((option) => (
              <option key={option} value={option}>
                {t(`dowelJoint.${ORIENTATION_LABELS[option]}`)}
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
          <dt className="text-wood-500 dark:text-wood-400">{t('dowelJoint.diameter')}</dt>
          <dd className="font-mono">{result.data.dowelDiameterMm} mm</dd>
          <dt className="text-wood-500 dark:text-wood-400">{t('dowelJoint.count')}</dt>
          <dd className="font-mono">{result.data.count}</dd>
          <dt className="text-wood-500 dark:text-wood-400">{t('dowelJoint.spacing')}</dt>
          <dd className="font-mono">{result.data.spacingMm} mm</dd>
          <dt className="text-wood-500 dark:text-wood-400">{t('dowelJoint.depth')}</dt>
          <dd className="font-mono">{result.data.drillDepthMm} mm</dd>
          <dt className="text-wood-500 dark:text-wood-400">{t('dowelJoint.clampTime')}</dt>
          <dd className="font-mono">{result.data.clampTimeMin} min</dd>
          <dt className="text-wood-500 dark:text-wood-400">{t('dowelJoint.positions')}</dt>
          <dd className="font-mono">{result.data.positions.map(({ offsetMm }) => offsetMm).join(', ')} mm</dd>
        </dl>
      )}
    </section>
  );
}
