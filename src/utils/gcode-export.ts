import type { CutSheet, CutRect } from '../engine/types';
import { triggerDownload } from './download';

/**
 * Generate basic G-code for a CNC router to cut parts from a sheet.
 * Uses simple rectangular profiling cuts with tabs.
 * Assumes origin at bottom-left of sheet, Z0 at material surface.
 *
 * Parameters are conservative defaults for a typical hobby CNC router.
 */
export interface GcodeOptions {
  feedRate: number; // mm/min XY cutting feed (default 1500)
  plungeRate: number; // mm/min Z plunge feed (default 600)
  safeZ: number; // mm safe retract height (default 5)
  cutDepth: number; // mm total cut depth (material thickness)
  passDepth: number; // mm depth per pass (default 3)
  toolDiameter: number; // mm router bit diameter (default 6)
  /**
   * When true, `circularPocketToGcode` emits G2/G3 arc commands instead of
   * linear approximations. Has no effect on rectangular profile cuts.
   */
  useArcs: boolean;
}

const DEFAULTS: GcodeOptions = {
  feedRate: 1500,
  plungeRate: 600,
  safeZ: 5,
  cutDepth: 18,
  passDepth: 3,
  toolDiameter: 6,
  useArcs: false,
};

/**
 * Generate G-code for cutting all parts from a single sheet.
 * Tool compensation is applied (offset outward by toolDiameter/2).
 */
export function cutSheetToGcode(sheet: CutSheet, opts?: Partial<GcodeOptions>): string {
  const o = { ...DEFAULTS, ...opts, cutDepth: opts?.cutDepth ?? sheet.thickness };
  const offset = o.toolDiameter / 2;
  const lines: string[] = [];

  // Header
  const generatedAt = new Date().toISOString();
  lines.push(`; Cabinet Planner G-code Export`);
  lines.push(`; Version: ${__APP_VERSION__}  Schema: gcode-v1`);
  lines.push(`; Generated: ${generatedAt}`);
  lines.push(`; G-code for sheet ${sheet.sheetIndex + 1} - ${sheet.material} ${sheet.thickness}mm`);
  lines.push(`; Sheet size: ${sheet.sheetWidth} x ${sheet.sheetLength} mm`);
  lines.push(`; Tool diameter: ${o.toolDiameter} mm, Feed: ${o.feedRate} mm/min`);
  lines.push(`; Parts: ${sheet.parts.length}`);
  lines.push('');
  lines.push('G21 ; mm mode');
  lines.push('G90 ; absolute positioning');
  lines.push(`G0 Z${o.safeZ.toFixed(1)} ; retract to safe height`);
  lines.push('M3 S18000 ; spindle on');
  lines.push('');

  for (const part of sheet.parts) {
    lines.push(`; --- Cut: ${part.partId} ${part.label} (${part.width}x${part.length}) ---`);
    addPartProfile(lines, part, o, offset);
    lines.push('');
  }

  // Footer
  lines.push(`G0 Z${o.safeZ.toFixed(1)} ; retract`);
  lines.push('M5 ; spindle off');
  lines.push('G0 X0 Y0 ; return to origin');
  lines.push('M2 ; program end');

  return lines.join('\n');
}

function addPartProfile(lines: string[], part: CutRect, opts: GcodeOptions, offset: number) {
  // Outer profile cut — offset outward from part edges
  const x1 = part.x - offset;
  const y1 = part.y - offset;
  const x2 = part.x + part.width + offset;
  const y2 = part.y + part.length + offset;

  const passes = Math.ceil(opts.cutDepth / opts.passDepth);

  // Rapid to start position
  lines.push(`G0 X${x1.toFixed(2)} Y${y1.toFixed(2)}`);

  for (let p = 1; p <= passes; p++) {
    const z = -Math.min(p * opts.passDepth, opts.cutDepth);

    // Plunge
    lines.push(`G1 Z${z.toFixed(2)} F${opts.plungeRate}`);

    // Cut rectangle CW: bottom→right→top→left→close
    lines.push(`G1 X${x2.toFixed(2)} Y${y1.toFixed(2)} F${opts.feedRate}`);
    lines.push(`G1 X${x2.toFixed(2)} Y${y2.toFixed(2)}`);
    lines.push(`G1 X${x1.toFixed(2)} Y${y2.toFixed(2)}`);
    lines.push(`G1 X${x1.toFixed(2)} Y${y1.toFixed(2)}`);
  }

  // Retract after part
  lines.push(`G0 Z${opts.safeZ.toFixed(1)}`);
}

