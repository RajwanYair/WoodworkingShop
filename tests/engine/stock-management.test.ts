import { describe, it, expect, beforeEach } from 'vitest';
import {
  createStockLedger,
  addMaterial,
  createPurchaseOrder,
  submitPurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
  computeReorderAlerts,
  recordWaste,
  getStockSummary,
  formatStockReport,
  DEFAULT_REORDER_MULTIPLIER,
} from '../../src/engine/stock-management';
import type { StockLedger, StockRecord } from '../../src/engine/stock-management';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeRecord(overrides: Partial<StockRecord> = {}): StockRecord {
  return {
    materialKey: 'plywood-18',
    description: 'Birch plywood 18mm',
    onHand: 10,
    unit: 'sheet',
    reorderPoint: 3,
    reorderQty: 5,
    unitCost: 45.0,
    ...overrides,
  };
}

function ledgerWith(...records: StockRecord[]): StockLedger {
  let l = createStockLedger();
  for (const r of records) {
    l = addMaterial(l, r);
  }
  return l;
}

// ─── createStockLedger ────────────────────────────────────────────────────────

describe('createStockLedger', () => {
  it('starts empty', () => {
    const l = createStockLedger();
    expect(l.records.size).toBe(0);
    expect(l.orders).toHaveLength(0);
    expect(l.wasteLog).toHaveLength(0);
  });
});

// ─── addMaterial ──────────────────────────────────────────────────────────────

describe('addMaterial', () => {
  it('adds a record to the ledger', () => {
    const l = addMaterial(createStockLedger(), makeRecord());
    expect(l.records.size).toBe(1);
    expect(l.records.get('plywood-18')?.onHand).toBe(10);
  });

  it('overrides an existing record', () => {
    const l1 = addMaterial(createStockLedger(), makeRecord({ onHand: 5 }));
    const l2 = addMaterial(l1, makeRecord({ onHand: 20 }));
    expect(l2.records.get('plywood-18')?.onHand).toBe(20);
  });

  it('throws for negative onHand', () => {
    expect(() => addMaterial(createStockLedger(), makeRecord({ onHand: -1 }))).toThrow(RangeError);
  });

  it('throws for negative reorderPoint', () => {
    expect(() => addMaterial(createStockLedger(), makeRecord({ reorderPoint: -1 }))).toThrow(RangeError);
  });
});

// ─── createPurchaseOrder ──────────────────────────────────────────────────────

describe('createPurchaseOrder', () => {
  let base: StockLedger;
  beforeEach(() => {
    base = ledgerWith(makeRecord());
  });

  it('creates a draft order with a unique id', () => {
    const { order } = createPurchaseOrder(base, 'Timber Co', [
      { materialKey: 'plywood-18', description: 'Birch ply', quantity: 5, unitPrice: 45, unit: 'sheet' },
    ]);
    expect(order.status).toBe('draft');
    expect(order.id).toMatch(/^PO-/);
    expect(order.supplierName).toBe('Timber Co');
  });

  it('appends order to ledger', () => {
    const { ledger } = createPurchaseOrder(base, 'Timber Co', [
      { materialKey: 'plywood-18', description: 'x', quantity: 2, unitPrice: 45, unit: 'sheet' },
    ]);
    expect(ledger.orders).toHaveLength(1);
  });

  it('throws for empty lines', () => {
    expect(() => createPurchaseOrder(base, 'Timber Co', [])).toThrow(RangeError);
  });

  it('throws for blank supplier name', () => {
    expect(() =>
      createPurchaseOrder(base, '  ', [
        { materialKey: 'plywood-18', description: 'x', quantity: 1, unitPrice: 10, unit: 'sheet' },
      ]),
    ).toThrow(RangeError);
  });
});

// ─── submitPurchaseOrder ──────────────────────────────────────────────────────

describe('submitPurchaseOrder', () => {
  it('transitions draft → submitted', () => {
    const base = ledgerWith(makeRecord());
    const { ledger: l1, order } = createPurchaseOrder(base, 'Supplier', [
      { materialKey: 'plywood-18', description: 'x', quantity: 3, unitPrice: 45, unit: 'sheet' },
    ]);
    const l2 = submitPurchaseOrder(l1, order.id);
    expect(l2.orders[0].status).toBe('submitted');
    expect(l2.orders[0].submittedAt).toBeDefined();
  });

  it('throws when order not found', () => {
    expect(() => submitPurchaseOrder(createStockLedger(), 'PO-BOGUS')).toThrow(RangeError);
  });

  it('throws when order is not draft', () => {
    const base = ledgerWith(makeRecord());
    const { ledger: l1, order } = createPurchaseOrder(base, 'Supplier', [
      { materialKey: 'plywood-18', description: 'x', quantity: 1, unitPrice: 45, unit: 'sheet' },
    ]);
    const l2 = submitPurchaseOrder(l1, order.id);
    expect(() => submitPurchaseOrder(l2, order.id)).toThrow(RangeError);
  });
});

