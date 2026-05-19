import { describe, it, expect, vi } from 'vitest';
import { generateBomCsv, generateHardwareCsv, downloadHardwareCsv } from '../../src/utils/bom-export';
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
