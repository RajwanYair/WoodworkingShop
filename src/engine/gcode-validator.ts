/**
 * G-code post-export validator.
 *
 * Parses a G-code string and emits structured lint issues suitable for display
 * in a ValidationPanel-style component.  All checks are heuristic and aimed at
 * common CNC router mistakes — this is not a full G-code interpreter.
 *
 * Sprint 7 (v3.55.2)
 */

/** Severity levels — matches the existing ValidationIssue type in engine/validation. */
export type GcodeSeverity = 'error' | 'warning' | 'info';

export interface GcodeIssue {
  severity: GcodeSeverity;
  line: number; // 1-based
  code: string; // machine-readable rule ID
  message: string;
}

export interface GcodeValidationResult {
  issues: GcodeIssue[];
  lineCount: number;
  /** true when no error-severity issues were found */
  valid: boolean;
}

// ─── Heuristic thresholds ────────────────────────────────────────────────────

/** Feed rates below this on a cutting move are likely a misconfiguration. */
const MIN_FEED_RATE_MM_MIN = 100;
/** Feed rates above this are likely too fast for a wood router profile cut. */
const MAX_FEED_RATE_MM_MIN = 15000;
/** Safe retract Z must be > 0; values <= 0 risk crashing the spindle. */
const MIN_SAFE_Z = 0.5;
/** Minimum arc radius (mm) for G2/G3 commands. */
const MIN_ARC_RADIUS = 0.1;

// ─── Regex helpers ────────────────────────────────────────────────────────────

const RE_WORD = /([A-Z])([-+]?\d*\.?\d+)/gi;
const RE_G_MODAL_MOVE = /^G0?[01](?!\d)/i; // G0, G00, G1, G01 (not G10, G17…)
const RE_G_ARC = /^G0?[23](?!\d)/i; // G2, G02, G3, G03 (not G21, G20…)

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
  // Remove ';' comments and parenthetical '(…)' comments
  return line
    .replace(/\([^)]*\)/g, '')
    .replace(/;[^\n]*$/, '')
    .trim();
}

// ─── Validator ────────────────────────────────────────────────────────────────

/**
 * Validate a G-code string and return a structured result.
 *
 * @param gcode - Raw G-code text as exported by cutSheetToGcode / circularPocketToGcode.
 */
