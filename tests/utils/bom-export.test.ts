import { describe, it, expect, vi } from 'vitest';
import {
  generateBomCsv,
  generateHardwareCsv,
  downloadHardwareCsv,
  generateErpCsv,
  downloadErpCsv,
} from '../../src/utils/bom-export';
import type { Part, HardwareItem } from '../../src/engine/types';

const mockPart: Part = {
  id: 'P01',
  name: { en: 'Side Panel', he: 'לוח צד' },
  qty: 2,
  material: 'melamine-18',
  thickness: 18,
  length: 2000,
  width: 580,
  edgeBanding: { en: 'Front edge', he: 'קצה קדמי' },
};

const mockHardware: HardwareItem = {
  id: 'hinge',
  name: { en: 'Hinge 35mm', he: 'ציר 35 מ"מ' },
  qty: 4,
  unit: { en: 'pcs', he: 'יח׳' },
};

const singleCabinet = [
  {
    name: 'Cabinet A',
    parts: [mockPart],
    hardware: [mockHardware],
  },
];

describe('generateBomCsv', () => {
  it('starts with a material summary section', () => {
    const csv = generateBomCsv(singleCabinet, 'en');
    const lines = csv.split('\n');
    // Sprint 4 added 4 metadata comment rows before Material Summary
    const summaryIdx = lines.findIndex((l) => l.includes('Material Summary'));
    expect(summaryIdx).toBeGreaterThanOrEqual(0);
    expect(lines[summaryIdx + 1]).toContain('Total Area');
    expect(lines[summaryIdx + 1]).toContain('Board-Feet');
  });

  it('includes a parts header row after the summary', () => {
    const csv = generateBomCsv(singleCabinet, 'en');
    const lines = csv.split('\n');
    const headerIdx = lines.findIndex((l) => l.includes('Part ID') && l.includes('Thickness'));
    expect(headerIdx).toBeGreaterThan(0);
  });

  it('includes part rows with correct EN values', () => {
    const csv = generateBomCsv(singleCabinet, 'en');
    expect(csv).toContain('Side Panel');
    expect(csv).toContain('Melamine 18 mm');
    expect(csv).toContain('2000');
    expect(csv).toContain('580');
  });

  it('uses Hebrew values when lang=he', () => {
    const csv = generateBomCsv(singleCabinet, 'he');
    expect(csv).toContain('לוח צד');
    expect(csv).toContain('קצה קדמי');
  });

  it('includes hardware section after parts section', () => {
    const csv = generateBomCsv(singleCabinet, 'en');
    const lines = csv.split('\n');
    // Find the last blank line which separates parts from hardware
    const lastBlankIdx = lines
      .map((l, i) => ({ l, i }))
      .filter(({ l }) => l.trim() === '')
      .at(-1)!.i;
    expect(lines[lastBlankIdx + 1]).toContain('Hardware');
    expect(csv).toContain('Hinge 35mm');
    expect(csv).toContain('4');
  });

  it('handles multiple cabinets', () => {
    const cabs = [
      { name: 'Upper', parts: [mockPart], hardware: [] },
      { name: 'Lower', parts: [mockPart], hardware: [mockHardware] },
    ];
    const csv = generateBomCsv(cabs, 'en');
    expect(csv).toContain('Upper');
    expect(csv).toContain('Lower');
  });

  it('material summary row has correct area for a single material', () => {
    // mockPart: qty=2, length=2000, width=580 → area = 2*2000*580 = 2,320,000 mm² = 2.320 m²
    const csv = generateBomCsv(singleCabinet, 'en');
    expect(csv).toContain('2.320');
  });

  it('aggregates area for same material across multiple cabinets', () => {
    const cabs = [
      { name: 'Upper', parts: [mockPart], hardware: [] },
      { name: 'Lower', parts: [mockPart], hardware: [] },
    ];
    // total area = 2 × 2,320,000 mm² = 4,640,000 mm² = 4.640 m²
    const csv = generateBomCsv(cabs, 'en');
    expect(csv).toContain('4.640');
  });

  it('handles empty cabinets array', () => {
    const csv = generateBomCsv([], 'en');
    const lines = csv.split('\n').filter((l) => l.trim() !== '');
    // Material Summary header + column header + parts header + hardware header = 4 lines minimum
    expect(lines.length).toBeGreaterThanOrEqual(3);
  });

  it('escapes fields containing commas', () => {
    const partWithComma: Part = {
      ...mockPart,
      name: { en: 'Panel, Large', he: 'לוח, גדול' },
    };
    const csv = generateBomCsv([{ name: 'Test', parts: [partWithComma], hardware: [] }], 'en');
    expect(csv).toContain('"Panel, Large"');
  });

  it('escapes fields containing double quotes', () => {
    const partWithQuote: Part = {
      ...mockPart,
      name: { en: 'Panel 18"', he: 'לוח 18"' },
    };
    const csv = generateBomCsv([{ name: 'Test', parts: [partWithQuote], hardware: [] }], 'en');
    expect(csv).toContain('"Panel 18""');
  });

  it('falls back to material key for unknown materials', () => {
    const unknownPart: Part = {
      ...mockPart,
      material: 'unicorn-wood-99',
    };
    const csv = generateBomCsv([{ name: 'X', parts: [unknownPart], hardware: [] }], 'en');
    expect(csv).toContain('unicorn-wood-99');
  });

  // ── Sprint 20: multi-cabinet Part ID prefix ────────────────────────────────

  it('does NOT prefix Part ID in single-cabinet export', () => {
    const csv = generateBomCsv(singleCabinet, 'en');
    // With one cabinet, P01 should appear as-is
    expect(csv).toContain(',P01,');
    expect(csv).not.toContain('C1-P01');
  });

  it('prefixes Part ID with cabinet index in multi-cabinet export', () => {
    const cabs = [
      { name: 'Upper', parts: [{ ...mockPart, id: 'P01' }], hardware: [] },
      { name: 'Lower', parts: [{ ...mockPart, id: 'P01' }], hardware: [] },
    ];
    const csv = generateBomCsv(cabs, 'en');
    expect(csv).toContain('C1-P01');
    expect(csv).toContain('C2-P01');
    // Original bare P01 should not appear in multi-cabinet mode
    expect(csv).not.toMatch(/,P01,/);
  });

  it('multi-cabinet prefix increments correctly for 3 cabinets', () => {
    const cabs = [
      { name: 'A', parts: [{ ...mockPart, id: 'P01' }], hardware: [] },
      { name: 'B', parts: [{ ...mockPart, id: 'P01' }], hardware: [] },
      { name: 'C', parts: [{ ...mockPart, id: 'P01' }], hardware: [] },
    ];
    const csv = generateBomCsv(cabs, 'en');
    expect(csv).toContain('C1-P01');
    expect(csv).toContain('C2-P01');
    expect(csv).toContain('C3-P01');
  });

  it('includes version header line', () => {
    const csv = generateBomCsv(singleCabinet, 'en');
    expect(csv).toContain('Cabinet Planner BOM Export');
    expect(csv).toContain('Schema: bom-csv-v1');
  });

  it('includes generatedAt ISO timestamp in header', () => {
    const csv = generateBomCsv(singleCabinet, 'en');
    expect(csv).toMatch(/Generated: \d{4}-\d{2}-\d{2}T/);
  });
});

