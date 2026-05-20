import { describe, it, expect } from 'vitest';
import { validateGcode } from '../../src/engine/gcode-validator';

// ─── Minimal valid G-code snippets ────────────────────────────────────────────

const VALID_GCODE = `
G21 ; mm mode
G90 ; absolute positioning
G0 Z5.0 ; retract
M3 S18000 ; spindle on
G0 X10 Y10
G1 Z-3 F600
G1 X50 Y50 F1500
G0 Z5.0
M5 ; spindle off
G0 X0 Y0
M2 ; end
`.trim();

describe('validateGcode', () => {
  it('returns valid=true for well-formed G-code', () => {
    const result = validateGcode(VALID_GCODE);
    const errors = result.issues.filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
    expect(result.valid).toBe(true);
  });

  it('reports NO_METRIC_MODE when G21 is absent', () => {
    const gcode = VALID_GCODE.replace('G21 ; mm mode\n', '');
    const result = validateGcode(gcode);
    expect(result.issues.some((i) => i.code === 'NO_METRIC_MODE')).toBe(true);
  });

  it('reports NO_ABSOLUTE_MODE when G90 is absent', () => {
    const gcode = VALID_GCODE.replace('G90 ; absolute positioning\n', '');
    const result = validateGcode(gcode);
    expect(result.issues.some((i) => i.code === 'NO_ABSOLUTE_MODE')).toBe(true);
  });

  it('reports NO_SPINDLE_ON when M3/M4 is absent', () => {
    const gcode = VALID_GCODE.replace('M3 S18000 ; spindle on\n', '');
    const result = validateGcode(gcode);
    const issue = result.issues.find((i) => i.code === 'NO_SPINDLE_ON');
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('error');
  });

  it('reports NO_SPINDLE_OFF when M5 is absent', () => {
    const gcode = VALID_GCODE.replace('M5 ; spindle off\n', '');
    const result = validateGcode(gcode);
    expect(result.issues.some((i) => i.code === 'NO_SPINDLE_OFF')).toBe(true);
  });

  it('reports CUTTING_NO_FEED when a Z-plunge move has no active feed', () => {
    const gcode = `
G21
G90
G0 Z5.0
M3 S18000
G0 X10 Y10
G1 Z-3
M5
M2
`.trim();
    const result = validateGcode(gcode);
    expect(result.issues.some((i) => i.code === 'CUTTING_NO_FEED')).toBe(true);
  });

  it('reports FEED_TOO_LOW for a dangerously low feed rate', () => {
    const gcode = VALID_GCODE.replace('G1 Z-3 F600', 'G1 Z-3 F10');
    const result = validateGcode(gcode);
    expect(result.issues.some((i) => i.code === 'FEED_TOO_LOW')).toBe(true);
  });

  it('reports FEED_TOO_HIGH for an unrealistically high feed rate', () => {
    const gcode = VALID_GCODE.replace('G1 X50 Y50 F1500', 'G1 X50 Y50 F99999');
    const result = validateGcode(gcode);
    expect(result.issues.some((i) => i.code === 'FEED_TOO_HIGH')).toBe(true);
  });

  it('reports ARC_NO_CENTER for a G2 arc missing I/J/R', () => {
    const gcode = `
G21
G90
G0 Z5.0
M3 S18000
G0 X10 Y10
G1 Z-3 F600
G2 X50 Y50 F1500
G0 Z5.0
M5
M2
`.trim();
    const result = validateGcode(gcode);
    expect(result.issues.some((i) => i.code === 'ARC_NO_CENTER')).toBe(true);
  });

  it('reports ARC_RADIUS_TOO_SMALL for a near-zero radius arc', () => {
    const gcode = `
G21
G90
G0 Z5.0
M3 S18000
G0 X10 Y10
G1 Z-3 F600
G2 X10.001 Y10.001 R0.00001 F1500
G0 Z5.0
M5
M2
`.trim();
    const result = validateGcode(gcode);
    expect(result.issues.some((i) => i.code === 'ARC_RADIUS_TOO_SMALL')).toBe(true);
  });

  it('returns lineCount equal to the number of lines', () => {
    const result = validateGcode(VALID_GCODE);
    expect(result.lineCount).toBe(VALID_GCODE.split('\n').length);
  });

  it('handles empty G-code without throwing', () => {
    const result = validateGcode('');
    expect(result.lineCount).toBeGreaterThanOrEqual(0);
    // Empty file will have file-level warnings/errors but must not throw
    expect(Array.isArray(result.issues)).toBe(true);
  });
});