export function validateGcode(gcode: string): GcodeValidationResult {
  const issues: GcodeIssue[] = [];
  const rawLines = gcode.split('\n');

  let hasG21 = false; // metric mode declared
  let hasG90 = false; // absolute positioning declared
  let hasSpindleOn = false; // M3/M4 seen
  let hasSpindleOff = false; // M5 seen
  let hasProgramEnd = false; // M2/M30 seen
  let currentFeed = 0;
  let currentModal = 0; // 0 = G0, 1 = G1, 2 = G2, 3 = G3

  for (let i = 0; i < rawLines.length; i++) {
    const lineNo = i + 1;
    const raw = rawLines[i];
    const line = stripComment(raw);
    if (!line) continue;

    const words = parseWords(line);

    // ── Modal G-codes ────────────────────────────────────────────────────────
    if (words.has('G')) {
      const g = words.get('G')!;
      if (g === 21) hasG21 = true;
      if (g === 90) hasG90 = true;
      if (g === 0) currentModal = 0;
      if (g === 1) currentModal = 1;
      if (g === 2) currentModal = 2;
      if (g === 3) currentModal = 3;
    }

    // ── M-code detection ─────────────────────────────────────────────────────
    if (words.has('M')) {
      const m = words.get('M')!;
      if (m === 3 || m === 4) hasSpindleOn = true;
      if (m === 5) hasSpindleOff = true;
      if (m === 2 || m === 30) hasProgramEnd = true;
    }

    // ── Feed rate tracking ───────────────────────────────────────────────────
    if (words.has('F')) {
      const f = words.get('F')!;
      currentFeed = f; // Update BEFORE cut-without-feed check below
      if (f < MIN_FEED_RATE_MM_MIN) {
        issues.push({
          severity: 'error',
          line: lineNo,
          code: 'FEED_TOO_LOW',
          message: `Feed rate ${f} mm/min is below the minimum ${MIN_FEED_RATE_MM_MIN} mm/min — likely a configuration error.`,
        });
      }
      if (f > MAX_FEED_RATE_MM_MIN) {
        issues.push({
          severity: 'warning',
          line: lineNo,
          code: 'FEED_TOO_HIGH',
          message: `Feed rate ${f} mm/min exceeds ${MAX_FEED_RATE_MM_MIN} mm/min — verify your machine can handle this.`,
        });
      }
    }

    // ── Cutting move without feed rate ───────────────────────────────────────
    const isLinearCut = RE_G_MODAL_MOVE.test(line) || currentModal === 1;
    const isArcMove = RE_G_ARC.test(line) || currentModal === 2 || currentModal === 3;
    const hasMotion = words.has('X') || words.has('Y') || words.has('Z');
    const hasNegativeZ = words.has('Z') && words.get('Z')! < 0;

    if ((isLinearCut || isArcMove) && hasMotion && hasNegativeZ && currentFeed === 0) {
      issues.push({
        severity: 'error',
        line: lineNo,
        code: 'CUTTING_NO_FEED',
        message: `Cutting move at Z${words.get('Z')!} has no active feed rate — spindle may stall or machine may rapid into material.`,
      });
    }

    // ── Arc validation ───────────────────────────────────────────────────────
    if (isArcMove) {
      const hasIJ = words.has('I') || words.has('J');
      const hasR = words.has('R');
      if (!hasIJ && !hasR) {
        issues.push({
          severity: 'error',
          line: lineNo,
          code: 'ARC_NO_CENTER',
          message: `Arc command (G2/G3) has no center offset (I/J) or radius (R) — the arc cannot be computed.`,
        });
      }
      if (hasR) {
        const r = Math.abs(words.get('R')!);
        if (r < MIN_ARC_RADIUS) {
          issues.push({
            severity: 'error',
            line: lineNo,
            code: 'ARC_RADIUS_TOO_SMALL',
            message: `Arc radius ${r} mm is smaller than ${MIN_ARC_RADIUS} mm — likely a zero-radius arc that will not move.`,
          });
        }
      }
    }

    // ── Safe Z retract ───────────────────────────────────────────────────────
    // Detect a G0 Z move that retracts to a dangerously low height
    const isRapid = /^G0?0\b/i.test(line) || (currentModal === 0 && !RE_G_MODAL_MOVE.test(line));
    if (isRapid && words.has('Z') && !words.has('X') && !words.has('Y')) {
      const zVal = words.get('Z')!;
      if (zVal >= 0 && zVal < MIN_SAFE_Z) {
        issues.push({
          severity: 'warning',
          line: lineNo,
          code: 'SAFE_Z_LOW',
          message: `Retract height ${zVal} mm is very low. Parts or clamps may cause a collision during rapids.`,
        });
      }
    }
  }

  // ── File-level checks ────────────────────────────────────────────────────
  if (!hasG21) {
    issues.push({
      severity: 'warning',
      line: 0,
      code: 'NO_METRIC_MODE',
      message: `G21 (metric mode) not found. Verify your controller defaults to mm before running this file.`,
    });
  }
  if (!hasG90) {
    issues.push({
      severity: 'warning',
      line: 0,
      code: 'NO_ABSOLUTE_MODE',
      message: `G90 (absolute positioning) not found. The file may produce unexpected moves if incremental mode is active.`,
    });
  }
  if (!hasSpindleOn) {
    issues.push({
      severity: 'error',
      line: 0,
      code: 'NO_SPINDLE_ON',
      message: `M3/M4 (spindle on) not found. The spindle will not start — the tool will plunge into the material with no rotation.`,
    });
  }
  if (hasSpindleOn && !hasSpindleOff) {
    issues.push({
      severity: 'warning',
      line: 0,
      code: 'NO_SPINDLE_OFF',
      message: `M5 (spindle off) not found. The spindle will keep running after the program ends.`,
    });
  }
  if (!hasProgramEnd) {
    issues.push({
      severity: 'info',
      line: 0,
      code: 'NO_PROGRAM_END',
      message: `M2/M30 (program end) not found. Some controllers require a program end marker.`,
    });
  }

  const hasErrors = issues.some((i) => i.severity === 'error');

  return {
    issues,
    lineCount: rawLines.length,
    valid: !hasErrors,
  };
}