// ─── receivePurchaseOrder ─────────────────────────────────────────────────────

describe('receivePurchaseOrder', () => {
  it('increases on-hand stock and marks fully received', () => {
    const base = ledgerWith(makeRecord({ onHand: 2 }));
    const { ledger: l1, order } = createPurchaseOrder(base, 'Supplier', [
      { materialKey: 'plywood-18', description: 'x', quantity: 3, unitPrice: 45, unit: 'sheet' },
    ]);
    const l2 = submitPurchaseOrder(l1, order.id);
    const l3 = receivePurchaseOrder(l2, order.id, { 'plywood-18': 3 });
    expect(l3.records.get('plywood-18')?.onHand).toBe(5);
    expect(l3.orders[0].status).toBe('received');
  });

  it('marks partially-received when only some received', () => {
    const base = ledgerWith(makeRecord());
    const { ledger: l1, order } = createPurchaseOrder(base, 'Supplier', [
      { materialKey: 'plywood-18', description: 'x', quantity: 5, unitPrice: 45, unit: 'sheet' },
    ]);
    const l2 = submitPurchaseOrder(l1, order.id);
    const l3 = receivePurchaseOrder(l2, order.id, { 'plywood-18': 2 });
    expect(l3.orders[0].status).toBe('partially-received');
  });

  it('throws for negative received quantity', () => {
    const base = ledgerWith(makeRecord());
    const { ledger: l1, order } = createPurchaseOrder(base, 'Supplier', [
      { materialKey: 'plywood-18', description: 'x', quantity: 3, unitPrice: 45, unit: 'sheet' },
    ]);
    const l2 = submitPurchaseOrder(l1, order.id);
    expect(() => receivePurchaseOrder(l2, order.id, { 'plywood-18': -1 })).toThrow(RangeError);
  });
});

// ─── cancelPurchaseOrder ──────────────────────────────────────────────────────

describe('cancelPurchaseOrder', () => {
  it('cancels a draft order', () => {
    const base = ledgerWith(makeRecord());
    const { ledger: l1, order } = createPurchaseOrder(base, 'Supplier', [
      { materialKey: 'plywood-18', description: 'x', quantity: 1, unitPrice: 45, unit: 'sheet' },
    ]);
    const l2 = cancelPurchaseOrder(l1, order.id);
    expect(l2.orders[0].status).toBe('cancelled');
  });

  it('throws when trying to cancel a received order', () => {
    const base = ledgerWith(makeRecord());
    const { ledger: l1, order } = createPurchaseOrder(base, 'Supplier', [
      { materialKey: 'plywood-18', description: 'x', quantity: 1, unitPrice: 45, unit: 'sheet' },
    ]);
    const l2 = submitPurchaseOrder(l1, order.id);
    const l3 = receivePurchaseOrder(l2, order.id, { 'plywood-18': 1 });
    expect(() => cancelPurchaseOrder(l3, order.id)).toThrow(RangeError);
  });
});

// ─── computeReorderAlerts ─────────────────────────────────────────────────────

describe('computeReorderAlerts', () => {
  it('returns empty when all stock is above reorder point', () => {
    const l = ledgerWith(makeRecord({ onHand: 10, reorderPoint: 3 }));
    expect(computeReorderAlerts(l)).toHaveLength(0);
  });

  it('triggers info alert when at reorder point', () => {
    const l = ledgerWith(makeRecord({ onHand: 3, reorderPoint: 3 }));
    const alerts = computeReorderAlerts(l);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('info');
  });

  it('triggers warning alert at half the reorder point', () => {
    const l = ledgerWith(makeRecord({ onHand: 1, reorderPoint: 3 }));
    const alerts = computeReorderAlerts(l);
    expect(alerts[0].severity).toBe('warning');
  });

  it('triggers critical alert at zero stock', () => {
    const l = ledgerWith(makeRecord({ onHand: 0, reorderPoint: 3 }));
    const alerts = computeReorderAlerts(l);
    expect(alerts[0].severity).toBe('critical');
  });

  it('suggestedOrderQty is at least DEFAULT_REORDER_MULTIPLIER times deficit', () => {
    const l = ledgerWith(makeRecord({ onHand: 0, reorderPoint: 4, reorderQty: 1 }));
    const [alert] = computeReorderAlerts(l);
    expect(alert.suggestedOrderQty).toBeGreaterThanOrEqual(4 * DEFAULT_REORDER_MULTIPLIER);
  });

  it('sorts critical alerts before warning before info', () => {
    const l = ledgerWith(
      makeRecord({ materialKey: 'a', onHand: 3, reorderPoint: 3, description: 'A' }),
      makeRecord({ materialKey: 'b', onHand: 0, reorderPoint: 3, description: 'B' }),
      makeRecord({ materialKey: 'c', onHand: 1, reorderPoint: 3, description: 'C' }),
    );
    const alerts = computeReorderAlerts(l);
    expect(alerts[0].severity).toBe('critical');
  });
});

