import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { buildCutSequence, type CutSequenceResult, type CutStep } from '../../engine/cut-sequence';
import type { CutSheet } from '../../engine/types';
import { triggerDownload } from '../../utils/download';

const DIAGRAM_WIDTH = 240;

interface Props {
  sheets: readonly CutSheet[];
  filePrefix: string;
}

function CutDiagram({ sheet, steps }: { sheet: CutSheet; steps: readonly CutStep[] }) {
  const { t } = useTranslation();
  const scale = DIAGRAM_WIDTH / sheet.sheetWidth;
  const height = sheet.sheetLength * scale;
  return (
    <svg
      viewBox={`0 0 ${DIAGRAM_WIDTH} ${height}`}
      className="text-wood-700 dark:text-wood-300 w-full max-w-60"
      role="img"
      aria-label={t('cutSequence.diagramLabel', { num: sheet.sheetIndex + 1, count: steps.length })}
    >
      <rect x={0} y={0} width={DIAGRAM_WIDTH} height={height} fill="none" stroke="currentColor" strokeOpacity={0.5} />
      {sheet.parts.map((p, i) => (
        <rect
          key={`${p.partId}-${i}`}
          x={p.x * scale}
          y={p.y * scale}
          width={p.width * scale}
          height={p.length * scale}
          fill="currentColor"
          fillOpacity={0.15}
          stroke="currentColor"
          strokeOpacity={0.4}
          strokeWidth={0.5}
        />
      ))}
      {steps.map((s) => {
        const horizontal = s.axis === 'y';
        const x1 = (horizontal ? s.region.x : s.position) * scale;
        const y1 = (horizontal ? s.position : s.region.y) * scale;
        const x2 = (horizontal ? s.region.x + s.region.width : s.position) * scale;
        const y2 = (horizontal ? s.position : s.region.y + s.region.length) * scale;
        return (
          <g key={s.step} className="stroke-red-500 text-red-600 dark:text-red-400">
            <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={1} strokeDasharray="3 2" />
            <text
              x={(x1 + x2) / 2}
              y={(y1 + y2) / 2}
              fontSize={8}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="currentColor"
              stroke="none"
            >
              {s.step}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function CutSequencePanel({ sheets, filePrefix }: Props) {
  const { t } = useTranslation();
  const { sawKerf, config } = useCabinetStore();
  const [open, setOpen] = useState(false);
  const guillotine = config.cutMode === 'guillotine';

  const sequences = useMemo<CutSequenceResult[]>(
    () => (guillotine ? sheets.map((s) => buildCutSequence(s, sawKerf)) : []),
    [guillotine, sheets, sawKerf],
  );

  const describeStep = (s: CutStep) =>
    t('cutSequence.step', {
      step: s.step,
      type: t(s.axis === 'y' ? 'cutSequence.crosscut' : 'cutSequence.rip'),
      panelWidth: s.region.width,
      panelLength: s.region.length,
      offset: s.position - (s.axis === 'y' ? s.region.y : s.region.x),
      stage: s.stage,
    });

  const assumptions = [
    t('cutSequence.assumeThrough'),
    t('cutSequence.assumeKerf', { kerf: sawKerf }),
    t('cutSequence.assumeOrigin'),
    t('cutSequence.assumeLimits'),
  ];

  const handleDownload = () => {
    const lines = [t('cutSequence.title'), '', ...assumptions.map((a) => `- ${a}`), ''];
    sheets.forEach((sheet, i) => {
      const result = sequences[i];
      lines.push(t('cutSequence.sheetHeading', { num: sheet.sheetIndex + 1, material: sheet.material }));
      if (!result?.ok) {
        lines.push(t('cutSequence.notRealizable'));
      } else {
        for (const s of result.sequence.steps) lines.push(describeStep(s));
      }
      lines.push('');
    });
    triggerDownload(lines.join('\n'), 'text/plain;charset=utf-8', `${filePrefix}-cut-sequence.txt`);
  };

  return (
    <section className="border-wood-200 bg-wood-50 dark:border-wood-700 dark:bg-wood-900/30 rounded-lg border">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-start"
      >
        <span className="text-wood-800 dark:text-wood-100 font-semibold">{t('cutSequence.title')}</span>
        <span aria-hidden="true" className="text-wood-400 dark:text-wood-500 text-sm">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div className="border-wood-200 dark:border-wood-700 space-y-4 border-t px-4 pt-3 pb-4">
          {!guillotine ? (
            <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
              {t('cutSequence.layoutOnly')}
            </p>
          ) : (
            <>
              <div className="text-wood-600 dark:text-wood-300 text-xs">
                <p className="font-semibold">{t('cutSequence.assumptionsTitle')}</p>
                <ul className="ms-4 list-disc">
                  {assumptions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
              {sheets.length > 0 && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="bg-wood-600 hover:bg-wood-700 rounded px-3 py-1 text-xs text-white"
                >
                  {t('cutSequence.download')}
                </button>
              )}
              {sheets.map((sheet, i) => {
                const result = sequences[i];
                return (
                  <div key={sheet.sheetIndex} className="space-y-2">
                    <h3 className="text-wood-700 dark:text-wood-200 text-sm font-semibold">
                      {t('cutSequence.sheetHeading', { num: sheet.sheetIndex + 1, material: sheet.material })}
                    </h3>
                    {!result?.ok ? (
                      <p className="text-xs text-red-600 dark:text-red-400">{t('cutSequence.notRealizable')}</p>
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <CutDiagram sheet={sheet} steps={result.sequence.steps} />
                        <ol className="text-wood-700 dark:text-wood-300 flex-1 space-y-0.5 text-xs tabular-nums">
                          {result.sequence.steps.map((s) => (
                            <li key={s.step}>{describeStep(s)}</li>
                          ))}
                          {result.sequence.steps.length === 0 && <li>{t('cutSequence.noCuts')}</li>}
                        </ol>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </section>
  );
}
