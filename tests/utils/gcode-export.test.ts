import { describe, it, expect } from 'vitest';
import { cutSheetToGcode } from '../../src/utils/gcode-export';
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
});
