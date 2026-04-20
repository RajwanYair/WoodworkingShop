import { describe, it, expect } from 'vitest';
import { cutSheetToDxf } from '../../src/utils/dxf-export';
import { mockSheet } from '../helpers';

describe('cutSheetToDxf', () => {
  it('returns a valid DXF string', () => {
    const dxf = cutSheetToDxf(mockSheet);
    expect(dxf).toContain('SECTION');
    expect(dxf).toContain('EOF');
  });

  it('includes HEADER with mm units', () => {
    const dxf = cutSheetToDxf(mockSheet);
    expect(dxf).toContain('$INSUNITS');
    expect(dxf).toContain('4'); // mm
  });

  it('defines SHEET, PARTS, LABELS layers', () => {
    const dxf = cutSheetToDxf(mockSheet);
    expect(dxf).toContain('SHEET');
    expect(dxf).toContain('PARTS');
    expect(dxf).toContain('LABELS');
  });

  it('includes LWPOLYLINE entities for sheet and parts', () => {
    const dxf = cutSheetToDxf(mockSheet);
    const polylines = dxf.split('LWPOLYLINE').length - 1;
    // 1 sheet outline + 1 per part
    expect(polylines).toBe(2);
  });

  it('includes TEXT label with part ID and dimensions', () => {
    const dxf = cutSheetToDxf(mockSheet);
    expect(dxf).toContain('P01 300x600');
  });

  it('handles empty parts list', () => {
    const empty: CutSheet = { ...mockSheet, parts: [] };
    const dxf = cutSheetToDxf(empty);
    expect(dxf).toContain('EOF');
    // Only sheet outline polyline
    const polylines = dxf.split('LWPOLYLINE').length - 1;
    expect(polylines).toBe(1);
  });
});
