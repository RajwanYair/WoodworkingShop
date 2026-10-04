/**
 * Advanced stock management engine.
 *
 * Purchase orders, reorder alerts, waste tracking, and stock ledger.
 * Pure TypeScript. No DOM, no React, no side effects.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type PurchaseOrderStatus = 'draft' | 'submitted' | 'confirmed' | 'partially-received' | 'received' | 'cancelled';

/** A single line item in a purchase order. */
export interface PurchaseOrderLine {
  materialKey: string;
  description: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  received: number;
}

/** A purchase order grouping one or more material line items. */
export interface PurchaseOrder {
  id: string;
  status: PurchaseOrderStatus;
  supplierName: string;
  lines: PurchaseOrderLine[];
  createdAt: number;
  submittedAt?: number;
  receivedAt?: number;
  notes: string;
}

export type AlertSeverity = 'info' | 'warning' | 'critical';

/** A reorder alert triggered when stock falls below a threshold. */
export interface ReorderAlert {
  materialKey: string;
  currentStock: number;
  reorderPoint: number;
  suggestedOrderQty: number;
  severity: AlertSeverity;
  message: string;
}

/** A waste entry recording material consumed but not used in parts. */
export interface WasteEntry {
  id: string;
  materialKey: string;
  quantity: number;
  reason: string;
  recordedAt: number;
}

/** A per-material stock record in the ledger. */
export interface StockRecord {
  materialKey: string;
  description: string;
  onHand: number;
  unit: string;
  reorderPoint: number;
  reorderQty: number;
  unitCost: number;
}

/** The complete stock ledger: material records + order history + waste log. */
export interface StockLedger {
  records: Map<string, StockRecord>;
  orders: PurchaseOrder[];
  wasteLog: WasteEntry[];
}

