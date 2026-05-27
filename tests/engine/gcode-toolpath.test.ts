import { describe, it, expect } from 'vitest';
import { parseToolpath } from '../../src/engine/gcode-toolpath';

describe('parseToolpath — empty / no-motion input', () => {
  it('returns zero moves for empty string', () => {
    const result = parseToolpath('');
    expect(result.moves).toHaveLength(0);
  });

  it('returns default 100×100 bounds when no motion exists', () => {
    const result = parseToolpath('');
    expect(result.bounds).toEqual({ minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 });
  });

  it('ignores lines without X or Y', () => {
    const result = parseToolpath('G0\nG1 F500\nM3 S1000');
    expect(result.moves).toHaveLength(0);
  });

  it('strips parenthesis comments before parsing', () => {
    const result = parseToolpath('G1 X10 Y20 (this is a comment)');
    expect(result.moves[0].x2).toBe(10);
    expect(result.moves[0].y2).toBe(20);
  });

  it('strips semicolon comments before parsing', () => {
    const result = parseToolpath('G1 X15 Y25 ; end comment');
    expect(result.moves[0].x2).toBe(15);
    expect(result.moves[0].y2).toBe(25);
  });
});

describe('parseToolpath — G0 / G1 linear moves', () => {
  it('parses G0 rapid move', () => {
    const { moves } = parseToolpath('G0 X10 Y20');
    expect(moves).toHaveLength(1);
    expect(moves[0].kind).toBe('rapid');
    expect(moves[0].x1).toBe(0);
    expect(moves[0].y1).toBe(0);
    expect(moves[0].x2).toBe(10);
    expect(moves[0].y2).toBe(20);
  });

  it('parses G1 cut move', () => {
    const { moves } = parseToolpath('G1 X30 Y40');
    expect(moves[0].kind).toBe('cut');
    expect(moves[0].x2).toBe(30);
    expect(moves[0].y2).toBe(40);
  });

  it('G1 modal persists across subsequent lines', () => {
    const { moves } = parseToolpath('G1 X10 Y10\nX20 Y20\nX30 Y30');
    expect(moves).toHaveLength(3);
    expect(moves[1].kind).toBe('cut');
    expect(moves[2].kind).toBe('cut');
  });

  it('Y-only move retains current X position', () => {
    const { moves } = parseToolpath('G1 X10 Y0\nG1 Y50');
    expect(moves[1].x2).toBe(10);
    expect(moves[1].y2).toBe(50);
  });

  it('X-only move retains current Y position', () => {
    const { moves } = parseToolpath('G1 X0 Y15\nG1 X80');
    expect(moves[1].y2).toBe(15);
    expect(moves[1].x2).toBe(80);
  });
});

describe('parseToolpath — G2/G3 arc moves', () => {
  it('parses G2 clockwise arc', () => {
    const { moves } = parseToolpath('G2 X50 Y50 I5 J0');
    expect(moves[0].kind).toBe('arc');
    expect(moves[0].cw).toBe(true);
    expect(moves[0].i).toBe(5);
    expect(moves[0].j).toBe(0);
  });

  it('parses G3 counter-clockwise arc', () => {
    const { moves } = parseToolpath('G3 X50 Y50 I0 J5');
    expect(moves[0].kind).toBe('arc');
    expect(moves[0].cw).toBe(false);
    expect(moves[0].j).toBe(5);
  });

  it('defaults I and J to 0 when omitted', () => {
    const { moves } = parseToolpath('G2 X30 Y30');
    expect(moves[0].i).toBe(0);
    expect(moves[0].j).toBe(0);
  });
});

describe('parseToolpath — bounding box', () => {
  it('computes correct bounding box from moves', () => {
    const { bounds } = parseToolpath('G0 X0 Y0\nG1 X100 Y80');
    expect(bounds.maxX).toBeGreaterThanOrEqual(100);
    expect(bounds.maxY).toBeGreaterThanOrEqual(80);
    expect(bounds.width).toBeGreaterThan(0);
    expect(bounds.height).toBeGreaterThan(0);
  });

  it('minX/minY are non-negative for positive coordinates', () => {
    const { bounds } = parseToolpath('G0 X5 Y10\nG1 X50 Y60');
    expect(bounds.minX).toBeGreaterThanOrEqual(0);
    expect(bounds.minY).toBeGreaterThanOrEqual(0);
  });
});
