/** Curated public exports for the costing engine domain. */

export { estimateCost, DEFAULT_LABOUR_RATE } from './cost-estimator';

export type { CostBreakdown, SheetCost, HardwareCost } from './cost-estimator';

export { generateCostVarianceReport, formatCostVarianceReportAsCsv } from './cost-variance';

export type { MaterialCostEntry, CostVarianceLine, CostVarianceReport } from './cost-variance';

export { findBestPrice, computePriceTrend, estimateProjectCost, detectPriceAnomalies } from './material-cost-tracker';

export type {
  PriceEntry,
  MaterialDemand as CostTrackerMaterialDemand,
  MaterialCostLine,
  TrendDirection,
  PriceTrend,
  ProjectCostResult,
} from './material-cost-tracker';

export {
  generateUsageReport,
  costPerSquareMetre,
  mostWastefulMaterial,
  mostExpensiveMaterial,
} from './material-usage-report';

export type { UsagePart, SheetStock, MaterialUsage, UsageReport } from './material-usage-report';

export { estimateCabinetWeight, categorizeFastener, maxShelfLoad, MATERIAL_DENSITIES } from './cabinet-weight';

export type {
  PanelMaterial,
  WeightPanel,
  WeightHardware,
  WeightEstimate,
  PanelWeight,
  FastenerCategory,
} from './cabinet-weight';

export { calculateBoardFeet, linearFeetToBoardFeet, NOMINAL_TO_ACTUAL, SPECIES_COST_PER_BF } from './board-feet';

export type { BoardFeetInput, BoardFeetResult } from './board-feet';
