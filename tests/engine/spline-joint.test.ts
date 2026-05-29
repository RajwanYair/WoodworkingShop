import { describe, expect, it } from 'vitest';
import { calculateSplineJoint } from '../../src/engine/spline-joint';

describe('calculateSplineJoint', () => {
  it('computes recommended slot width with glue clearance', () => {
    const result = calculateSplineJoint({
      boardThicknessMm: 19,
      splineThicknessMm: 3,
      slotDepthPerBoardMm: 6,
      jointLengthMm: 120,
      splineCount: 2,
    });

    expect(result.recommendedSlotWidthMm).toBe(3.1);
  });

  it('computes insertion depth and remaining wall thickness', () => {
    const result = calculateSplineJoint({
      boardThicknessMm: 18,
      splineThicknessMm: 3,
      slotDepthPerBoardMm: 5,
      jointLengthMm: 80,
      splineCount: 1,
    });

    expect(result.totalInsertionDepthMm).toBe(10);
    expect(result.remainingWallThicknessMm).toBe(13);
  });

  it('computes glue area and spline length for multiple splines', () => {
    const result = calculateSplineJoint({
      boardThicknessMm: 20,
      splineThicknessMm: 4,
      slotDepthPerBoardMm: 6,
      jointLengthMm: 150,
      splineCount: 3,
    });

    expect(result.totalSplineLengthMm).toBe(450);
    expect(result.glueAreaPerSplineMm2).toBe(3600);
    expect(result.totalGlueAreaMm2).toBe(10800);
  });

  it.each([
    [
      'board thickness <= 0',
      {
        boardThicknessMm: 0,
        splineThicknessMm: 3,
        slotDepthPerBoardMm: 6,
        jointLengthMm: 100,
        splineCount: 1,
      },
    ],
    [
      'spline thickness <= 0',
      {
        boardThicknessMm: 19,
        splineThicknessMm: 0,
        slotDepthPerBoardMm: 6,
        jointLengthMm: 100,
        splineCount: 1,
      },
    ],
    [
      'slot depth <= 0',
      {
        boardThicknessMm: 19,
        splineThicknessMm: 3,
        slotDepthPerBoardMm: 0,
        jointLengthMm: 100,
        splineCount: 1,
      },
    ],
    [
      'joint length <= 0',
      {
        boardThicknessMm: 19,
        splineThicknessMm: 3,
        slotDepthPerBoardMm: 6,
        jointLengthMm: 0,
        splineCount: 1,
      },
    ],
    [
      'spline count is not positive integer',
      {
        boardThicknessMm: 19,
        splineThicknessMm: 3,
        slotDepthPerBoardMm: 6,
        jointLengthMm: 100,
        splineCount: 0,
      },
    ],
    [
      'spline thickness >= board thickness',
      {
        boardThicknessMm: 19,
        splineThicknessMm: 19,
        slotDepthPerBoardMm: 6,
        jointLengthMm: 100,
        splineCount: 1,
      },
    ],
    [
      'slot depth >= board thickness',
      {
        boardThicknessMm: 19,
        splineThicknessMm: 3,
        slotDepthPerBoardMm: 19,
        jointLengthMm: 100,
        splineCount: 1,
      },
    ],
  ])('throws RangeError when %s', (_label, input) => {
    expect(() => calculateSplineJoint(input)).toThrow(RangeError);
  });
});
