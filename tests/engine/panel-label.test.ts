import { describe, it, expect } from 'vitest';
import { generatePanelLabel, generateLabelBatch, formatLabelText } from '../../src/engine/panel-label';
import type { PanelLabelInput } from '../../src/engine/panel-label';

const baseInput: PanelLabelInput = {
  partId: 'A1',
  widthMm: 600,
  heightMm: 400,
  material: 'Plywood 18mm',
  grain: 'horizontal',
  cabinetName: 'Upper Cabinet',
  position: 'Left Side',
};

describe('generatePanelLabel', () => {
  it('generates label with correct dimension text', () => {
    const label = generatePanelLabel(baseInput);
    expect(label.dimensionText).toBe('600 × 400 mm');
  });

  it('uses horizontal grain symbol', () => {
    const label = generatePanelLabel(baseInput);
    expect(label.grainSymbol).toBe('→');
  });

  it('uses vertical grain symbol', () => {
    const label = generatePanelLabel({ ...baseInput, grain: 'vertical' });
    expect(label.grainSymbol).toBe('↓');
  });

  it('uses dot for no grain', () => {
    const label = generatePanelLabel({ ...baseInput, grain: 'none' });
    expect(label.grainSymbol).toBe('·');
  });

  it('formats edge banding abbreviations', () => {
    const label = generatePanelLabel({
      ...baseInput,
      bandedEdges: ['top', 'bottom', 'left'],
    });
    expect(label.edgeBandingText).toBe('T B L');
  });

  it('uses dash when no edge banding', () => {
    const label = generatePanelLabel(baseInput);
    expect(label.edgeBandingText).toBe('—');
  });

  it('defaults quantity to 1', () => {
    const label = generatePanelLabel(baseInput);
    expect(label.quantity).toBe(1);
  });

  it('uses provided quantity', () => {
    const label = generatePanelLabel({ ...baseInput, quantity: 4 });
    expect(label.quantity).toBe(4);
  });

  it('preserves notes', () => {
    const label = generatePanelLabel({ ...baseInput, notes: 'drill hinge bore' });
    expect(label.notes).toBe('drill hinge bore');
  });

  it('generates sortKey as cabinetName|partId', () => {
    const label = generatePanelLabel(baseInput);
    expect(label.sortKey).toBe('Upper Cabinet|A1');
  });

  it.each([
    { desc: 'empty partId', override: { partId: '  ' } },
    { desc: 'widthMm = 0', override: { widthMm: 0 } },
    { desc: 'widthMm < 0', override: { widthMm: -5 } },
    { desc: 'heightMm = 0', override: { heightMm: 0 } },
    { desc: 'heightMm < 0', override: { heightMm: -1 } },
  ])('throws RangeError for $desc', ({ override }) => {
    expect(() => generatePanelLabel({ ...baseInput, ...override })).toThrow(RangeError);
  });
});

describe('generateLabelBatch', () => {
  const inputs: PanelLabelInput[] = [
    { ...baseInput, partId: 'B1', cabinetName: 'Base' },
    { ...baseInput, partId: 'A2', cabinetName: 'Upper Cabinet' },
    { ...baseInput, partId: 'A1', cabinetName: 'Upper Cabinet', quantity: 2 },
    { ...baseInput, partId: 'B2', cabinetName: 'Base', material: 'MDF 16mm' },
  ];

  it('sorts labels by sortKey (cabinet then partId)', () => {
    const batch = generateLabelBatch(inputs);
    const keys = batch.labels.map((l) => l.sortKey);
    expect(keys).toEqual([...keys].sort());
  });

  it('counts unique parts', () => {
    const batch = generateLabelBatch(inputs);
    expect(batch.uniqueParts).toBe(4);
  });

  it('sums total pieces including quantities', () => {
    const batch = generateLabelBatch(inputs);
    expect(batch.totalPieces).toBe(5); // 1+1+2+1
  });

  it('counts distinct materials', () => {
    const batch = generateLabelBatch(inputs);
    expect(batch.materialCount).toBe(2); // Plywood 18mm + MDF 16mm
  });

  it('throws RangeError for empty inputs', () => {
    expect(() => generateLabelBatch([])).toThrow(RangeError);
  });
});

describe('formatLabelText', () => {
  it('formats label as single-line text', () => {
    const label = generatePanelLabel(baseInput);
    const text = formatLabelText(label);
    expect(text).toContain('A1');
    expect(text).toContain('600 × 400 mm');
    expect(text).toContain('Plywood 18mm');
    expect(text).toContain('→');
    expect(text).toContain('Upper Cabinet → Left Side');
    expect(text).toContain('EB: —');
  });

  it('includes quantity when > 1', () => {
    const label = generatePanelLabel({ ...baseInput, quantity: 3 });
    const text = formatLabelText(label);
    expect(text).toContain('×3');
  });

  it('includes notes in brackets', () => {
    const label = generatePanelLabel({ ...baseInput, notes: 'pre-drill' });
    const text = formatLabelText(label);
    expect(text).toContain('[pre-drill]');
  });

  it('omits quantity marker when quantity is 1', () => {
    const label = generatePanelLabel(baseInput);
    const text = formatLabelText(label);
    expect(text).not.toContain('×1');
  });
});
