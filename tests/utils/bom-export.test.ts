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
  it('starts with a CSV header row', () => {
    const csv = generateBomCsv(singleCabinet, 'en');
    const firstLine = csv.split('\n')[0];
    expect(firstLine).toContain('Cabinet');
    expect(firstLine).toContain('Part ID');
    expect(firstLine).toContain('Thickness');
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

  it('includes hardware section after a blank line', () => {
    const csv = generateBomCsv(singleCabinet, 'en');
    const lines = csv.split('\n');
    const blankIdx = lines.findIndex((l) => l.trim() === '');
    expect(blankIdx).toBeGreaterThan(0);
    expect(lines[blankIdx + 1]).toContain('Hardware');
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

  it('handles empty cabinets array', () => {
    const csv = generateBomCsv([], 'en');
    const lines = csv.split('\n').filter((l) => l.trim() !== '');
    expect(lines.length).toBeGreaterThanOrEqual(2); // header + hardware header
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
