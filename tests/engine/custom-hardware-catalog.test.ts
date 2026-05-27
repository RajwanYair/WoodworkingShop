import { describe, expect, it } from 'vitest';

import {
  calculateHardwareCost,
  filterHardware,
  getCategories,
  getManufacturers,
  sortHardware,
  validateHardwareItem,
} from '../../src/engine/hardware-catalog';

import type { HardwareAssignment, HardwareItem } from '../../src/engine/hardware-catalog';

const catalog: HardwareItem[] = [
  {
    id: 'h1',
    name: 'Soft-Close Hinge',
    category: 'hinge',
    sku: 'BLM-71B3550',
    manufacturer: 'Blum',
    unitPrice: 3.5,
    packSize: 1,
    description: '110° clip-top',
    tags: ['soft-close', 'frameless'],
  },
  {
    id: 'h2',
    name: 'Bar Handle 128mm',
    category: 'handle',
    sku: 'HT-128SS',
    manufacturer: 'Hafele',
    unitPrice: 8.0,
    packSize: 1,
    description: 'Stainless steel bar',
    tags: ['modern', 'stainless'],
  },
  {
    id: 'h3',
    name: 'Drawer Slide 450mm',
    category: 'slide',
    sku: 'BLM-560H4500',
    manufacturer: 'Blum',
    unitPrice: 22.0,
    packSize: 2,
    description: 'Tandem plus full extension',
    tags: ['soft-close', 'full-extension'],
  },
  {
    id: 'h4',
    name: 'Cam Lock 15mm',
    category: 'cam-lock',
    sku: 'GN-CL15',
    manufacturer: 'Generic',
    unitPrice: 0.5,
    packSize: 100,
    description: 'Flat-pack cam lock',
    tags: ['flatpack'],
  },
  {
    id: 'h5',
    name: 'Wood Screw 4x30',
    category: 'screw',
    sku: 'GN-WS430',
    manufacturer: 'Generic',
    unitPrice: 5.0,
    packSize: 200,
    description: 'Countersunk wood screw',
    tags: ['countersunk'],
  },
];

