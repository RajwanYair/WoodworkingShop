import { describe, it, expect } from 'vitest';
import { assignPartLabels, buildPartLabelMap, formatPartLabelsAsCsv } from '../../src/engine/part-labeling';
import type { Part } from '../../src/engine/types';

function makePart(overrides: Partial<Part> = {}): Part {
  return {
    id: 'p1',
    name: { en: 'Side Panel', he: 'לוח צד' },
    qty: 1,
    material: 'plywood-18',
    thickness: 18,
    length: 720,
    width: 580,
    edgeBanding: { en: 'Front edge', he: 'קצה קדמי' },
    ...overrides,
  };
}

describe('assignPartLabels — basic labeling', () => {
  it('assigns P-001 to the first part', () => {
    const parts: Part[] = [makePart()];
    const labeled = assignPartLabels(parts);
    expect(labeled[0].partLabel).toBe('P-001');
  });

  it('assigns sequential labels to multiple parts', () => {
    const parts: Part[] = [makePart({ id: 'p1' }), makePart({ id: 'p2', name: { en: 'Top Panel', he: '' } })];
    const labeled = assignPartLabels(parts);
    const labels = labeled.map((p) => p.partLabel);
    expect(labels).toContain('P-001');
    expect(labels).toContain('P-002');
  });

  it('sorts by material then name.en before labeling', () => {
    const parts: Part[] = [
      makePart({ id: 'p2', name: { en: 'Top Panel', he: '' }, material: 'plywood-18' }),
      makePart({ id: 'p1', name: { en: 'Bottom Panel', he: '' }, material: 'plywood-18' }),
    ];
    const labeled = assignPartLabels(parts);
    // "Bottom Panel" comes before "Top Panel" alphabetically → gets P-001
    expect(labeled.find((p) => p.name.en === 'Bottom Panel')?.partLabel).toBe('P-001');
    expect(labeled.find((p) => p.name.en === 'Top Panel')?.partLabel).toBe('P-002');
  });

  it('does not mutate the original parts array', () => {
    const parts: Part[] = [makePart()];
    const original = { ...parts[0] };
    assignPartLabels(parts);
    expect(parts[0]).toEqual(original);
  });

  it('returns a new array (not reference equal to input)', () => {
    const parts: Part[] = [makePart()];
    const labeled = assignPartLabels(parts);
    expect(labeled).not.toBe(parts);
  });
});

describe('assignPartLabels — cabinet prefix', () => {
  it('prepends C1- when cabinetIndex is 1', () => {
    const parts: Part[] = [makePart()];
    const labeled = assignPartLabels(parts, { cabinetIndex: 1 });
    expect(labeled[0].partLabel).toBe('C1-P-001');
  });

  it('handles two-digit cabinet indices', () => {
    const parts: Part[] = [makePart()];
    const labeled = assignPartLabels(parts, { cabinetIndex: 12 });
    expect(labeled[0].partLabel).toBe('C12-P-001');
  });
});

describe('assignPartLabels — pad width', () => {
  it('pads to 4 digits when padWidth is 4', () => {
    const parts: Part[] = [makePart()];
    const labeled = assignPartLabels(parts, { padWidth: 4 });
    expect(labeled[0].partLabel).toBe('P-0001');
  });
});

describe('assignPartLabels — expandMultiQty', () => {
  it('expands qty=3 part into 3 labeled pieces when expandMultiQty=true', () => {
    const parts: Part[] = [makePart({ qty: 3 })];
    const labeled = assignPartLabels(parts, { expandMultiQty: true });
    expect(labeled).toHaveLength(3);
    expect(labeled[0].partLabel).toBe('P-001a');
    expect(labeled[1].partLabel).toBe('P-001b');
    expect(labeled[2].partLabel).toBe('P-001c');
    // Each expanded piece has qty 1
    expect(labeled[0].qty).toBe(1);
  });

  it('does not expand when expandMultiQty=false (default)', () => {
    const parts: Part[] = [makePart({ qty: 3 })];
    const labeled = assignPartLabels(parts);
    expect(labeled).toHaveLength(1);
    expect(labeled[0].qty).toBe(3);
    expect(labeled[0].partLabel).toBe('P-001');
  });
});

describe('buildPartLabelMap', () => {
  it('creates a map from label to labeled part', () => {
    const parts: Part[] = [makePart({ id: 'p1' }), makePart({ id: 'p2', name: { en: 'Top', he: '' } })];
    const labeled = assignPartLabels(parts);
    const map = buildPartLabelMap(labeled);
    expect(map.has('P-001')).toBe(true);
    expect(map.has('P-002')).toBe(true);
    expect(map.get('P-001')?.partLabel).toBe('P-001');
  });
});

describe('formatPartLabelsAsCsv', () => {
  it('includes header row', () => {
    const labeled = assignPartLabels([makePart()]);
    const csv = formatPartLabelsAsCsv(labeled);
    expect(csv).toContain('Label');
    expect(csv).toContain('Length (mm)');
  });

  it('includes part label in output', () => {
    const labeled = assignPartLabels([makePart()]);
    const csv = formatPartLabelsAsCsv(labeled);
    expect(csv).toContain('P-001');
  });

  it('uses Hebrew name when lang=he', () => {
    const labeled = assignPartLabels([makePart()]);
    const csv = formatPartLabelsAsCsv(labeled, 'he');
    expect(csv).toContain('לוח צד');
  });
});
