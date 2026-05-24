import { describe, it, expect } from 'vitest';
import {
  filterBomParts,
  getBomMaterials,
  getBomPartTypes,
  getBomZones,
  totalPartCount,
} from '../../src/engine/bom-filter';
import type { BomFilterablePart } from '../../src/engine/bom-filter';

function p(overrides: Partial<BomFilterablePart> & { id: string }): BomFilterablePart {
  return {
    name: { en: 'Side Panel', he: 'לוח צד' },
    material: 'MDF 18mm',
    type: 'panel',
    zone: 'base',
    grainAlongLength: true,
    thicknessMm: 18,
    widthMm: 400,
    lengthMm: 720,
    quantity: 2,
    ...overrides,
  };
}

const PARTS: BomFilterablePart[] = [
  p({ id: '1', material: 'MDF 18mm', type: 'panel', zone: 'base' }),
  p({ id: '2', material: 'Plywood 12mm', type: 'shelf', zone: 'wall', thicknessMm: 12, grainAlongLength: false }),
  p({ id: '3', material: 'MDF 18mm', type: 'door', zone: 'base', name: { en: 'Door Front', he: 'פנל דלת' } }),
  p({ id: '4', material: 'Oak veneer', type: 'panel', zone: 'tall', thicknessMm: 3 }),
];

describe('filterBomParts — material filter', () => {
  it('filters by exact material substring', () => {
    const result = filterBomParts(PARTS, { materials: ['MDF'] });
    expect(result).toHaveLength(2);
  });

  it('filters by multiple materials (OR logic)', () => {
    const result = filterBomParts(PARTS, { materials: ['MDF', 'Oak'] });
    expect(result).toHaveLength(3);
  });
});

describe('filterBomParts — type filter', () => {
  it('filters by type', () => {
    const result = filterBomParts(PARTS, { types: ['panel'] });
    expect(result).toHaveLength(2);
  });

  it('returns empty when type not found', () => {
    const result = filterBomParts(PARTS, { types: ['drawer-front'] });
    expect(result).toHaveLength(0);
  });
});

describe('filterBomParts — zone filter', () => {
  it('filters by zone', () => {
    const result = filterBomParts(PARTS, { zones: ['base'] });
    expect(result).toHaveLength(2);
  });
});

describe('filterBomParts — grain filter', () => {
  it('filters by grainAlongLength=false', () => {
    const result = filterBomParts(PARTS, { grainAlongLength: false });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });
});

describe('filterBomParts — thickness range', () => {
  it('filters by minThicknessMm', () => {
    const result = filterBomParts(PARTS, { minThicknessMm: 15 });
    expect(result.every((r) => r.thicknessMm >= 15)).toBe(true);
  });

  it('filters by maxThicknessMm', () => {
    const result = filterBomParts(PARTS, { maxThicknessMm: 12 });
    expect(result.every((r) => r.thicknessMm <= 12)).toBe(true);
  });
});

describe('filterBomParts — name search', () => {
  it('matches English name', () => {
    const result = filterBomParts(PARTS, { nameSearch: 'Door' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });

  it('matches Hebrew name', () => {
    const result = filterBomParts(PARTS, { nameSearch: 'דלת' });
    expect(result).toHaveLength(1);
  });
});

describe('filterBomParts — combined criteria', () => {
  it('ANDs multiple criteria', () => {
    const result = filterBomParts(PARTS, { materials: ['MDF'], types: ['door'] });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });

  it('returns all parts with empty criteria', () => {
    const result = filterBomParts(PARTS, {});
    expect(result).toHaveLength(PARTS.length);
  });
});

describe('getBomMaterials', () => {
  it('returns sorted unique materials', () => {
    const mats = getBomMaterials(PARTS);
    expect(mats).toContain('MDF 18mm');
    expect(new Set(mats).size).toBe(mats.length); // unique
  });
});

describe('getBomPartTypes', () => {
  it('returns sorted unique types', () => {
    const types = getBomPartTypes(PARTS);
    expect(types).toContain('panel');
    expect(new Set(types).size).toBe(types.length);
  });
});

describe('getBomZones', () => {
  it('returns sorted unique zones', () => {
    const zones = getBomZones(PARTS);
    expect(zones).toContain('base');
    expect(zones).toContain('wall');
  });
});

describe('totalPartCount', () => {
  it('sums part quantities', () => {
    const total = totalPartCount(PARTS);
    // Each part has quantity=2 → 4 × 2 = 8
    expect(total).toBe(8);
  });
});
