export {
  createStockStore,
  addStockItem,
  updateOnHand,
  checkAvailability,
  getShortfalls,
  formatAvailabilityReport,
} from './tracker';
export type { StockItem, StockStore, StockUnit, DemandEntry, AvailabilityResult, StockStatus } from './tracker';

export {
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
} from './management';
export type {
  PurchaseOrderStatus,
  PurchaseOrderLine,
  PurchaseOrder,
  AlertSeverity,
  ReorderAlert,
  WasteEntry,
  StockRecord,
  StockLedger,
  StockSummary,
} from './management';

export { checkStock, analyzeInventory, projectUsage, generateReorderList } from './inventory';
export type {
  InventoryItem,
  StockStatus as InventoryStockStatus,
  StockCheck,
  ProjectUsage,
  UsageProjection,
  InventoryAnalysisResult,
} from './inventory';