describe('generateHardwareCsv', () => {
  it('includes header row and hardware line', () => {
    const csv = generateHardwareCsv([{ name: 'Cabinet A', hardware: [mockHardware] }], 'en');
    expect(csv).toContain('Hardware ID');
    expect(csv).toContain('Hinge 35mm');
    expect(csv).toContain('Cabinet A');
  });

  it('renders Hebrew hardware names when lang=he', () => {
    const csv = generateHardwareCsv([{ name: 'ארון', hardware: [mockHardware] }], 'he');
    // name.he = 'ציר 35 מ"מ' — the " gets CSV-escaped to "" inside quoted field
    expect(csv).toContain('35');
    expect(csv).toContain('יח');
  });

  it('handles empty hardware list', () => {
    const csv = generateHardwareCsv([{ name: 'Empty', hardware: [] }], 'en');
    expect(csv).toContain('Hardware ID');
    // Only the header row — no hardware entries
    expect(csv.split('\n').length).toBe(1);
  });

  it('triggerDownload is called from downloadHardwareCsv', () => {
    const mockAnchor = document.createElement('a');
    vi.spyOn(mockAnchor, 'click').mockImplementation(() => {});
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    downloadHardwareCsv([{ name: 'Cabinet A', hardware: [mockHardware] }], 'en');
    expect(mockAnchor.click).toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});

// Sprint 9 — machine-readable metadata in BOM header
describe('generateBomCsv — Sprint 9 metadata', () => {
  it('includes cabinet count in header', () => {
    const cabs = [
      { name: 'C1', parts: [mockPart], hardware: [] },
      { name: 'C2', parts: [mockPart], hardware: [] },
    ];
    const csv = generateBomCsv(cabs, 'en');
    expect(csv).toContain('Cabinets: 2');
  });

  it('includes total parts count (sum of qty) in header', () => {
    // mockPart.qty = 2, so total parts = 2
    const cabs = [{ name: 'C1', parts: [mockPart], hardware: [] }];
    const csv = generateBomCsv(cabs, 'en');
    expect(csv).toContain('Parts: 2');
  });

  it('includes hardware count (sum of qty) in header', () => {
    // mockHardware.qty = 4
    const cabs = [{ name: 'C1', parts: [], hardware: [mockHardware] }];
    const csv = generateBomCsv(cabs, 'en');
    expect(csv).toContain('Hardware: 4');
  });

  it('shows Cabinets: 0 for empty list', () => {
    const csv = generateBomCsv([], 'en');
    expect(csv).toContain('Cabinets: 0');
  });
});

// ── Sprint 23: ERP / MRP / CAM normalised export (Phase 6) ───────────────────
describe('generateErpCsv', () => {
  it('contains the schema version comment header', () => {
    const csv = generateErpCsv(singleCabinet);
    expect(csv).toContain('#schema');
    expect(csv).toContain('bom-erp-csv-v1');
  });

  it('has snake_case column headers required for ERP ingestion', () => {
    const csv = generateErpCsv(singleCabinet);
    const headerLine = csv.split('\n').find((l) => l.startsWith('part_no'));
    expect(headerLine).toBeDefined();
    expect(headerLine).toContain('material_key');
    expect(headerLine).toContain('area_m2');
    expect(headerLine).toContain('grain_direction');
    expect(headerLine).toContain('unit_weight_kg');
  });

  it('encodes grain direction as along_length for grain materials', () => {
    // plywood-17 has hasGrain=true in the engine
    const grainPart: Part = { ...mockPart, material: 'plywood-17' };
    const csv = generateErpCsv([{ name: 'Cabinet A', parts: [grainPart] }]);
    expect(csv).toContain('along_length');
  });

  it('computes area_m2 correctly (qty × length × width / 1e6)', () => {
    // mockPart: qty=2, length=2000, width=580 → total area = 2*2000*580/1e6 = 2.3200 m²
    const csv = generateErpCsv(singleCabinet);
    expect(csv).toContain('2.3200');
  });

  it('includes optional project meta in comment rows when provided', () => {
    const csv = generateErpCsv(singleCabinet, { projectName: 'Kitchen-2025', revision: 'R2' });
    expect(csv).toContain('#project');
    expect(csv).toContain('Kitchen-2025');
    expect(csv).toContain('#revision');
    expect(csv).toContain('R2');
  });

  it('uses C<n>-<id> prefix for multi-cabinet exports', () => {
    const cabs = [
      { name: 'Upper', parts: [{ ...mockPart, id: 'P01' }] },
      { name: 'Lower', parts: [{ ...mockPart, id: 'P01' }] },
    ];
    const csv = generateErpCsv(cabs);
    expect(csv).toContain('C1-P01');
    expect(csv).toContain('C2-P01');
  });

  it('falls back to material key as material_name_en for unknown materials', () => {
    const unknownPart: Part = { ...mockPart, material: 'unknown-mat-99' };
    const csv = generateErpCsv([{ name: 'Test', parts: [unknownPart] }]);
    expect(csv).toContain('unknown-mat-99');
  });

  it('triggerDownload is called from downloadErpCsv', () => {
    const mockAnchor = document.createElement('a');
    vi.spyOn(mockAnchor, 'click').mockImplementation(() => {});
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    downloadErpCsv(singleCabinet);
    expect(mockAnchor.click).toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});

// ── Sprint 73: sequential # row-number column in parts + hardware ─────────────
describe('generateBomCsv — Sprint 73 sequential row numbers', () => {
  it('parts header starts with #', () => {
    const csv = generateBomCsv(singleCabinet, 'en');
    const lines = csv.split('\n');
    const partsHeaderIdx = lines.findIndex((l) => l.startsWith('#,Cabinet,Part ID'));
    expect(partsHeaderIdx).toBeGreaterThanOrEqual(0);
  });

  it('first part data row starts with 1', () => {
    const csv = generateBomCsv(singleCabinet, 'en');
    const lines = csv.split('\n');
    const partsHeaderIdx = lines.findIndex((l) => l.startsWith('#,Cabinet,Part ID'));
    // Skip cabinet-notes comment row if present; find first data row
    const dataRow = lines.slice(partsHeaderIdx + 1).find((l) => l.trim() !== '' && !l.startsWith('#'));
    expect(dataRow).toMatch(/^1,/);
  });

  it('row numbers are sequential across multiple cabinets', () => {
    const part2: Part = { ...mockPart, id: 'P02', name: { en: 'Back Panel', he: 'לוח אחורי' } };
    const cabs = [
      { name: 'Upper', parts: [mockPart], hardware: [] },
      { name: 'Lower', parts: [part2], hardware: [] },
    ];
    const csv = generateBomCsv(cabs, 'en');
    const lines = csv.split('\n');
    const partsHeaderIdx = lines.findIndex((l) => l.startsWith('#,Cabinet,Part ID'));
    const dataRows = lines
      .slice(partsHeaderIdx + 1)
      .filter(
        (l) =>
          l.trim() !== '' && !l.startsWith('#') && !l.startsWith('Cabinet,') && !l.startsWith('#,Cabinet,Hardware'),
      );
    expect(dataRows[0]).toMatch(/^1,/);
    expect(dataRows[1]).toMatch(/^2,/);
  });

  it('hardware section header starts with #', () => {
    const csv = generateBomCsv(singleCabinet, 'en');
    const lines = csv.split('\n');
    const hwHeaderIdx = lines.findIndex((l) => l.startsWith('#,Cabinet,Hardware ID'));
    expect(hwHeaderIdx).toBeGreaterThanOrEqual(0);
  });
});

// ── Sprint 87 — area (m²) column in BOM CSV parts ────────────────────────────
describe('BOM CSV — area (m²) column (Sprint 87)', () => {
  it('parts header contains "Area (m²)" column', () => {
    const csv = generateBomCsv(singleCabinet, 'en');
    const partsHeader = csv.split('\n').find((l) => l.startsWith('#,Cabinet,Part ID'));
    expect(partsHeader).toContain('Area');
  });

  it('area value is a numeric string with 6 decimal places', () => {
    const csv = generateBomCsv(singleCabinet, 'en');
    const lines = csv.split('\n').filter(Boolean);
    const headerIdx = lines.findIndex((l) => l.startsWith('#,Cabinet,Part ID'));
    const firstDataRow = lines.slice(headerIdx + 1).find((l) => l.trim() !== '' && !l.startsWith('#'))!;
    const cols = firstDataRow.split(',');
    // Area (m²) is column index 9
    expect(cols[9]).toMatch(/^\d+\.\d{6}$/);
    expect(isNaN(parseFloat(cols[9]))).toBe(false);
  });

  it('area value matches length * width * qty / 1_000_000', () => {
    const csv = generateBomCsv(singleCabinet, 'en');
    const lines = csv.split('\n').filter(Boolean);
    const headerIdx = lines.findIndex((l) => l.startsWith('#,Cabinet,Part ID'));
    const firstDataRow = lines.slice(headerIdx + 1).find((l) => l.trim() !== '' && !l.startsWith('#'))!;
    const cols = firstDataRow.split(',');
    const expected = ((mockPart.length * mockPart.width * mockPart.qty) / 1_000_000).toFixed(6);
    expect(cols[9]).toBe(expected);
  });

  it('area column is present in multi-cabinet BOM for each part row', () => {
    const part2: Part = { ...mockPart, id: 'P02', name: { en: 'Back Panel', he: 'לוח אחורי' } };
    const multiCabs = [
      { name: 'Upper', parts: [mockPart], hardware: [] },
      { name: 'Lower', parts: [part2], hardware: [] },
    ];
    const csv = generateBomCsv(multiCabs, 'en');
    const lines = csv.split('\n').filter(Boolean);
    const headerIdx = lines.findIndex((l) => l.startsWith('#,Cabinet,Part ID'));
    const hwHeaderIdx = lines.findIndex((l) => l.startsWith('#,Cabinet,Hardware ID'));
    const dataRows = lines.slice(headerIdx + 1, hwHeaderIdx).filter((l) => !l.startsWith('#') && l.trim().length > 0);
    for (const row of dataRows) {
      const cols = row.split(',');
      expect(isNaN(parseFloat(cols[9]))).toBe(false);
    }
  });
});

// ── Phase 13 / Sprint 18 — BOM multi-currency ────────────────────────────────
describe('generateBomCsv — multi-currency (Sprint 18)', () => {
  it('material summary header contains Price/Sheet and Est. Material Cost columns', () => {
    const csv = generateBomCsv(singleCabinet, 'en');
    const lines = csv.split('\n');
    const summaryIdx = lines.findIndex((l) => l.includes('Material Summary'));
    const headerRow = lines[summaryIdx + 1];
    expect(headerRow).toContain('Price/Sheet');
    expect(headerRow).toContain('Est. Material Cost');
  });

  it('material summary row includes ILS-formatted price for melamine-18', () => {
    // melamine-18 has pricePerSheet: 165, currencyCode: 'ILS'
    const csv = generateBomCsv(singleCabinet, 'en', 'en');
    const lines = csv.split('\n');
    const summaryIdx = lines.findIndex((l) => l.includes('Material Summary'));
    const dataRow = lines.slice(summaryIdx + 2).find((l) => l.includes('Melamine 18'));
    expect(dataRow).toBeDefined();
    // The formatted price must contain '165' somewhere (currency symbol varies by environment)
    expect(dataRow).toContain('165');
  });

  it('material summary row shows \u2014 for material without a price', () => {
    const freePart: Part = {
      ...mockPart,
      material: 'unicorn-free-99', // not in materials db
    };
    const csv = generateBomCsv([{ name: 'Test', parts: [freePart], hardware: [] }], 'en');
    const lines = csv.split('\n');
    const summaryIdx = lines.findIndex((l) => l.includes('Material Summary'));
    const dataRow = lines.slice(summaryIdx + 2).find((l) => l.trim() !== '' && !l.includes('Price/Sheet'));
    expect(dataRow).toContain('\u2014');
  });

  it('estimated cost is price \u00d7 sheets needed for the given area', () => {
    // melamine-18: 1220\u00d72440 mm sheet (2,976,800 mm\u00b2), pricePerSheet: 165
    // mockPart: 2\u00d72000\u00d7580 = 2,320,000 mm\u00b2 \u2192 needs 1 sheet
    // estimated cost = 165 \u00d7 1 = 165
    const csv = generateBomCsv(singleCabinet, 'en', 'en');
    const lines = csv.split('\n');
    const summaryIdx = lines.findIndex((l) => l.includes('Material Summary'));
    const dataRow = lines.slice(summaryIdx + 2).find((l) => l.includes('Melamine 18'));
    expect(dataRow).toBeDefined();
    const matches = (dataRow ?? '').match(/165/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('he locale shows Hebrew column headers for price and cost', () => {
    const csv = generateBomCsv(singleCabinet, 'he', 'he');
    const lines = csv.split('\n');
    const summaryIdx = lines.findIndex((l) =>
      l.includes('\u05e1\u05d9\u05db\u05d5\u05dd \u05d7\u05d5\u05de\u05e8\u05d9\u05dd'),
    );
    const headerRow = lines[summaryIdx + 1];
    expect(headerRow).toContain('\u05de\u05d7\u05d9\u05e8');
  });
});