/** Summary snapshot for reporting. */
export interface StockSummary {
  totalMaterials: number;
  totalValue: number;
  lowStockCount: number;
  criticalStockCount: number;
  pendingOrderCount: number;
  totalWaste: number;
  alerts: ReorderAlert[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const DEFAULT_REORDER_MULTIPLIER = 2;
let _poCounter = 0;
let _wasteCounter = 0;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePOId(): string {
  return `PO-${(++_poCounter).toString().padStart(5, '0')}`;
}

function makeWasteId(): string {
  return `WASTE-${(++_wasteCounter).toString().padStart(6, '0')}`;
}

function cloneLedger(ledger: StockLedger): StockLedger {
  return {
    records: new Map(Array.from(ledger.records.entries()).map(([k, v]) => [k, { ...v }])),
    orders: ledger.orders.map((o) => ({
      ...o,
      lines: o.lines.map((l) => ({ ...l })),
    })),
    wasteLog: ledger.wasteLog.map((w) => ({ ...w })),
  };
}

// ─── Ledger lifecycle ─────────────────────────────────────────────────────────

/**
 * Create an empty stock ledger.
 */
export function createStockLedger(): StockLedger {
  return { records: new Map(), orders: [], wasteLog: [] };
}

/**
 * Add or update a material record in the ledger.
 * If the material already exists, merges the provided fields.
 */
export function addMaterial(ledger: StockLedger, record: StockRecord): StockLedger {
  if (record.onHand < 0) {
    throw new RangeError(`addMaterial: onHand must be ≥ 0, got ${record.onHand}`);
  }
  if (record.reorderPoint < 0) {
    throw new RangeError(`addMaterial: reorderPoint must be ≥ 0, got ${record.reorderPoint}`);
  }
  const next = cloneLedger(ledger);
  next.records.set(record.materialKey, { ...record });
  return next;
}

// ─── Purchase orders ──────────────────────────────────────────────────────────

/**
 * Create a draft purchase order.
 */
export function createPurchaseOrder(
  ledger: StockLedger,
  supplierName: string,
  lines: Omit<PurchaseOrderLine, 'received'>[],
  notes: string = '',
): { ledger: StockLedger; order: PurchaseOrder } {
  if (lines.length === 0) {
    throw new RangeError('createPurchaseOrder: lines must not be empty');
  }
  if (!supplierName.trim()) {
    throw new RangeError('createPurchaseOrder: supplierName must not be blank');
  }
  const order: PurchaseOrder = {
    id: makePOId(),
    status: 'draft',
    supplierName: supplierName.trim(),
    lines: lines.map((l) => ({ ...l, received: 0 })),
    createdAt: Date.now(),
    notes,
  };
  const next = cloneLedger(ledger);
  next.orders.push(order);
  return { ledger: next, order };
}

/**
 * Submit a draft purchase order to the supplier.
 */
export function submitPurchaseOrder(ledger: StockLedger, orderId: string): StockLedger {
  const next = cloneLedger(ledger);
  const order = next.orders.find((o) => o.id === orderId);
  if (!order) {
    throw new RangeError(`submitPurchaseOrder: order "${orderId}" not found`);
  }
  if (order.status !== 'draft') {
    throw new RangeError(`submitPurchaseOrder: order "${orderId}" is not in draft status`);
  }
  order.status = 'submitted';
  order.submittedAt = Date.now();
  return next;
}

/**
 * Record receipt of goods against a purchase order.
 * Quantities received are added to stock on-hand.
 * Partial receipt sets status to 'partially-received'; full receipt → 'received'.
 */
export function receivePurchaseOrder(
  ledger: StockLedger,
  orderId: string,
  receivedQtys: Record<string, number>,
): StockLedger {
  const next = cloneLedger(ledger);
  const order = next.orders.find((o) => o.id === orderId);
  if (!order) {
    throw new RangeError(`receivePurchaseOrder: order "${orderId}" not found`);
  }
  if (order.status !== 'submitted' && order.status !== 'confirmed' && order.status !== 'partially-received') {
    throw new RangeError(`receivePurchaseOrder: order "${orderId}" cannot be received from status "${order.status}"`);
  }

  for (const line of order.lines) {
    const qty = receivedQtys[line.materialKey] ?? 0;
    if (qty < 0) {
      throw new RangeError(`receivePurchaseOrder: received quantity for "${line.materialKey}" must be ≥ 0`);
    }
    line.received += qty;

    // Update on-hand stock
    const record = next.records.get(line.materialKey);
    if (record) {
      record.onHand += qty;
    }
  }

  const allReceived = order.lines.every((l) => l.received >= l.quantity);
  const anyReceived = order.lines.some((l) => l.received > 0);
  if (allReceived) {
    order.status = 'received';
    order.receivedAt = Date.now();
  } else if (anyReceived) {
    order.status = 'partially-received';
  }

  return next;
}

/**
 * Cancel a purchase order (draft or submitted only).
 */
export function cancelPurchaseOrder(ledger: StockLedger, orderId: string): StockLedger {
  const next = cloneLedger(ledger);
  const order = next.orders.find((o) => o.id === orderId);
  if (!order) {
    throw new RangeError(`cancelPurchaseOrder: order "${orderId}" not found`);
  }
  if (order.status !== 'draft' && order.status !== 'submitted') {
    throw new RangeError(`cancelPurchaseOrder: cannot cancel order in status "${order.status}"`);
  }
  order.status = 'cancelled';
  return next;
}

// ─── Reorder alerts ───────────────────────────────────────────────────────────

/**
 * Compute reorder alerts for all materials at or below their reorder point.
 */
export function computeReorderAlerts(ledger: StockLedger): ReorderAlert[] {
  const alerts: ReorderAlert[] = [];
  for (const record of ledger.records.values()) {
    if (record.onHand <= record.reorderPoint) {
      const deficit = record.reorderPoint - record.onHand;
      const suggestedOrderQty = Math.max(record.reorderQty, deficit * DEFAULT_REORDER_MULTIPLIER);

      let severity: AlertSeverity;
      if (record.onHand === 0) {
        severity = 'critical';
      } else if (record.onHand <= record.reorderPoint * 0.5) {
        severity = 'warning';
      } else {
        severity = 'info';
      }

      alerts.push({
        materialKey: record.materialKey,
        currentStock: record.onHand,
        reorderPoint: record.reorderPoint,
        suggestedOrderQty,
        severity,
        message: `${record.description}: ${record.onHand} ${record.unit} on hand (reorder at ${record.reorderPoint})`,
      });
    }
  }
  return alerts.sort((a, b) => {
    const order: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });
}

// ─── Waste tracking ───────────────────────────────────────────────────────────

/**
 * Record a waste event and deduct from on-hand stock.
 */
export function recordWaste(ledger: StockLedger, materialKey: string, quantity: number, reason: string): StockLedger {
  if (quantity <= 0) {
    throw new RangeError(`recordWaste: quantity must be > 0, got ${quantity}`);
  }
  const next = cloneLedger(ledger);
  const record = next.records.get(materialKey);
  if (!record) {
    throw new RangeError(`recordWaste: material "${materialKey}" not in ledger`);
  }
  if (record.onHand < quantity) {
    throw new RangeError(`recordWaste: cannot waste ${quantity} — only ${record.onHand} on hand`);
  }
  record.onHand -= quantity;

  const entry: WasteEntry = {
    id: makeWasteId(),
    materialKey,
    quantity,
    reason,
    recordedAt: Date.now(),
  };
  next.wasteLog.push(entry);
  return next;
}

// ─── Summary & reporting ──────────────────────────────────────────────────────

/**
 * Compute a stock summary snapshot.
 */
export function getStockSummary(ledger: StockLedger): StockSummary {
  const alerts = computeReorderAlerts(ledger);
  let totalValue = 0;

  for (const record of ledger.records.values()) {
    totalValue += record.onHand * record.unitCost;
  }

  const pendingOrderCount = ledger.orders.filter(
    (o) => o.status === 'submitted' || o.status === 'confirmed' || o.status === 'partially-received',
  ).length;

  const totalWaste = ledger.wasteLog.reduce((sum, w) => sum + w.quantity, 0);

  return {
    totalMaterials: ledger.records.size,
    totalValue,
    lowStockCount: alerts.filter((a) => a.severity === 'warning').length,
    criticalStockCount: alerts.filter((a) => a.severity === 'critical').length,
    pendingOrderCount,
    totalWaste,
    alerts,
  };
}

/**
 * Format a human-readable stock report.
 */
export function formatStockReport(ledger: StockLedger): string {
  const summary = getStockSummary(ledger);
  const lines: string[] = [
    'Stock Management Report',
    `Materials tracked: ${summary.totalMaterials}`,
    `Total inventory value: ${summary.totalValue.toFixed(2)}`,
    `Low stock alerts: ${summary.lowStockCount} warning, ${summary.criticalStockCount} critical`,
    `Pending orders: ${summary.pendingOrderCount}`,
    `Total waste recorded: ${summary.totalWaste}`,
  ];
  if (summary.alerts.length > 0) {
    lines.push('Reorder Alerts:');
    for (const alert of summary.alerts) {
      lines.push(`  [${alert.severity.toUpperCase()}] ${alert.message}`);
    }
  }
  return lines.join('\n');
}
