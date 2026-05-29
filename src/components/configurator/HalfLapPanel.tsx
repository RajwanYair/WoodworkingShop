/**
 * Sprint 245 — Half-Lap Joint Calculator Panel
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateHalfLap } from '../../engine/half-lap';
import type { HalfLapType } from '../../engine/half-lap';

export function HalfLapPanel() {
  const { t } = useTranslation();

  const [board1ThicknessMm, setBoard1ThicknessMm] = useState(19);
  const [board1WidthMm, setBoard1WidthMm] = useState(90);
  const [board2ThicknessMm, setBoard2ThicknessMm] = useState(19);
  const [board2WidthMm, setBoard2WidthMm] = useState(90);
  const [lapType, setLapType] = useState<HalfLapType>('end_lap');

  const result = useMemo(() => {
    try {
      return {
        data: calculateHalfLap({
          board1ThicknessMm,
          board1WidthMm,
          board2ThicknessMm,
          board2WidthMm,
          lapType,
        }),
        error: null,
      };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [board1ThicknessMm, board1WidthMm, board2ThicknessMm, board2WidthMm, lapType]);

  return (
    <section aria-label={t('halfLap.title')} className="space-y-3">
      <h3 className="text-wood-700 dark:text-wood-200 text-sm font-semibold tracking-wide uppercase">
        🔨 {t('halfLap.title')}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('halfLap.lapType')}</span>
          <select
            value={lapType}
            onChange={(e) => setLapType(e.target.value as HalfLapType)}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 col-span-2 rounded border px-2 py-1 text-sm focus:ring-2 focus:outline-none"
          >
            <option value="end_lap">{t('halfLap.lapTypes.end_lap')}</option>
            <option value="t_lap">{t('halfLap.lapTypes.t_lap')}</option>
            <option value="cross_lap">{t('halfLap.lapTypes.cross_lap')}</option>
          </select>
        </label>

        <div />

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('halfLap.board1Thickness')} (mm)</span>
          <input
            type="number"
            min={1}
            max={200}
            step={1}
            value={board1ThicknessMm}
            onChange={(e) => setBoard1ThicknessMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('halfLap.board1Width')} (mm)</span>
          <input
            type="number"
            min={10}
            max={600}
            step={1}
            value={board1WidthMm}
            onChange={(e) => setBoard1WidthMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('halfLap.board2Thickness')} (mm)</span>
          <input
            type="number"
            min={1}
            max={200}
            step={1}
            value={board2ThicknessMm}
            onChange={(e) => setBoard2ThicknessMm(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-500 rounded border px-2 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </label>

        <label className="text-wood-600 dark:text-wood-300 flex flex-col gap-1 text-sm">
          <span>{t('halfLap.board2Width')} (mm)</span>
          <input
            type="number"
            min={10}
            max={600}
            step={1}
            value={board2WidthMm}
            onChange={(e) => setBoard2WidthMm(Number(e.target.value))}
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
        <dl className="bg-wood-50 dark:bg-wood-900/40 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg p-3 text-sm">
          <dt className="text-wood-500 dark:text-wood-400">{t('halfLap.board1NotchDepth')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.board1NotchDepthMm.toFixed(1)} mm
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('halfLap.board1NotchWidth')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.board1NotchWidthMm.toFixed(1)} mm
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('halfLap.board2NotchDepth')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.board2NotchDepthMm.toFixed(1)} mm
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('halfLap.board2NotchWidth')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.board2NotchWidthMm.toFixed(1)} mm
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('halfLap.totalGlueArea')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.totalGlueAreaMm2.toFixed(0)} mm²
          </dd>

          <dt className="text-wood-500 dark:text-wood-400">{t('halfLap.finishedThickness')}</dt>
          <dd className="text-wood-800 dark:text-wood-100 font-mono font-semibold">
            {result.data.finishedThicknessMm.toFixed(1)} mm
          </dd>
        </dl>
      )}
    </section>
  );
}
