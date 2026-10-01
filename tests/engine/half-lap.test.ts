import { describe, it, expect } from 'vitest';
import WOOD_MAGAZINE_HALF_LAP_ORACLE from '../fixtures/oracles/wood-magazine-half-lap-depth.json';
import { calculateHalfLap } from '../../src/engine/half-lap';

describe('calculateHalfLap', () => {
  it('notch depth is exactly half the board thickness', () => {
    const r = calculateHalfLap({
      board1ThicknessMm: 19,
      board1WidthMm: 90,
      board2ThicknessMm: 19,
      board2WidthMm: 90,
      lapType: 'end_lap',
    });
    expect(r.board1NotchDepthMm).toBe(9.5);
    expect(r.board2NotchDepthMm).toBe(9.5);
  });

  it('matches WOOD Magazine half-lap cut-depth guidance', () => {
    const result = calculateHalfLap({
      board1ThicknessMm: WOOD_MAGAZINE_HALF_LAP_ORACLE.boardThicknessMm,
      board1WidthMm: 90,
      board2ThicknessMm: WOOD_MAGAZINE_HALF_LAP_ORACLE.boardThicknessMm,
      board2WidthMm: 90,
      lapType: 'cross_lap',
    });

    expect(result.board1NotchDepthMm).toBe(WOOD_MAGAZINE_HALF_LAP_ORACLE.notchDepthMm);
    expect(result.board2NotchDepthMm).toBe(WOOD_MAGAZINE_HALF_LAP_ORACLE.notchDepthMm);
  });

  it('notch width of each board equals the width of the mating board', () => {
    const r = calculateHalfLap({
      board1ThicknessMm: 20,
      board1WidthMm: 100,
      board2ThicknessMm: 20,
      board2WidthMm: 60,
      lapType: 'cross_lap',
    });
    expect(r.board1NotchWidthMm).toBe(60); // equals board2Width
    expect(r.board2NotchWidthMm).toBe(100); // equals board1Width
  });

  it('totalGlueArea equals sum of both individual glue areas', () => {
    const r = calculateHalfLap({
      board1ThicknessMm: 20,
      board1WidthMm: 80,
      board2ThicknessMm: 20,
      board2WidthMm: 80,
      lapType: 't_lap',
    });
    expect(r.totalGlueAreaMm2).toBeCloseTo(r.board1GlueAreaMm2 + r.board2GlueAreaMm2, 3);
  });

  it('finishedThickness is the thicker board when boards differ', () => {
    const r = calculateHalfLap({
      board1ThicknessMm: 25,
      board1WidthMm: 90,
      board2ThicknessMm: 18,
      board2WidthMm: 90,
      lapType: 'end_lap',
    });
    expect(r.finishedThicknessMm).toBe(25);
  });

  it('matches the asymmetric half-lap cut and glue-area oracle', () => {
    expect(
      calculateHalfLap({
        board1ThicknessMm: 19,
        board1WidthMm: 90,
        board2ThicknessMm: 18,
        board2WidthMm: 60,
        lapType: 'cross_lap',
      }),
    ).toEqual({
      board1NotchDepthMm: 9.5,
      board1NotchWidthMm: 60,
      board2NotchDepthMm: 9,
      board2NotchWidthMm: 90,
      board1GlueAreaMm2: 570,
      board2GlueAreaMm2: 810,
      totalGlueAreaMm2: 1380,
      finishedThicknessMm: 19,
    });
  });

  it.each([
    [
      'board1ThicknessMm = 0',
      {
        board1ThicknessMm: 0,
        board1WidthMm: 90,
        board2ThicknessMm: 19,
        board2WidthMm: 90,
        lapType: 'end_lap' as const,
      },
    ],
    [
      'board1WidthMm = 0',
      {
        board1ThicknessMm: 19,
        board1WidthMm: 0,
        board2ThicknessMm: 19,
        board2WidthMm: 90,
        lapType: 'end_lap' as const,
      },
    ],
    [
      'board2ThicknessMm = 0',
      {
        board1ThicknessMm: 19,
        board1WidthMm: 90,
        board2ThicknessMm: 0,
        board2WidthMm: 90,
        lapType: 'end_lap' as const,
      },
    ],
    [
      'board2WidthMm = 0',
      {
        board1ThicknessMm: 19,
        board1WidthMm: 90,
        board2ThicknessMm: 19,
        board2WidthMm: 0,
        lapType: 'end_lap' as const,
      },
    ],
    [
      'NaN board1ThicknessMm',
      {
        board1ThicknessMm: Number.NaN,
        board1WidthMm: 90,
        board2ThicknessMm: 19,
        board2WidthMm: 90,
        lapType: 'end_lap' as const,
      },
    ],
    [
      'infinite board2WidthMm',
      {
        board1ThicknessMm: 19,
        board1WidthMm: 90,
        board2ThicknessMm: 19,
        board2WidthMm: Number.POSITIVE_INFINITY,
        lapType: 'end_lap' as const,
      },
    ],
    [
      'overflowing glue area',
      {
        board1ThicknessMm: Number.MAX_VALUE,
        board1WidthMm: 90,
        board2ThicknessMm: 19,
        board2WidthMm: 90,
        lapType: 'end_lap' as const,
      },
    ],
  ])('throws RangeError for invalid input: %s', (_label, input) => {
    expect(() => calculateHalfLap(input)).toThrow(RangeError);
  });

  it('all three lap types produce the same notch dimensions for same-sized boards', () => {
    const base = { board1ThicknessMm: 19, board1WidthMm: 90, board2ThicknessMm: 19, board2WidthMm: 90 };
    const end = calculateHalfLap({ ...base, lapType: 'end_lap' });
    const t_lap = calculateHalfLap({ ...base, lapType: 't_lap' });
    const cross = calculateHalfLap({ ...base, lapType: 'cross_lap' });
    expect(end.board1NotchDepthMm).toBe(t_lap.board1NotchDepthMm);
    expect(t_lap.board1NotchDepthMm).toBe(cross.board1NotchDepthMm);
    expect(end.totalGlueAreaMm2).toBe(t_lap.totalGlueAreaMm2);
  });
});
