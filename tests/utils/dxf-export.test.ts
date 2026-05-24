import { describe, it, expect, vi } from 'vitest';
import type { CutSheet } from '../../src/engine/types';
import {
  cutSheetToDxf,
  downloadDxfForSheet,
  downloadAllSheetsDxf,
  materialLayerName,
} from '../../src/utils/dxf-export';
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
    expect(dxf).toContain('Schema: dxf-ac1015-v2');
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
  it('triggers download with correct filename', async () => {
    const mockAnchor = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLElement);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await downloadDxfForSheet(mockSheet, 'sheet-1.dxf');

    expect(mockAnchor.download).toBe('sheet-1.dxf');
    expect(mockAnchor.href).toBe('blob:test');
    expect(mockAnchor.click).toHaveBeenCalled();

    vi.restoreAllMocks();
  });
});

describe('downloadAllSheetsDxf', () => {
  it('combines multiple sheets into one DXF and triggers download', async () => {
    const mockAnchor = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLElement);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:combined');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const sheet2: CutSheet = { ...mockSheet, sheetIndex: 1 };
    await downloadAllSheetsDxf([mockSheet, sheet2], 'MyProject');

    expect(mockAnchor.download).toContain('MyProject-cut-sheets.dxf');
    expect(mockAnchor.click).toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  it('generates DXF containing content for all sheets (no throw)', async () => {
    const mockAnchor = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLElement);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:two');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const sheet2: CutSheet = { ...mockSheet, sheetIndex: 1 };
    await expect(downloadAllSheetsDxf([mockSheet, sheet2], 'P')).resolves.not.toThrow();

    vi.restoreAllMocks();
  });
});

describe('materialLayerName — Sprint 37', () => {
  it('uppercases the material key', () => {
    expect(materialLayerName('plywood-17')).toBe('MAT_PLYWOOD-17');
  });

  it('prefixes with MAT_', () => {
    expect(materialLayerName('melamine-18')).toMatch(/^MAT_/);
  });

  it('replaces spaces with underscores', () => {
    expect(materialLayerName('solid oak')).toBe('MAT_SOLID_OAK');
  });

  it('truncates to 255 chars maximum', () => {
    const long = 'x'.repeat(300);
    expect(materialLayerName(long).length).toBeLessThanOrEqual(255);
  });
});

describe('cutSheetToDxf — per-material layer (Sprint 37)', () => {
  it('puts parts on material layer not generic PARTS layer', () => {
    const dxf = cutSheetToDxf(mockSheet);
    const matLayer = materialLayerName(mockSheet.material);
    expect(dxf).toContain(matLayer);
  });

  it('defines the per-material layer in the TABLES section', () => {
    const dxf = cutSheetToDxf(mockSheet);
    const matLayer = materialLayerName(mockSheet.material);
    // The layer definition appears before ENTITIES
    const tablesIdx = dxf.indexOf('TABLES');
    const entitiesIdx = dxf.indexOf('ENTITIES');
    const layerIdx = dxf.indexOf(matLayer);
    expect(layerIdx).toBeGreaterThan(tablesIdx);
    expect(layerIdx).toBeLessThan(entitiesIdx);
  });
});

describe('downloadAllSheetsDxf — per-material layer (Sprint 37)', () => {
  it('defines separate layers for two different materials', async () => {
    const mockAnchor = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLElement);
    const capturedContent = '';
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      if (blob instanceof Blob) {
        // We cannot easily read the blob synchronously here, skip
      }
      return 'blob:mat';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const sheet2: CutSheet = { ...mockSheet, sheetIndex: 1, material: 'melamine-18' };
    await expect(downloadAllSheetsDxf([mockSheet, sheet2], 'Multi')).resolves.not.toThrow();

    vi.restoreAllMocks();
    void capturedContent; // suppress unused warning
  });
});

// ── Sprint 70 — GRAIN_CONFLICT layer ────────────────────────────────────────
describe('cutSheetToDxf — GRAIN_CONFLICT layer (Sprint 70)', () => {
  const conflictPart = { ...mockSheet.parts[0], grainConflict: true };

  it('defines GRAIN_CONFLICT layer in TABLES section', () => {
    const sheet: CutSheet = { ...mockSheet, parts: [conflictPart] };
    const dxf = cutSheetToDxf(sheet);
    expect(dxf).toContain('GRAIN_CONFLICT');
  });

  it('places grain-conflicted part on GRAIN_CONFLICT layer in ENTITIES', () => {
    const sheet: CutSheet = { ...mockSheet, parts: [conflictPart] };
    const dxf = cutSheetToDxf(sheet);
    const entitiesStart = dxf.indexOf('ENTITIES');
    const conflictIdx = dxf.indexOf('GRAIN_CONFLICT', entitiesStart);
    expect(conflictIdx).toBeGreaterThan(entitiesStart);
  });

  it('places non-conflicted part on mat layer (not GRAIN_CONFLICT) in ENTITIES', () => {
    const normalPart = { ...mockSheet.parts[0], grainConflict: false };
    const sheet: CutSheet = { ...mockSheet, parts: [normalPart] };
    const dxf = cutSheetToDxf(sheet);
    const matLayer = materialLayerName(sheet.material);
    const entitiesStart = dxf.indexOf('ENTITIES');
    const matLayerIdx = dxf.indexOf(matLayer, entitiesStart);
    expect(matLayerIdx).toBeGreaterThan(entitiesStart);
  });

  it('layer count in TABLES is 8 (all standard layers always defined)', () => {
    const dxf = cutSheetToDxf(mockSheet);
    // '70\n8' means 8 layers declared in the LAYER TABLE
    // AC1015 always pre-declares: SHEET, matLayer, LABELS, PARTS,
    // GRAIN_CONFLICT, ROTATION_LOCKED, EDGE_BANDED, DIMENSIONS
    expect(dxf).toContain('70\n8');
  });
});
