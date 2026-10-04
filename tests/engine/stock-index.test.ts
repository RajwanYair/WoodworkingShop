import { describe, expect, it } from 'vitest';
import {
  analyzeInventory,
  checkAvailability,
  checkStock,
  createStockLedger,
  createStockStore,
  getStockSummary,
  type InventoryStockStatus,
  type StockStatus,
} from '../../src/engine/stock';

describe('stock domain barrel', () => {
  it('exposes availability tracking and inventory analysis without type-name collisions', () => {
    const availabilityStatus: StockStatus = 'shortfall';
    const inventoryStatus: InventoryStockStatus = 'out';
    const availability = checkAvailability(createStockStore(), [{ materialKey: 'plywood', requiredQty: 1 }]);
    const inventory = analyzeInventory([
      { materialId: 'plywood', name: 'Plywood', quantity: 0, unit: 'sheet', reorderLevel: 2, reorderQuantity: 5 },
    ]);

    expect(availabilityStatus).toBe('shortfall');
    expect(inventoryStatus).toBe('out');
    expect(availability[0].status).toBe('unknown');
    expect(inventory.outOfStock).toHaveLength(1);
    expect(
      checkStock({ materialId: 'mdf', name: 'MDF', quantity: 10, unit: 'sheet', reorderLevel: 2, reorderQuantity: 5 })
        .status,
    ).toBe('ok');
  });

  it('exposes stock ledger lifecycle and reporting from the same domain boundary', () => {
    const ledger = createStockLedger();

    expect(getStockSummary(ledger).totalMaterials).toBe(0);
  });
});
