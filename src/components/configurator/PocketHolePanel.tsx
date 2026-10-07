import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculatePocketHole, type JointType, type MaterialHardness } from '../../engine/pocket-hole';

const MATERIALS: MaterialHardness[] = ['softwood', 'hardwood', 'plywood', 'mdf'];
const JOINT_TYPES: JointType[] = ['butt', 'mitre', 'edge'];

export function PocketHolePanel() {
  const { t } = useTranslation();
  const [workpieceThicknessMm, setWorkpieceThicknessMm] = useState(18);
  const [matingThicknessMm, setMatingThicknessMm] = useState(18);
  const [jointLengthMm, setJointLengthMm] = useState(600);
  const [materialHardness, setMaterialHardness] = useState<MaterialHardness>('plywood');
  const [jointType, setJointType] = useState<JointType>('butt');

  const result = useMemo(() => {
    try {
      return {
        data: calculatePocketHole({
          workpieceThicknessMm,
          matingThicknessMm,
          jointLengthMm,
          materialHardness,
          jointType,
        }),
        error: null,
      };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : String(error) };
    }
  }, [workpieceThicknessMm, matingThicknessMm, jointLengthMm, materialHardness, jointType]);

  return (
    <section aria-label={t('pocketHole.title')} className="space-y-3">
      <h3 className="text-wood-700 dark:text-wood-200 text-sm font-semibold">{t('pocketHole.title')}</h3>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('pocketHole.workpieceThickness')} (mm)</span>
          <input
            type="number"
            min="1"
            value={workpieceThicknessMm}
            onChange={(event) => setWorkpieceThicknessMm(Number(event.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 rounded border px-2 py-1 font-mono text-sm"
          />
        </label>
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('pocketHole.matingThickness')} (mm)</span>
          <input
            type="number"
            min="1"
            value={matingThicknessMm}
            onChange={(event) => setMatingThicknessMm(Number(event.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 rounded border px-2 py-1 font-mono text-sm"
          />
        </label>
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('pocketHole.jointLength')} (mm)</span>
          <input
            type="number"
            min="1"
            value={jointLengthMm}
            onChange={(event) => setJointLengthMm(Number(event.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 rounded border px-2 py-1 font-mono text-sm"
          />
        </label>
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('pocketHole.material')}</span>
          <select
            value={materialHardness}
            onChange={(event) => setMaterialHardness(event.target.value as MaterialHardness)}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 rounded border px-2 py-1 text-sm"
          >
            {MATERIALS.map((option) => (
              <option key={option} value={option}>
                {t(`pocketHole.${option}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-wood-600 dark:text-wood-300 col-span-2 flex flex-col gap-1 text-sm">
          <span>{t('pocketHole.jointType')}</span>
          <select
            value={jointType}
            onChange={(event) => setJointType(event.target.value as JointType)}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 rounded border px-2 py-1 text-sm"
          >
            {JOINT_TYPES.map((option) => (
              <option key={option} value={option}>
                {t(`pocketHole.${option}Joint`)}
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
          <dt className="text-wood-500 dark:text-wood-400">{t('pocketHole.screwLength')}</dt>
          <dd className="font-mono">
            {result.data.screwLengthInches} in ({result.data.screwLengthMm} mm)
          </dd>
          <dt className="text-wood-500 dark:text-wood-400">{t('pocketHole.threadType')}</dt>
          <dd>{t(`pocketHole.${result.data.threadType === 'washer_head' ? 'washerHead' : result.data.threadType}`)}</dd>
          <dt className="text-wood-500 dark:text-wood-400">{t('pocketHole.screwCount')}</dt>
          <dd className="font-mono">{result.data.screwCount}</dd>
          <dt className="text-wood-500 dark:text-wood-400">{t('pocketHole.spacing')}</dt>
          <dd className="font-mono">{result.data.spacingMm} mm</dd>
          <dt className="text-wood-500 dark:text-wood-400">{t('pocketHole.drillAngle')}</dt>
          <dd className="font-mono">{result.data.drillAngleDeg}°</dd>
          <dt className="text-wood-500 dark:text-wood-400">{t('pocketHole.collarDepth')}</dt>
          <dd className="font-mono">{result.data.collarDepthMm} mm</dd>
        </dl>
      )}
    </section>
  );
}
