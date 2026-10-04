import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculatePocketHole } from '../../engine/pocket-hole';
import type { JointType, MaterialHardness } from '../../engine/pocket-hole';

export function PocketHolePanel() {
  const { t } = useTranslation();
  const [workpieceThicknessMm, setWorkpieceThicknessMm] = useState(18);
  const [matingThicknessMm, setMatingThicknessMm] = useState(18);
  const [jointLengthMm, setJointLengthMm] = useState(600);
  const [materialHardness, setMaterialHardness] = useState<MaterialHardness>('hardwood');
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
            min={1}
            value={workpieceThicknessMm}
            onChange={(event) => setWorkpieceThicknessMm(Number(event.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 rounded border px-2 py-1 font-mono text-sm"
          />
        </label>
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('pocketHole.matingThickness')} (mm)</span>
          <input
            type="number"
            min={1}
            value={matingThicknessMm}
            onChange={(event) => setMatingThicknessMm(Number(event.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 rounded border px-2 py-1 font-mono text-sm"
          />
        </label>
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('pocketHole.jointLength')} (mm)</span>
          <input
            type="number"
            min={1}
            value={jointLengthMm}
            onChange={(event) => setJointLengthMm(Number(event.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 rounded border px-2 py-1 font-mono text-sm"
          />
        </label>
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('pocketHole.materialHardness')}</span>
          <select
            value={materialHardness}
            onChange={(event) => setMaterialHardness(event.target.value as MaterialHardness)}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 rounded border px-2 py-1 text-sm"
          >
            <option value="softwood">{t('pocketHole.softwood')}</option>
            <option value="hardwood">{t('pocketHole.hardwood')}</option>
            <option value="plywood">{t('shelfDeflection.plywood')}</option>
            <option value="mdf">{t('shelfDeflection.mdf')}</option>
          </select>
        </label>
        <label className="text-wood-600 dark:text-wood-300 col-span-2 flex flex-col gap-1 text-sm">
          <span>{t('pocketHole.jointType')}</span>
          <select
            value={jointType}
            onChange={(event) => setJointType(event.target.value as JointType)}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 rounded border px-2 py-1 text-sm"
          >
            <option value="butt">{t('pocketHole.buttJoint')}</option>
            <option value="mitre">{t('pocketHole.mitreJoint')}</option>
            <option value="edge">{t('pocketHole.edgeJoint')}</option>
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
          className="bg-wood-50 dark:bg-wood-900 grid grid-cols-2 gap-x-4 gap-y-2 rounded-md p-3 text-sm"
        >
          <dt>{t('pocketHole.screwLength')}</dt>
          <dd>{result.data.screwLengthMm} mm</dd>
          <dt>{t('pocketHole.drillAngle')}</dt>
          <dd>{result.data.drillAngleDeg}°</dd>
          <dt>{t('pocketHole.screwCount')}</dt>
          <dd>{result.data.screwCount}</dd>
          <dt>{t('pocketHole.spacing')}</dt>
          <dd>{result.data.spacingMm} mm</dd>
        </dl>
      )}
    </section>
  );
}
