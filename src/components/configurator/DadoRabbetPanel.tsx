/**
 * Sprint 226 — Dado / Rabbet Joint Calculator Panel
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateDadoRabbet, type DadoRabbetJointType } from '../../engine/dado-rabbet';

const JOINT_TYPES: DadoRabbetJointType[] = ['dado', 'rabbet', 'throughDado'];

export function DadoRabbetPanel() {
  const { t } = useTranslation();

  const [jointType, setJointType] = useState<DadoRabbetJointType>('dado');
  const [matingThicknessMm, setMatingThicknessMm] = useState(18);
  const [boardThicknessMm, setBoardThicknessMm] = useState(19);
  const [offsetFromEdgeMm, setOffsetFromEdgeMm] = useState(0);

  const result = useMemo(() => {
    try {
      return {
        data: calculateDadoRabbet({ jointType, matingThicknessMm, boardThicknessMm, offsetFromEdgeMm }),
        error: null,
      };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [jointType, matingThicknessMm, boardThicknessMm, offsetFromEdgeMm]);

  return (
    <section aria-label={t('dadoRabbet.title')} className="space-y-3">
      <h3 className="text-wood-700 dark:text-wood-200 text-sm font-semibold tracking-wide uppercase">
        🔧 {t('dadoRabbet.title')}
      </h3>

      <fieldset>
        <legend className="text-wood-600 dark:text-wood-300 mb-1 text-sm">{t('dadoRabbet.jointType')}</legend>
        <div className="flex flex-wrap gap-1">
          {JOINT_TYPES.map((jt) => (
            <button
              key={jt}
              type="button"
              onClick={() => setJointType(jt)}
              className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                jointType === jt
                  ? 'bg-wood-600 text-white'
                  : 'bg-wood-100 text-wood-700 dark:bg-wood-700 dark:text-wood-200 hover:bg-wood-200 dark:hover:bg-wood-600'
              }`}
            >
              {t(`dadoRabbet.${jt}`)}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('dadoRabbet.matingThickness')} (mm)</span>
          <input
            type="number"
            min={3}
            max={50}
            step={1}
            value={matingThicknessMm}
            onChange={(e) => setMatingThicknessMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('dadoRabbet.boardThickness')} (mm)</span>
          <input
            type="number"
            min={6}
            max={100}
            step={1}
            value={boardThicknessMm}
            onChange={(e) => setBoardThicknessMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        {jointType === 'rabbet' && (
          <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
            <span>{t('dadoRabbet.offsetFromEdge')} (mm)</span>
            <input
              type="number"
              min={0}
              max={50}
              step={1}
              value={offsetFromEdgeMm}
              onChange={(e) => setOffsetFromEdgeMm(Number(e.target.value))}
              className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
            />
          </label>
        )}
      </div>

      {result.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {result.error}
        </p>
      )}

      {result.data && (
        <dl
          aria-live="polite"
          aria-label={t('dadoRabbet.title')}
          className="bg-wood-50 dark:bg-wood-800 grid grid-cols-2 gap-x-4 gap-y-1 rounded-md p-3 text-sm"
        >
          <dt className="text-wood-500 dark:text-wood-400">{t('dadoRabbet.cutWidth')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.cutWidthMm.toFixed(1)} mm
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('dadoRabbet.cutDepth')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.cutDepthMm.toFixed(1)} mm
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('dadoRabbet.passCount')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">{result.data.passCount}</dd>

          <dt className="text-wood-500 dark:text-wood-400 col-span-1">{t('dadoRabbet.bitsRecommendation')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 col-span-1">{result.data.bitsRecommendation}</dd>
        </dl>
      )}
    </section>
  );
}
