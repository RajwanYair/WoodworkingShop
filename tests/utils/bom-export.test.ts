import { describe, it, expect } from 'vitest';
import { generateBomCsv } from '../../src/utils/bom-export';
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
});
