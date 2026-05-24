import type { CutSheet } from '../../engine/types';

/** Sprint 147: compute usable free strips per sheet.
 *  Strategy: find the largest axis-aligned free rectangle by checking
 *  the right-side strip (after maxX of all parts) and bottom strip (after maxY).
 *  Only strips ≥ 100 mm in both dimensions are reported. */
export function computeOffcuts(sheet: CutSheet): { w: number; h: number; area: number }[] {
  const MIN = 100; // mm
  if (sheet.parts.length === 0) {
    // Entirely empty sheet
    if (sheet.sheetWidth >= MIN && sheet.sheetLength >= MIN) {
      return [{ w: sheet.sheetWidth, h: sheet.sheetLength, area: sheet.sheetWidth * sheet.sheetLength }];
    }
    return [];
  }
  const offcuts: { w: number; h: number; area: number }[] = [];
  const maxX = Math.max(...sheet.parts.map((p) => p.x + p.width));
  const maxY = Math.max(...sheet.parts.map((p) => p.y + p.length));
  // Right strip: from maxX to sheetWidth, full height
  const rightW = sheet.sheetWidth - maxX;
  if (rightW >= MIN && sheet.sheetLength >= MIN) {
    offcuts.push({ w: rightW, h: sheet.sheetLength, area: rightW * sheet.sheetLength });
  }
  // Bottom strip: full width, from maxY to sheetLength
  const bottomH = sheet.sheetLength - maxY;
  if (sheet.sheetWidth >= MIN && bottomH >= MIN) {
    offcuts.push({ w: sheet.sheetWidth, h: bottomH, area: sheet.sheetWidth * bottomH });
  }
  return offcuts;
}