// ─── recordWaste ──────────────────────────────────────────────────────────────

describe('recordWaste', () => {
  it('deducts from on-hand and adds to waste log', () => {
    const base = ledgerWith(makeRecord({ onHand: 10 }));
    const next = recordWaste(base, 'plywood-18', 2, 'Offcut too small');
    expect(next.records.get('plywood-18')?.onHand).toBe(8);
    expect(next.wasteLog).toHaveLength(1);
    expect(next.wasteLog[0].quantity).toBe(2);
  });

  it('throws for zero or negative quantity', () => {
    const base = ledgerWith(makeRecord());
    expect(() => recordWaste(base, 'plywood-18', 0, 'x')).toThrow(RangeError);
    expect(() => recordWaste(base, 'plywood-18', -1, 'x')).toThrow(RangeError);
  });

  it('throws when wasting more than on-hand', () => {
    const base = ledgerWith(makeRecord({ onHand: 2 }));
    expect(() => recordWaste(base, 'plywood-18', 5, 'x')).toThrow(RangeError);
  });

  it('throws for unknown material key', () => {
    expect(() => recordWaste(createStockLedger(), 'unknown-mat', 1, 'x')).toThrow(RangeError);
  });
});

// ─── getStockSummary ──────────────────────────────────────────────────────────

describe('getStockSummary', () => {
  it('computes total value correctly', () => {
    const l = ledgerWith(makeRecord({ onHand: 4, unitCost: 50 }));
    const s = getStockSummary(l);
    expect(s.totalValue).toBeCloseTo(200);
  });

  it('counts critical and low stock', () => {
    const l = ledgerWith(
      makeRecord({ materialKey: 'a', onHand: 0, reorderPoint: 3, description: 'A' }),
      makeRecord({ materialKey: 'b', onHand: 1, reorderPoint: 3, description: 'B' }),
    );
    const s = getStockSummary(l);
    expect(s.criticalStockCount).toBe(1);
    expect(s.lowStockCount).toBe(1);
  });

  it('counts pending orders', () => {
    const base = ledgerWith(makeRecord());
    const { ledger: l1, order } = createPurchaseOrder(base, 'Supplier', [
      { materialKey: 'plywood-18', description: 'x', quantity: 2, unitPrice: 45, unit: 'sheet' },
    ]);
    const l2 = submitPurchaseOrder(l1, order.id);
    expect(getStockSummary(l2).pendingOrderCount).toBe(1);
  });

  it('accumulates total waste', () => {
    const base = ledgerWith(makeRecord({ onHand: 10 }));
    const l1 = recordWaste(base, 'plywood-18', 3, 'cut-off');
    const l2 = recordWaste(l1, 'plywood-18', 1, 'damaged');
    expect(getStockSummary(l2).totalWaste).toBe(4);
  });
});

// ─── formatStockReport ────────────────────────────────────────────────────────

describe('formatStockReport', () => {
  it('returns non-empty string', () => {
    expect(formatStockReport(createStockLedger()).length).toBeGreaterThan(0);
  });

  it('includes alert severity tags when present', () => {
    const l = ledgerWith(makeRecord({ onHand: 0, reorderPoint: 5 }));
    const report = formatStockReport(l);
    expect(report).toContain('CRITICAL');
  });

  it('reports material count and value', () => {
    const l = ledgerWith(makeRecord({ onHand: 2, unitCost: 50 }));
    const report = formatStockReport(l);
    expect(report).toContain('Materials tracked: 1');
    expect(report).toContain('100.00');
  });
});
