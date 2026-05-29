/**
 * Sprint 230 — Taper Jig Calculator Panel
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateTaperJig } from '../../engine/taper-jig';

export function TaperJigPanel() {
  const { t } = useTranslation();

  const [workpieceLengthMm, setWorkpieceLengthMm] = useState(700);
  const [startWidthMm, setStartWidthMm] = useState(70);
  const [endWidthMm, setEndWidthMm] = useState(40);
  const [taperedFaces, setTaperedFaces] = useState<1 | 2>(1);

  const result = useMemo(() => {
    try {
      return {
        data: calculateTaperJig({ workpieceLengthMm, startWidthMm, endWidthMm, taperedFaces }),
        error: null,
      };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [workpieceLengthMm, startWidthMm, endWidthMm, taperedFaces]);

  return (
    <section aria-label={t('taperJig.title')} className="space-y-3">
      <h3 className="text-wood-700 dark:text-wood-200 text-sm font-semibold tracking-wide uppercase">
        📐 {t('taperJig.title')}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('taperJig.workpieceLength')} (mm)</span>
          <input
            type="number"
            min={50}
            max={3000}
            step={10}
            value={workpieceLengthMm}
            onChange={(e) => setWorkpieceLengthMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('taperJig.startWidth')} (mm)</span>
          <input
            type="number"
            min={10}
            max={500}
            step={1}
            value={startWidthMm}
            onChange={(e) => setStartWidthMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('taperJig.endWidth')} (mm)</span>
          <input
            type="number"
            min={1}
            max={499}
            step={1}
            value={endWidthMm}
            onChange={(e) => setEndWidthMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('taperJig.taperedFaces')}</span>
          <select
            value={taperedFaces}
            onChange={(e) => setTaperedFaces(Number(e.target.value) as 1 | 2)}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 text-sm focus:ring-2 focus:outline-none"
          >
            <option value={1}>{t('taperJig.oneFace')}</option>
            <option value={2}>{t('taperJig.twoFaces')}</option>
          </select>
        </label>
      </div>

      {result.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {result.error}
        </p>
      )}

      {result.data && (
        <dl className="bg-wood-50 dark:bg-wood-900 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg p-3 text-sm">
          <dt className="text-wood-500 dark:text-wood-400">{t('taperJig.taperAngle')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">{result.data.taperAngleDeg}°</dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('taperJig.jigOffset')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">{result.data.jigOffsetMm} mm</dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('taperJig.materialRemoved')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.materialRemovedPerFaceMm} mm
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('taperJig.taperPerFoot')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.taperPerFootMm} mm/ft
          </dd>
        </dl>
      )}

      {result.data?.taperedFaces === 2 && (
        <p className="text-wood-500 dark:text-wood-400 text-xs italic">{t('taperJig.note')}</p>
      )}
    </section>
  );
}
