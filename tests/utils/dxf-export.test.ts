import { describe, it, expect, vi } from 'vitest';
import type { CutSheet } from '../../src/engine/types';
import { cutSheetToDxf, downloadDxfForSheet, downloadAllSheetsDxf } from '../../src/utils/dxf-export';
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

  it('includes version header comment', () => {
    const dxf = cutSheetToDxf(mockSheet);
    expect(dxf).toContain('Cabinet Planner DXF Export');
    expect(dxf).toContain('Schema: dxf-r12-v1');
  });

  it('includes generatedAt ISO timestamp in header', () => {
    const dxf = cutSheetToDxf(mockSheet);
    expect(dxf).toMatch(/Generated: \d{4}-\d{2}-\d{2}T/);
  });

  it('includes Parts count in header (Sprint 9)', () => {
    const dxf = cutSheetToDxf(mockSheet);
    expect(dxf).toContain(`Parts: ${mockSheet.parts.length}`);
  });
});

describe('downloadDxfForSheet', () => {
  it('triggers download with correct filename', () => {
    const mockAnchor = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLElement);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    downloadDxfForSheet(mockSheet, 'sheet-1.dxf');

    expect(mockAnchor.download).toBe('sheet-1.dxf');
    expect(mockAnchor.href).toBe('blob:test');
    expect(mockAnchor.click).toHaveBeenCalled();

    vi.restoreAllMocks();
  });
});

describe('downloadAllSheetsDxf', () => {
  it('combines multiple sheets into one DXF and triggers download', () => {
    const mockAnchor = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLElement);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:combined');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const sheet2: CutSheet = { ...mockSheet, sheetIndex: 1 };
    downloadAllSheetsDxf([mockSheet, sheet2], 'MyProject');

    expect(mockAnchor.download).toContain('MyProject-cut-sheets.dxf');
    expect(mockAnchor.click).toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  it('generates DXF containing content for all sheets (no throw)', () => {
    const mockAnchor = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLElement);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:two');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const sheet2: CutSheet = { ...mockSheet, sheetIndex: 1 };
    expect(() => downloadAllSheetsDxf([mockSheet, sheet2], 'P')).not.toThrow();

    vi.restoreAllMocks();
  });
});
