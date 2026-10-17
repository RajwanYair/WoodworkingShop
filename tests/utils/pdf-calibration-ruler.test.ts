import { describe, expect, it } from 'vitest';
import {
  CALIBRATION_RULER_LENGTH_MM,
  getCalibrationRulerTickPositions,
  millimetresToPdfPoints,
} from '../../src/features/pdf/sections/pdf-calibration-ruler';

describe('PDF calibration ruler geometry', () => {
  it('maps 100 mm to its exact physical PDF length with 10 mm tick intervals', () => {
    const ticks = getCalibrationRulerTickPositions();

    expect(CALIBRATION_RULER_LENGTH_MM).toBe(100);
    expect(millimetresToPdfPoints(100)).toBeCloseTo(283.4645669291, 8);
    expect(ticks).toHaveLength(11);
    expect(ticks[0]).toBe(0);
    expect(ticks[10]).toBeCloseTo(millimetresToPdfPoints(100), 8);
    for (const [index, tick] of ticks.entries()) {
      expect(tick).toBeCloseTo(millimetresToPdfPoints(index * 10), 8);
    }
  });
});
