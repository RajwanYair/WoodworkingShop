import type { ToolMove } from '../../engine/export/gcode-toolpath';
import type { GcodeOptions } from '../../utils/gcode-export';

export interface MachinePreset extends Omit<GcodeOptions, 'cutDepth'> {
  id: string;
}

export const MACHINE_PRESETS: MachinePreset[] = [
  {
    id: 'shapeoko3',
    feedRate: 2000,
    plungeRate: 500,
    safeZ: 5,
    passDepth: 2,
    toolDiameter: 6,
    useArcs: false,
    emitToolChange: false,
  },
  {
    id: 'xcarve1000',
    feedRate: 1800,
    plungeRate: 500,
    safeZ: 5,
    passDepth: 2,
    toolDiameter: 6,
    useArcs: false,
    emitToolChange: false,
  },
  {
    id: 'genmitsu',
    feedRate: 800,
    plungeRate: 300,
    safeZ: 5,
    passDepth: 1,
    toolDiameter: 3.175,
    useArcs: false,
    emitToolChange: false,
  },
];

/** Translation-key suffix map for named presets */
export const PRESET_T_KEY: Record<string, string> = {
  shapeoko3: 'gcode.presetShapeoko3',
  xcarve1000: 'gcode.presetXcarve1000',
  genmitsu: 'gcode.presetGenmitsu',
};

export type NumericOption = keyof Omit<GcodeOptions, 'useArcs' | 'cutDepth' | 'emitToolChange'>;

export const PAD = 10; // SVG padding in user units
export const SVG_SIZE = 400; // rendered SVG square pixels

/** Convert an arc (G2/G3) to an SVG path `d` attribute using a large-arc approximation. */
export function arcToSvgPath(move: ToolMove): string {
  const cx = move.x1 + (move.i ?? 0);
  const cy = move.y1 + (move.j ?? 0);
  const r = Math.hypot(move.x1 - cx, move.y1 - cy);
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
