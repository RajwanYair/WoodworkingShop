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
  it('has material summary section and parts header row after the summary', () => {
    const csv = generateBomCsv(singleCabinet, 'en');
    const lines = csv.split('\n');
    const summaryIdx = lines.findIndex((l) => l.includes('Material Summary'));
    expect(summaryIdx).toBeGreaterThanOrEqual(0);
    expect(lines[summaryIdx + 1]).toContain('Total Area');
    expect(lines[summaryIdx + 1]).toContain('Board-Feet');
    const headerIdx = lines.findIndex((l) => l.includes('Part ID') && l.includes('Thickness'));
    expect(headerIdx).toBeGreaterThan(summaryIdx);
  });

  it.each([
    ['en', ['Side Panel', 'Melamine 18 mm', '2000', '580']],
    ['he', ['לוח צד', 'קצה קדמי']],
  ] as const)('includes part rows in lang=%s', (lang, expected) => {
    const csv = generateBomCsv(singleCabinet, lang);
    for (const s of expected) expect(csv).toContain(s);
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

  it('material summary row shows correct area for single and multi-cabinet', () => {
    expect(generateBomCsv(singleCabinet, 'en')).toContain('2.320');
    const dualCabs = [
      { name: 'Upper', parts: [mockPart], hardware: [] },
      { name: 'Lower', parts: [mockPart], hardware: [] },
    ];
    expect(generateBomCsv(dualCabs, 'en')).toContain('4.640');
  });

  it('handles empty cabinets array', () => {
    const csv = generateBomCsv([], 'en');
    const lines = csv.split('\n').filter((l) => l.trim() !== '');
    // Material Summary header + column header + parts header + hardware header = 4 lines minimum
    expect(lines.length).toBeGreaterThanOrEqual(3);
  });

  it.each([
    ['comma in name', { name: { en: 'Panel, Large', he: 'לוח, גדול' } }, '"Panel, Large"'],
    ['double-quote in name', { name: { en: 'Panel 18"', he: 'לוח 18"' } }, '"Panel 18""'],
    ['unknown material key', { material: 'unicorn-wood-99' }, 'unicorn-wood-99'],
  ])('CSV escaping: %s', (_, partOverrides, expected) => {
    const part: Part = { ...mockPart, ...partOverrides };
    const csv = generateBomCsv([{ name: 'Test', parts: [part], hardware: [] }], 'en');
    expect(csv).toContain(expected);
  });

  // multi-cabinet Part ID prefix
  it('Part ID is unprefixed for single-cabinet and C<n>-prefixed for multi-cabinet', () => {
    // With one cabinet, P01 should appear as-is
    expect(generateBomCsv(singleCabinet, 'en')).toContain(',P01,');
    expect(generateBomCsv(singleCabinet, 'en')).not.toContain('C1-P01');
    const cabs3 = [
      { name: 'A', parts: [{ ...mockPart, id: 'P01' }], hardware: [] },
      { name: 'B', parts: [{ ...mockPart, id: 'P01' }], hardware: [] },
      { name: 'C', parts: [{ ...mockPart, id: 'P01' }], hardware: [] },
    ];
    const csv = generateBomCsv(cabs3, 'en');
    expect(csv).toContain('C1-P01');
    expect(csv).toContain('C2-P01');
    expect(csv).toContain('C3-P01');
    expect(csv).not.toMatch(/,P01,/);
  });

  it('has version header and ISO timestamp', () => {
    const csv = generateBomCsv(singleCabinet, 'en');
    expect(csv).toContain('Cabinet Planner BOM Export');
    expect(csv).toContain('Schema: bom-csv-v1');
    expect(csv).toMatch(/Generated: \d{4}-\d{2}-\d{2}T/);
  });
});

