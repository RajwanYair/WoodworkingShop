/**
 * G-code toolpath parser for SVG preview.
 *
 * Parses G-code text into a list of move segments suitable for rendering
 * as an SVG preview.  Handles G0 (rapid), G1 (cut), G2/G3 (arc) moves.
 *
 * Sprint 8 (v3.55.3)
 */

export type MoveKind = 'rapid' | 'cut' | 'arc';

export interface ToolMove {
  kind: MoveKind;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** For arcs: center offset from start point */
  i?: number;
  j?: number;
  /** true = G2 (clockwise), false = G3 (counter-clockwise) */
  cw?: boolean;
}

/** Bounding box of all moves. */
export interface ToolpathBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface ParsedToolpath {
  moves: ToolMove[];
  bounds: ToolpathBounds;
}

const RE_WORD = /([A-Z])([-+]?\d*\.?\d+)/gi;

function parseWords(line: string): Map<string, number> {
  const map = new Map<string, number>();
  let m: RegExpExecArray | null;
  RE_WORD.lastIndex = 0;
  while ((m = RE_WORD.exec(line)) !== null) {
    map.set(m[1].toUpperCase(), parseFloat(m[2]));
  }
  return map;
}

function stripComment(line: string): string {
  return line
    .replace(/\([^)]*\)/g, '')
    .replace(/;[^\n]*$/, '')
    .trim();
}

/** Parse G-code into a list of 2D toolpath moves (Z axis ignored for SVG). */
export function parseToolpath(gcode: string): ParsedToolpath {
  const moves: ToolMove[] = [];
  let cx = 0;
  let cy = 0;
  let modal = 0; // 0 = rapid, 1 = cut, 2 = arc CW, 3 = arc CCW

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  function trackPoint(x: number, y: number) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  for (const raw of gcode.split('\n')) {
    const line = stripComment(raw);
    if (!line) continue;

    const words = parseWords(line);

    // Update modal
    if (words.has('G')) {
      const g = words.get('G')!;
      if (g === 0) modal = 0;
      else if (g === 1) modal = 1;
      else if (g === 2) modal = 2;
      else if (g === 3) modal = 3;
    }

    // Skip non-motion lines
    if (!words.has('X') && !words.has('Y')) continue;

    const nx = words.has('X') ? words.get('X')! : cx;
    const ny = words.has('Y') ? words.get('Y')! : cy;

    // Determine actual modal (G word on same line takes priority)
    let effectiveModal = modal;
    if (words.has('G')) {
      const g = words.get('G')!;
      if (g === 0) effectiveModal = 0;
      else if (g === 1) effectiveModal = 1;
      else if (g === 2) effectiveModal = 2;
      else if (g === 3) effectiveModal = 3;
    }

    if (effectiveModal === 0) {
      moves.push({ kind: 'rapid', x1: cx, y1: cy, x2: nx, y2: ny });
    } else if (effectiveModal === 1) {
      moves.push({ kind: 'cut', x1: cx, y1: cy, x2: nx, y2: ny });
    } else if (effectiveModal === 2 || effectiveModal === 3) {
      const i = words.get('I') ?? 0;
      const j = words.get('J') ?? 0;
      moves.push({
        kind: 'arc',
        x1: cx,
        y1: cy,
        x2: nx,
        y2: ny,
        i,
        j,
        cw: effectiveModal === 2,
      });
    }

    trackPoint(cx, cy);
    trackPoint(nx, ny);

    cx = nx;
    cy = ny;
  }

  // Default bounds when file has no motion
  if (!isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 100;
    maxY = 100;
  }

  return {
    moves,
    bounds: {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    },
  };
}
