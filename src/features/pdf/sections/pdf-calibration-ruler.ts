export const CALIBRATION_RULER_LENGTH_MM = 100;

export function millimetresToPdfPoints(millimetres: number): number {
  return (millimetres * 72) / 25.4;
}

export function getCalibrationRulerTickPositions(): number[] {
  return Array.from({ length: 11 }, (_, index) => millimetresToPdfPoints(index * 10));
}
