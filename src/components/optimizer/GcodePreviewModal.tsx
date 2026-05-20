/**
 * GcodePreviewModal — Sprint 8 (v3.55.3) + Sprint 11 (v3.56.1)
 *
 * Renders a G-code toolpath as an SVG preview before the file is downloaded.
 * Rapids (G0) = red dashed lines, cutting moves (G1) = blue solid,
 * arcs (G2/G3) = green curved paths approximated as SVG cubic beziers.
 *
 * Sprint 11 additions:
 * - Accepts a raw CutSheet and generates G-code internally.
 * - Collapsible "CNC Options" panel with machine presets (Shapeoko 3,
 *   X-Carve 1000, Genmitsu 3018 Pro) and individual field overrides.
 * - G-code and validation are re-computed live when options change.
 */

import { useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { parseToolpath, type ToolMove } from '../../engine/gcode-toolpath';
import { validateGcode } from '../../engine/gcode-validator';
import { cutSheetToGcode, type GcodeOptions } from '../../utils/gcode-export';
import type { CutSheet } from '../../engine/types';

interface Props {
  /** The cut sheet to generate and preview G-code for */
  sheet: CutSheet;
  /** Called when the user dismisses without downloading */
  onClose: () => void;
  /** Called when the user confirms download — receives the generated G-code text */
  onDownload: (gcodeText: string) => void;
  /** Human-readable file name shown in the title */
  filename: string;
}

// ── Machine presets ──────────────────────────────────────────────────────────

interface MachinePreset extends Omit<GcodeOptions, 'cutDepth'> {
  id: string;
}

const MACHINE_PRESETS: MachinePreset[] = [
  { id: 'shapeoko3',  feedRate: 2000, plungeRate: 500, safeZ: 5, passDepth: 2, toolDiameter: 6,     useArcs: false },
  { id: 'xcarve1000', feedRate: 1800, plungeRate: 500, safeZ: 5, passDepth: 2, toolDiameter: 6,     useArcs: false },
  { id: 'genmitsu',   feedRate: 800,  plungeRate: 300, safeZ: 5, passDepth: 1, toolDiameter: 3.175, useArcs: false },
];

/** Translation-key suffix map for named presets */
const PRESET_T_KEY: Record<string, string> = {
  shapeoko3:  'gcode.presetShapeoko3',
  xcarve1000: 'gcode.presetXcarve1000',
  genmitsu:   'gcode.presetGenmitsu',
};

const PAD = 10; // SVG padding in user units
const SVG_SIZE = 400; // rendered SVG square pixels

/** Convert an arc (G2/G3) to an SVG path `d` attribute using a large-arc approximation. */
function arcToSvgPath(move: ToolMove): string {
  const cx = move.x1 + (move.i ?? 0);
  const cy = move.y1 + (move.j ?? 0);
  const r = Math.sqrt((move.x1 - cx) ** 2 + (move.y1 - cy) ** 2);
  if (r < 0.001) return `M${move.x1},${move.y1} L${move.x2},${move.y2}`;

  const startAngle = Math.atan2(move.y1 - cy, move.x1 - cx);
  const endAngle = Math.atan2(move.y2 - cy, move.x2 - cx);
  let span = endAngle - startAngle;
  if (move.cw && span > 0) span -= 2 * Math.PI;
  if (!move.cw && span < 0) span += 2 * Math.PI;

  const largeArc = Math.abs(span) > Math.PI ? 1 : 0;
  const sweep = move.cw ? 0 : 1; // SVG sweep-flag: 1 = CCW

  return `M${move.x1.toFixed(3)},${move.y1.toFixed(3)} A${r.toFixed(3)},${r.toFixed(3)} 0 ${largeArc} ${sweep} ${move.x2.toFixed(3)},${move.y2.toFixed(3)}`;
}

export function GcodePreviewModal({ sheet, onClose, onDownload, filename }: Props) {
  const { t } = useTranslation();
  const trapRef = useRef<HTMLDivElement>(null);
  useFocusTrap(trapRef, true, onClose);
  const [showSettings, setShowSettings] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [options, setOptions] = useState<GcodeOptions>({
    feedRate: 1500,
    plungeRate: 600,
    safeZ: 5,
    cutDepth: sheet.thickness,
    passDepth: 3,
    toolDiameter: 6,
    useArcs: false,
  });

  // Re-generate G-code + validation whenever sheet or options change
  const gcodeText = useMemo(() => cutSheetToGcode(sheet, options), [sheet, options]);
  const validation = useMemo(() => validateGcode(gcodeText), [gcodeText]);
  const toolpath = useMemo(() => parseToolpath(gcodeText), [gcodeText]);

  // Compute SVG viewBox from bounds
  const { bounds, moves } = toolpath;
  const vbX = bounds.minX - PAD;
  const vbY = bounds.minY - PAD;
  const vbW = bounds.width + PAD * 2 || 100;
  const vbH = bounds.height + PAD * 2 || 100;
  const viewBox = `${vbX.toFixed(1)} ${vbY.toFixed(1)} ${vbW.toFixed(1)} ${vbH.toFixed(1)}`;

  const errorCount = validation.issues.filter((i) => i.severity === 'error').length;
  const warnCount = validation.issues.filter((i) => i.severity === 'warning').length;

  function applyPreset(preset: MachinePreset) {
    setActivePreset(preset.id);
    setOptions((prev) => ({
      ...prev,
      feedRate: preset.feedRate,
      plungeRate: preset.plungeRate,
      safeZ: preset.safeZ,
      passDepth: preset.passDepth,
      toolDiameter: preset.toolDiameter,
      useArcs: preset.useArcs,
    }));
  }

  function setNum(key: keyof Omit<GcodeOptions, 'useArcs'>, raw: string) {
    const n = parseFloat(raw);
    if (!isNaN(n) && n > 0) {
      setActivePreset(null); // no longer a named preset
      setOptions((prev) => ({ ...prev, [key]: n }));
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('gcode.previewTitle')}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={trapRef}
        className="bg-white dark:bg-wood-900 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col gap-0 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-wood-200 dark:border-wood-700">
          <h2 className="text-sm font-semibold text-wood-800 dark:text-wood-100">
            {t('gcode.previewTitle')} — <span className="font-mono text-wood-500">{filename}</span>
          </h2>
          <button
            onClick={onClose}
            className="text-wood-400 hover:text-wood-700 dark:hover:text-wood-200 text-lg leading-none"
            aria-label={t('gcodeValidator.dismiss')}
          >
            ×
          </button>
        </div>

        {/* Validation banner */}
        {(errorCount > 0 || warnCount > 0) && (
          <div
            className={`px-4 py-2 text-xs flex gap-4 ${errorCount > 0 ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'}`}
          >
            {errorCount > 0 && <span>⚠ {t('gcodeValidator.errors_other', { count: errorCount })}</span>}
            {warnCount > 0 && <span>⚠ {t('gcodeValidator.warnings_other', { count: warnCount })}</span>}
          </div>
        )}

        {/* CNC Options panel (collapsible) — Sprint 11 */}
        <div className="border-b border-wood-100 dark:border-wood-800">
          <button
            type="button"
            onClick={() => setShowSettings((s) => !s)}
            className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-wood-700 dark:text-wood-300 hover:bg-wood-50 dark:hover:bg-wood-800 transition-colors"
            aria-expanded={showSettings}
            aria-controls="gcode-settings-panel"
          >
            <span aria-hidden="true">{showSettings ? '▾' : '▸'}</span>
            {t('gcode.cncOptions')}
            {activePreset !== null && (
              <span className="ms-auto text-wood-400 text-[10px]">
                {t(PRESET_T_KEY[activePreset] ?? 'gcode.presetCustom')}
              </span>
            )}
          </button>
          {showSettings && (
            <div id="gcode-settings-panel" className="px-4 pb-3 space-y-3 bg-wood-50 dark:bg-wood-800">
              {/* Machine presets */}
              <div className="pt-2">
                <p className="text-[10px] font-medium text-wood-500 dark:text-wood-400 mb-1.5">
                  {t('gcode.machinePreset')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {MACHINE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${activePreset === preset.id ? 'bg-wood-700 text-white border-wood-700 dark:bg-wood-500 dark:border-wood-500' : 'border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-100 dark:hover:bg-wood-700'}`}
                    >
                      {t(PRESET_T_KEY[preset.id])}
                    </button>
                  ))}
                </div>
              </div>

              {/* Numeric option fields */}
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { key: 'feedRate', label: t('gcode.feedRate') },
                    { key: 'plungeRate', label: t('gcode.plungeRate') },
                    { key: 'safeZ', label: t('gcode.safeZ') },
                    { key: 'passDepth', label: t('gcode.passDepth') },
                    { key: 'toolDiameter', label: t('gcode.toolDiameter') },
                  ] as { key: keyof Omit<GcodeOptions, 'useArcs' | 'cutDepth'>; label: string }[]
                ).map(({ key, label }) => (
                  <label key={key} className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-wood-500 dark:text-wood-400">{label}</span>
                    <input
                      type="number"
                      value={options[key]}
                      min={0.1}
                      step={key === 'toolDiameter' ? 0.001 : 1}
                      onChange={(e) => setNum(key, e.target.value)}
                      className="w-full px-1.5 py-0.5 text-xs rounded border border-wood-300 dark:border-wood-600 bg-white dark:bg-wood-900 text-wood-700 dark:text-wood-200"
                      aria-label={label}
                    />
                  </label>
                ))}
                {/* useArcs toggle */}
                <label className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-wood-500 dark:text-wood-400">{t('gcode.useArcs')}</span>
                  <div className="flex items-center pt-1.5">
                    <input
                      type="checkbox"
                      checked={options.useArcs}
                      onChange={(e) => {
                        setActivePreset(null);
                        setOptions((prev) => ({ ...prev, useArcs: e.target.checked }));
                      }}
                      className="h-3.5 w-3.5 rounded border-wood-300 dark:border-wood-600"
                      aria-label={t('gcode.useArcs')}
                    />
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* SVG toolpath preview */}
        <div className="bg-gray-50 dark:bg-wood-800 flex items-center justify-center p-2">
          <svg
            viewBox={viewBox}
            width={SVG_SIZE}
            height={SVG_SIZE}
            className="border border-wood-200 dark:border-wood-700 rounded bg-white dark:bg-wood-900"
            aria-label={t('gcode.previewTitle')}
            role="img"
          >
            {moves.map((move, idx) => {
              if (move.kind === 'rapid') {
                return (
                  <line
                    key={idx}
                    x1={move.x1}
                    y1={move.y1}
                    x2={move.x2}
                    y2={move.y2}
                    stroke="#ef4444"
                    strokeWidth={vbW / 200}
                    strokeDasharray={`${vbW / 60} ${vbW / 80}`}
                    opacity={0.7}
                  />
                );
              }
              if (move.kind === 'cut') {
                return (
                  <line
                    key={idx}
                    x1={move.x1}
                    y1={move.y1}
                    x2={move.x2}
                    y2={move.y2}
                    stroke="#3b82f6"
                    strokeWidth={vbW / 150}
                    opacity={0.9}
                  />
                );
              }
              // arc
              return (
                <path
                  key={idx}
                  d={arcToSvgPath(move)}
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth={vbW / 150}
                  opacity={0.9}
                />
              );
            })}
            {/* Start marker */}
            {moves.length > 0 && <circle cx={moves[0].x1} cy={moves[0].y1} r={vbW / 60} fill="#22c55e" opacity={0.8} />}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex gap-4 px-4 py-2 text-xs text-wood-500 dark:text-wood-400 border-t border-wood-100 dark:border-wood-800">
          <span className="flex items-center gap-1">
            <span className="inline-block w-6 border-t-2 border-dashed border-red-400" />
            {t('gcode.previewRapid')}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-6 border-t-2 border-blue-500" />
            {t('gcode.previewCut')}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-6 border-t-2 border-green-500" />
            {t('gcode.previewArc')}
          </span>
          <span className="ms-auto text-wood-400">
            {moves.length} {t('gcode.moveCount', { count: moves.length })}
          </span>
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-wood-200 dark:border-wood-700">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded border border-wood-300 dark:border-wood-600 text-wood-700 dark:text-wood-200 hover:bg-wood-100 dark:hover:bg-wood-700 transition-colors"
          >
            {t('gcodeValidator.dismiss')}
          </button>
          <button
            onClick={() => {
              onDownload(gcodeText);
              onClose();
            }}
            className="px-3 py-1.5 text-xs rounded bg-wood-700 dark:bg-wood-600 text-white hover:bg-wood-800 dark:hover:bg-wood-500 transition-colors"
          >
            {t('gcode.downloadAnyway')}
          </button>
        </div>
      </div>
    </div>
  );
}
