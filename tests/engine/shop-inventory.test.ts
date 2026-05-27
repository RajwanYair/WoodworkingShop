import { describe, it, expect } from 'vitest';

import { checkStock, analyzeInventory, projectUsage, generateReorderList } from '../../src/engine/shop-inventory';
import type { InventoryItem, ProjectUsage } from '../../src/engine/shop-inventory';

function item(overrides: Partial<InventoryItem> & { materialId: string }): InventoryItem {
  return {
    name: overrides.materialId,
    quantity: 10,
    unit: 'sheets',
    reorderLevel: 5,
    reorderQuantity: 10,
    ...overrides,
  };
}

describe('checkStock', () => {
  it.each([
    ['ok', 10, 5, 0],
    ['low', 3, 5, 2],
    ['out', 0, 5, 5],
  ] as const)('returns status "%s" for quantity=%d, reorderLevel=%d', (expectedStatus, qty, level, expectedDeficit) => {
    const result = checkStock(item({ materialId: 'm1', quantity: qty, reorderLevel: level }));
    expect(result.status).toBe(expectedStatus);
    expect(result.deficit).toBe(expectedDeficit);
  });

  it('treats negative quantity as out of stock', () => {
    const result = checkStock(item({ materialId: 'm1', quantity: -1 }));
    expect(result.status).toBe('out');
  });

  it('treats quantity exactly at reorder level as low', () => {
    const result = checkStock(item({ materialId: 'm1', quantity: 5, reorderLevel: 5 }));
    expect(result.status).toBe('low');
    expect(result.deficit).toBe(0);
  });
});

describe('analyzeInventory', () => {
  it('throws on empty inventory', () => {
    expect(() => analyzeInventory([])).toThrow(RangeError);
  });

  it('categorizes items correctly', () => {
    const inventory = [
      item({ materialId: 'plywood', quantity: 20 }),
      item({ materialId: 'mdf', quantity: 3 }),
      item({ materialId: 'edging', quantity: 0 }),
    ];
    const result = analyzeInventory(inventory);
    expect(result.totalItems).toBe(3);
    expect(result.healthyItems).toBe(1);
    expect(result.reorderNeeded).toHaveLength(1);
    expect(result.outOfStock).toHaveLength(1);
  });

  it('returns all checks in order', () => {
    const inventory = [item({ materialId: 'a', quantity: 1 }), item({ materialId: 'b', quantity: 100 })];
    const result = analyzeInventory(inventory);
    expect(result.checks).toHaveLength(2);
    expect(result.checks[0].materialId).toBe('a');
    expect(result.checks[1].materialId).toBe('b');
  });
});

describe('projectUsage', () => {
  it('throws on empty usage', () => {
    expect(() => projectUsage([], [])).toThrow(RangeError);
  });

  it('determines fulfilment for each material', () => {
    const inventory = [item({ materialId: 'plywood', quantity: 10 }), item({ materialId: 'mdf', quantity: 2 })];
    const usage: ProjectUsage[] = [
      { materialId: 'plywood', quantityNeeded: 5 },
      { materialId: 'mdf', quantityNeeded: 5 },
    ];
    const result = projectUsage(inventory, usage);
    expect(result[0].canFulfil).toBe(true);
    expect(result[0].surplus).toBe(5);
    expect(result[1].canFulfil).toBe(false);
    expect(result[1].surplus).toBe(-3);
  });

  it('returns 0 available for materials not in inventory', () => {
    const result = projectUsage([], [{ materialId: 'unknown', quantityNeeded: 3 }]);
    expect(result[0].available).toBe(0);
    expect(result[0].canFulfil).toBe(false);
  });
});

describe('generateReorderList', () => {
  it('returns empty for fully stocked inventory', () => {
    const inventory = [item({ materialId: 'a', quantity: 20 })];
    expect(generateReorderList(inventory)).toEqual([]);
  });

  it('includes items at or below reorder level', () => {
    const inventory = [
      item({ materialId: 'plywood', quantity: 5, reorderLevel: 5, reorderQuantity: 15 }),
      item({ materialId: 'mdf', quantity: 0, reorderQuantity: 20 }),
      item({ materialId: 'oak', quantity: 50 }),
    ];
    const list = generateReorderList(inventory);
    expect(list).toHaveLength(2);
    expect(list[0].orderQuantity).toBe(15);
    expect(list[1].orderQuantity).toBe(20);
  });
});