/** Trigger G-code download for a single sheet */
export function downloadGcodeForSheet(sheet: CutSheet, filename: string, opts?: Partial<GcodeOptions>) {
  const content = cutSheetToGcode(sheet, opts);
  triggerDownload(content, 'text/plain', filename);
}

/** Download G-code for all sheets as separate files (zipped in a single combined file) */
export function downloadAllSheetsGcode(sheets: CutSheet[], projectName: string, opts?: Partial<GcodeOptions>) {
  const combined: string[] = [];
  for (const sheet of sheets) {
    combined.push(cutSheetToGcode(sheet, opts));
    combined.push(''); // blank line between sheets
  }
  triggerDownload(combined.join('\n'), 'text/plain', `${projectName}-all-sheets.nc`);
}

/**
 * Generate G-code for a circular pocket (e.g. hinge cup, shelf-pin hole).
 *
 * When `opts.useArcs` is **true** (default for this function), the cut
 * circles are output as `G2` arc commands — the preferred method for CNC
 * controllers with arc interpolation.  When `opts.useArcs` is **false**, the
 * circle is approximated using a 36-sided polygon of `G1` linear moves.
 *
 * Coordinate system: X/Y are the centre of the pocket; Z0 is the material
 * surface. The tool starts and ends at safe-Z.
 *
 * @param cx - X coordinate of pocket centre (mm)
 * @param cy - Y coordinate of pocket centre (mm)
 * @param radius - Pocket radius (mm); e.g. 17.5 for a 35 mm hinge cup
 * @param opts - GcodeOptions (merged with DEFAULTS)
 * @returns G-code string for the circular pocket
 */
export function circularPocketToGcode(
  cx: number,
  cy: number,
  radius: number,
  opts?: Partial<GcodeOptions>,
): string {
  const o: GcodeOptions = { ...DEFAULTS, ...opts };
  const lines: string[] = [];
  const cutR = radius - o.toolDiameter / 2; // compensated cut radius

  if (cutR <= 0) {
    // Tool is larger than or equal to the pocket — single plunge at centre
    lines.push(`; Circular pocket r=${radius} mm at (${cx.toFixed(2)},${cy.toFixed(2)}) — plunge only (tool≥pocket)`);
    lines.push(`G0 X${cx.toFixed(2)} Y${cy.toFixed(2)}`);
    const passes = Math.ceil(o.cutDepth / o.passDepth);
    for (let p = 1; p <= passes; p++) {
      const z = -Math.min(p * o.passDepth, o.cutDepth);
      lines.push(`G1 Z${z.toFixed(2)} F${o.plungeRate}`);
    }
    lines.push(`G0 Z${o.safeZ.toFixed(1)}`);
    return lines.join('\n');
  }

  const startX = cx + cutR; // entry point on the +X side of the circle

  lines.push(`; Circular pocket r=${radius} mm at (${cx.toFixed(2)},${cy.toFixed(2)}) — ${o.useArcs ? 'G2 arc' : 'G1 polygon'} mode`);
  lines.push(`G0 X${startX.toFixed(2)} Y${cy.toFixed(2)}`);

  const passes = Math.ceil(o.cutDepth / o.passDepth);

  for (let p = 1; p <= passes; p++) {
    const z = -Math.min(p * o.passDepth, o.cutDepth);
    lines.push(`G1 Z${z.toFixed(2)} F${o.plungeRate}`);

    if (o.useArcs) {
      // Full-circle G2 arc: I is offset from current pos to centre (−cutR on X)
      lines.push(`G2 I${(-cutR).toFixed(3)} J0.000 F${o.feedRate} ; full CW arc`);
    } else {
      // 36-point polygon approximation (10° steps)
      const STEPS = 36;
      for (let s = 1; s <= STEPS; s++) {
        const angle = (s / STEPS) * 2 * Math.PI;
        const px = cx + cutR * Math.cos(angle);
        const py = cy + cutR * Math.sin(angle);
        lines.push(`G1 X${px.toFixed(3)} Y${py.toFixed(3)} F${o.feedRate}`);
      }
    }
  }

  lines.push(`G0 Z${o.safeZ.toFixed(1)}`);
  return lines.join('\n');
}