describe('filterHardware', () => {
  it('returns all items with empty filter', () => {
    expect(filterHardware(catalog, {})).toHaveLength(5);
  });

  it('filters by category', () => {
    const result = filterHardware(catalog, { category: 'hinge' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('h1');
  });

  it('filters by manufacturer', () => {
    const result = filterHardware(catalog, { manufacturer: 'Blum' });
    expect(result).toHaveLength(2);
  });

  it('filters by max price', () => {
    const result = filterHardware(catalog, { maxPrice: 5 });
    expect(result).toHaveLength(3);
  });

  it('filters by tags', () => {
    const result = filterHardware(catalog, { tags: ['soft-close'] });
    expect(result).toHaveLength(2);
  });

  it('filters by text query', () => {
    const result = filterHardware(catalog, { query: 'stainless' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('h2');
  });

  it('combines multiple criteria', () => {
    const result = filterHardware(catalog, { manufacturer: 'Blum', tags: ['soft-close'] });
    expect(result).toHaveLength(2);
  });

  it('returns empty for no matches', () => {
    const result = filterHardware(catalog, { query: 'nonexistent' });
    expect(result).toHaveLength(0);
  });
});

describe('sortHardware', () => {
  it('sorts by name ascending (default)', () => {
    const result = sortHardware(catalog);
    expect(result[0].name).toBe('Bar Handle 128mm');
  });

  it('sorts by price descending', () => {
    const result = sortHardware(catalog, 'price', 'desc');
    expect(result[0].id).toBe('h3');
  });

  it('sorts by manufacturer ascending', () => {
    const result = sortHardware(catalog, 'manufacturer', 'asc');
    expect(result[0].manufacturer).toBe('Blum');
  });

  it('does not mutate original array', () => {
    const original = [...catalog];
    sortHardware(catalog, 'price', 'desc');
    expect(catalog).toEqual(original);
  });
});

describe('calculateHardwareCost', () => {
  it('returns empty summary for no assignments', () => {
    const result = calculateHardwareCost(catalog, []);
    expect(result.lines).toHaveLength(0);
    expect(result.totalCost).toBe(0);
  });

  it('calculates cost for single item', () => {
    const assignments: HardwareAssignment[] = [{ itemId: 'h1', cabinetId: 'c1', quantity: 4 }];
    const result = calculateHardwareCost(catalog, assignments);

    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].totalQuantity).toBe(4);
    expect(result.lines[0].packsNeeded).toBe(4);
    expect(result.lines[0].lineCost).toBe(14);
    expect(result.totalCost).toBe(14);
  });

  it('aggregates quantities across cabinets', () => {
    const assignments: HardwareAssignment[] = [
      { itemId: 'h1', cabinetId: 'c1', quantity: 2 },
      { itemId: 'h1', cabinetId: 'c2', quantity: 3 },
    ];
    const result = calculateHardwareCost(catalog, assignments);

    expect(result.lines[0].totalQuantity).toBe(5);
    expect(result.totalItems).toBe(5);
  });

  it('computes packs correctly for bulk items', () => {
    const assignments: HardwareAssignment[] = [{ itemId: 'h5', cabinetId: 'c1', quantity: 350 }];
    const result = calculateHardwareCost(catalog, assignments);

    expect(result.lines[0].packsNeeded).toBe(2);
    expect(result.lines[0].lineCost).toBe(10);
  });

  it('sorts lines by cost descending', () => {
    const assignments: HardwareAssignment[] = [
      { itemId: 'h1', cabinetId: 'c1', quantity: 1 },
      { itemId: 'h3', cabinetId: 'c1', quantity: 2 },
    ];
    const result = calculateHardwareCost(catalog, assignments);

    expect(result.lines[0].item.id).toBe('h3');
  });

  it('throws RangeError for unknown item', () => {
    const assignments: HardwareAssignment[] = [{ itemId: 'unknown', cabinetId: 'c1', quantity: 1 }];
    expect(() => calculateHardwareCost(catalog, assignments)).toThrow(RangeError);
    expect(() => calculateHardwareCost(catalog, assignments)).toThrow('unknown hardware item');
  });

  it('throws RangeError for non-positive quantity', () => {
    const assignments: HardwareAssignment[] = [{ itemId: 'h1', cabinetId: 'c1', quantity: 0 }];
    expect(() => calculateHardwareCost(catalog, assignments)).toThrow(RangeError);
    expect(() => calculateHardwareCost(catalog, assignments)).toThrow('non-positive quantity');
  });
});

describe('getManufacturers', () => {
  it('returns sorted unique manufacturers', () => {
    expect(getManufacturers(catalog)).toEqual(['Blum', 'Generic', 'Hafele']);
  });

  it('returns empty for empty catalog', () => {
    expect(getManufacturers([])).toEqual([]);
  });
});

describe('getCategories', () => {
  it('returns sorted unique categories', () => {
    const result = getCategories(catalog);
    expect(result).toContain('hinge');
    expect(result).toContain('handle');
    expect(result).toContain('slide');
    expect(result.length).toBe(5);
  });
});

describe('validateHardwareItem', () => {
  it('returns no errors for valid item', () => {
    expect(validateHardwareItem(catalog[0])).toHaveLength(0);
  });

  it('returns errors for invalid item', () => {
    const bad: HardwareItem = {
      id: '',
      name: '',
      category: 'other',
      sku: '',
      manufacturer: '',
      unitPrice: -1,
      packSize: 0,
      description: '',
      tags: [],
    };
    const errors = validateHardwareItem(bad);
    expect(errors).toContain('id is required');
    expect(errors).toContain('name is required');
    expect(errors).toContain('unitPrice must be >= 0');
    expect(errors).toContain('packSize must be >= 1');
  });
});
