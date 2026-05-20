import { describe, it, expect, vi } from 'vitest';
import type { CutSheet } from '../../src/engine/types';
import {
  cutSheetToGcode,
  downloadAllSheetsGcode,
  downloadGcodeForSheet,
  circularPocketToGcode,
} from '../../src/utils/gcode-export';
import { mockSheet } from '../helpers';

describe('cutSheetToGcode', () => {
  it('returns a string containing G-code header', () => {
    const gc = cutSheetToGcode(mockSheet);
    expect(gc).toContain('G21');
    expect(gc).toContain('G90');
  });

  it('includes spindle on/off commands', () => {
    const gc = cutSheetToGcode(mockSheet);
    expect(gc).toContain('M3');
    expect(gc).toContain('M5');
  });

  it('ends with M2 program end', () => {
    const gc = cutSheetToGcode(mockSheet);
    expect(gc).toContain('M2');
  });

  it('includes part ID and dimensions in comment', () => {
    const gc = cutSheetToGcode(mockSheet);
    expect(gc).toContain('P01');
    expect(gc).toContain('300x600');
  });

  it('generates multi-pass cuts when thickness > passDepth', () => {
    const gc = cutSheetToGcode(mockSheet); // 18mm thick, 3mm pass = 6 passes
    // Each pass has a Z plunge line (G1 Z-...)
    const plunges = gc.split('\n').filter((l) => l.match(/^G1 Z-/));
    expect(plunges.length).toBe(6); // ceil(18/3) = 6
  });

  it('respects custom options', () => {
    const gc = cutSheetToGcode(mockSheet, { feedRate: 2000, toolDiameter: 8 });
    expect(gc).toContain('F2000');
    expect(gc).toContain('Tool diameter: 8');
  });

  it('handles empty parts list', () => {
    const empty: CutSheet = { ...mockSheet, parts: [] };
    const gc = cutSheetToGcode(empty);
    expect(gc).toContain('G21');
    expect(gc).toContain('M2');
    // No cut comments
    expect(gc).not.toContain('--- Cut:');
  });

  it('applies tool diameter offset to cut coordinates', () => {
    const gc = cutSheetToGcode(mockSheet, { toolDiameter: 6 });
    // Part at x=10, offset = 3, so first X position should be 7.00
    expect(gc).toContain('X7.00');
  });

  it('includes sheet info in header comment', () => {
    const gc = cutSheetToGcode(mockSheet);
    expect(gc).toContain('sheet 1');
    expect(gc).toContain('2440 x 1220');
  });

  it('generates rectangular profile (4 G1 moves per pass)', () => {
    const gc = cutSheetToGcode(mockSheet, { cutDepth: 3, passDepth: 3 });
    // 1 pass: plunge + 4 sides = 5 G1 lines total for the part
    const g1Lines = gc.split('\n').filter((l) => l.startsWith('G1'));
    expect(g1Lines.length).toBe(5); // 1 plunge + 4 rectangle sides
  });

  it('includes version header comment', () => {
    const gc = cutSheetToGcode(mockSheet);
    expect(gc).toContain('Cabinet Planner G-code Export');
    expect(gc).toContain('Schema: gcode-v1');
  });

  it('includes generatedAt ISO timestamp in header', () => {
    const gc = cutSheetToGcode(mockSheet);
    expect(gc).toMatch(/Generated: \d{4}-\d{2}-\d{2}T/);
  });
});

describe('downloadGcodeForSheet + downloadAllSheetsGcode', () => {
  function stubDownload() {
    const mockAnchor = document.createElement('a');
    vi.spyOn(mockAnchor, 'click').mockImplementation(() => {});
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    return mockAnchor;
  }

  it('downloadGcodeForSheet triggers a download', () => {
    const anchor = stubDownload();
    downloadGcodeForSheet(mockSheet, 'sheet1.nc');
    expect(anchor.click).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('downloadAllSheetsGcode combines multiple sheets with blank separator', () => {
    const anchor = stubDownload();
    const sheet2: CutSheet = { ...mockSheet, sheetIndex: 2 };
    downloadAllSheetsGcode([mockSheet, sheet2], 'MyProject');
    expect(anchor.click).toHaveBeenCalled();
    expect(anchor.download).toContain('MyProject');
    vi.restoreAllMocks();
  });
});

// ── circularPocketToGcode — Arc interpolation (Sprint 14) ─────────────────

describe('circularPocketToGcode', () => {
  it('produces G2 arc command when useArcs=true', () => {
    const gc = circularPocketToGcode(100, 100, 17.5, { useArcs: true });
    expect(gc).toContain('G2');
    expect(gc).not.toContain('G3'); // CW arc only
  });

  it('does NOT produce G2/G3 when useArcs=false', () => {
    const gc = circularPocketToGcode(100, 100, 17.5, { useArcs: false });
    expect(gc).not.toContain('G2');
    expect(gc).not.toContain('G3');
    // Linear polygon approximation uses G1 moves
    expect(gc).toContain('G1');
  });

  it('G2 arc has correct I offset (negative radius)', () => {
    const radius = 17.5;
    const toolDia = 6;
    const cutR = radius - toolDia / 2; // 14.5
    const gc = circularPocketToGcode(100, 100, radius, { useArcs: true, toolDiameter: toolDia });
    // I = -cutR = -14.500
    expect(gc).toContain(`I${(-cutR).toFixed(3)}`);
  });

  it('includes safe Z retract at end', () => {
    const gc = circularPocketToGcode(50, 50, 10, { useArcs: true, safeZ: 5 });
    expect(gc).toMatch(/G0 Z5\.0/);
  });

  it('includes plunge moves with plungeRate', () => {
    const gc = circularPocketToGcode(0, 0, 20, { useArcs: true, plungeRate: 400, cutDepth: 3, passDepth: 3 });
    expect(gc).toContain('F400');
  });

  it('emits a centre-point comment line', () => {
    const gc = circularPocketToGcode(50.5, 75.25, 17.5, { useArcs: true });
    expect(gc).toContain('50.50');
    expect(gc).toContain('75.25');
  });

  it('falls back to plunge-only when tool ≥ pocket radius', () => {
    // toolDiameter = 40, radius = 10 → cutR = 10-20 < 0
    const gc = circularPocketToGcode(0, 0, 10, { useArcs: true, toolDiameter: 40, cutDepth: 3, passDepth: 3 });
    expect(gc).toContain('plunge only');
    expect(gc).not.toContain('G2');
  });

  it('polygon mode produces 36 G1 arc steps per pass', () => {
    const gc = circularPocketToGcode(0, 0, 20, {
      useArcs: false,
      cutDepth: 3,
      passDepth: 3,
      toolDiameter: 6,
    });
    const g1Lines = gc.split('\n').filter((l) => l.startsWith('G1 X'));
    expect(g1Lines.length).toBe(36); // 1 pass × 36 steps
  });

  it('cutSheetToGcode includes useArcs option in merged defaults', () => {
    // cutSheetToGcode should accept useArcs without TypeScript errors
    const gc = cutSheetToGcode(mockSheet, { useArcs: true });
    // Sheet gcode format is unchanged (still rectangular G1 profiles)
    expect(gc).toContain('G21');
  });
});