describe('generateHardwareCsv', () => {
  it('generates header row, EN/HE content, and handles empty list', () => {
    const en = generateHardwareCsv([{ name: 'Cabinet A', hardware: [mockHardware] }], 'en');
    expect(en).toContain('Hardware ID');
    expect(en).toContain('Hinge 35mm');
    expect(en).toContain('Cabinet A');
    const he = generateHardwareCsv([{ name: 'ארון', hardware: [mockHardware] }], 'he');
    // name.he = 'ציר 35 מ"מ' — the " gets CSV-escaped to "" inside quoted field
    expect(he).toContain('35');
    expect(he).toContain('יח');
    const empty = generateHardwareCsv([{ name: 'Empty', hardware: [] }], 'en');
    expect(empty).toContain('Hardware ID');
    // Only the header row — no hardware entries
    expect(empty.split('\n').length).toBe(1);
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

describe('generateBomCsv — header metadata', () => {
  it('includes cabinet/parts/hardware counts for single, empty, and multi-cabinet', () => {
    const csv = generateBomCsv(singleCabinet, 'en');
    expect(csv).toContain('Cabinets: 1');
    expect(csv).toContain('Parts: 2');
    expect(csv).toContain('Hardware: 4');
    expect(generateBomCsv([], 'en')).toContain('Cabinets: 0');
    expect(
      generateBomCsv(
        [
          { name: 'C1', parts: [mockPart], hardware: [] },
          { name: 'C2', parts: [mockPart], hardware: [] },
        ],
        'en',
      ),
    ).toContain('Cabinets: 2');
  });
});

describe('generateErpCsv', () => {
  it('has schema header, snake_case columns, area_m2 formula, and grain direction encoding', () => {
    const csv = generateErpCsv(singleCabinet);
    expect(csv).toContain('#schema');
    expect(csv).toContain('bom-erp-csv-v1');
    expect(csv).toContain('2.3200');
    const headerLine = csv.split('\n').find((l) => l.startsWith('part_no'));
    expect(headerLine).toBeDefined();
    expect(headerLine).toContain('material_key');
    expect(headerLine).toContain('area_m2');
    expect(headerLine).toContain('grain_direction');
    expect(headerLine).toContain('unit_weight_kg');
    // plywood-17 has hasGrain=true in the engine
    const grainPart: Part = { ...mockPart, material: 'plywood-17' };
    expect(generateErpCsv([{ name: 'Cabinet A', parts: [grainPart] }])).toContain('along_length');
  });

  it('includes optional project meta and C<n>-id prefix for multi-cabinet', () => {
    const withMeta = generateErpCsv(singleCabinet, { projectName: 'Kitchen-2025', revision: 'R2' });
    expect(withMeta).toContain('#project');
    expect(withMeta).toContain('Kitchen-2025');
    expect(withMeta).toContain('#revision');
    expect(withMeta).toContain('R2');
    const cabs = [
      { name: 'Upper', parts: [{ ...mockPart, id: 'P01' }] },
      { name: 'Lower', parts: [{ ...mockPart, id: 'P01' }] },
    ];
    const multi = generateErpCsv(cabs);
    expect(multi).toContain('C1-P01');
    expect(multi).toContain('C2-P01');
  });

  it('falls back to material key for unknown materials', () => {
    const unknownPart: Part = { ...mockPart, material: 'unknown-mat-99' };
    expect(generateErpCsv([{ name: 'Test', parts: [unknownPart] }])).toContain('unknown-mat-99');
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

// Sequential # row-number column in parts + hardware
describe('generateBomCsv — sequential row numbers', () => {
  it('parts header starts with # and row numbers are sequential across cabinets', () => {
    const csv = generateBomCsv(singleCabinet, 'en');
    const lines = csv.split('\n');
    const partsHeaderIdx = lines.findIndex((l) => l.startsWith('#,Cabinet,Part ID'));
    expect(partsHeaderIdx).toBeGreaterThanOrEqual(0);
    const firstDataRow = lines.slice(partsHeaderIdx + 1).find((l) => l.trim() !== '' && !l.startsWith('#'));
    expect(firstDataRow).toMatch(/^1,/);
    expect(lines.findIndex((l) => l.startsWith('#,Cabinet,Hardware ID'))).toBeGreaterThanOrEqual(0);
    const part2: Part = { ...mockPart, id: 'P02', name: { en: 'Back Panel', he: 'לוח אחורי' } };
    const multiCsv = generateBomCsv(
      [
        { name: 'Upper', parts: [mockPart], hardware: [] },
        { name: 'Lower', parts: [part2], hardware: [] },
      ],
      'en',
    );
    const mLines = multiCsv.split('\n');
    const mHeaderIdx = mLines.findIndex((l) => l.startsWith('#,Cabinet,Part ID'));
    const dataRows = mLines
      .slice(mHeaderIdx + 1)
      .filter(
        (l) =>
          l.trim() !== '' && !l.startsWith('#') && !l.startsWith('Cabinet,') && !l.startsWith('#,Cabinet,Hardware'),
      );
    expect(dataRows[0]).toMatch(/^1,/);
    expect(dataRows[1]).toMatch(/^2,/);
  });
});

// Area (m²) column in BOM CSV parts
describe('BOM CSV — area (m²) column', () => {
  it('area column has correct header, format, computed value, and is numeric in multi-cabinet', () => {
    const csv = generateBomCsv(singleCabinet, 'en');
    const lines = csv.split('\n').filter(Boolean);
    const headerIdx = lines.findIndex((l) => l.startsWith('#,Cabinet,Part ID'));
    expect(lines[headerIdx]).toContain('Area');
    const firstDataRow = lines.slice(headerIdx + 1).find((l) => l.trim() !== '' && !l.startsWith('#'))!;
    const cols = firstDataRow.split(',');
    expect(cols[9]).toMatch(/^\d+\.\d{6}$/);
    expect(cols[9]).toBe(((mockPart.length * mockPart.width * mockPart.qty) / 1_000_000).toFixed(6));
    const part2: Part = { ...mockPart, id: 'P02', name: { en: 'Back Panel', he: 'לוח אחורי' } };
    const multiCsv = generateBomCsv(
      [
        { name: 'Upper', parts: [mockPart], hardware: [] },
        { name: 'Lower', parts: [part2], hardware: [] },
      ],
      'en',
    );
    const mLines = multiCsv.split('\n').filter(Boolean);
    const mHeaderIdx = mLines.findIndex((l) => l.startsWith('#,Cabinet,Part ID'));
    const hwIdx = mLines.findIndex((l) => l.startsWith('#,Cabinet,Hardware ID'));
    const dataRows = mLines.slice(mHeaderIdx + 1, hwIdx).filter((l) => !l.startsWith('#') && l.trim().length > 0);
    for (const row of dataRows) expect(isNaN(parseFloat(row.split(',')[9]))).toBe(false);
  });
});

// BOM multi-currency pricing
describe('generateBomCsv — multi-currency', () => {
  it('material summary header has price columns and ILS price for melamine-18', () => {
    // melamine-18 has pricePerSheet: 165, currencyCode: 'ILS'
    const csv = generateBomCsv(singleCabinet, 'en', 'en');
    const lines = csv.split('\n');
    const summaryIdx = lines.findIndex((l) => l.includes('Material Summary'));
    const headerRow = lines[summaryIdx + 1];
    expect(headerRow).toContain('Price/Sheet');
    expect(headerRow).toContain('Est. Material Cost');
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
