/** Curated public exports for the workshop engine domain. */

export { assignPartLabels, buildPartLabelMap, formatPartLabelsAsCsv } from './part-labeling';

export type { LabeledPart, LabelingOptions } from './part-labeling';

export {
  createStockStore,
  addStockItem,
  updateOnHand,
  checkAvailability,
  getShortfalls,
  formatAvailabilityReport,
} from './stock/index';

export type { StockItem, StockStore, StockUnit, DemandEntry, AvailabilityResult, StockStatus } from './stock/index';

export { MACHINE_PROFILES, MACHINE_PROFILE_IDS, getMachineProfile, getDefaultMachineProfile } from './machine-profiles';

export type { MachineProfile, MachineProfileId, ControllerFirmware, SpindleHint } from './machine-profiles';

export { extractToolSetup, generateMachiningJob, validateMachiningJob, resetIdCounter } from './machining-job';

export type {
  OperationType,
  MachiningOperation,
  ToolSetup,
  MachinablePart,
  DadoSpec,
  DrillHoleSpec,
  MachiningJob,
  JobOptions,
} from './machining-job';

export {
  createStreamSession,
  startSession,
  pauseSession,
  resumeSession,
  cancelSession,
  markLinesSent,
  acknowledgeLines,
  markLineError,
  retryLine,
  getStreamProgress,
  getErrorLines,
  formatStreamReport,
  DEFAULT_MAX_RETRIES,
  SESSION_ID_PREFIX,
  DEFAULT_SERIAL_PROFILE,
} from './webserial-v2';

export type {
  StreamLineState,
  StreamLine,
  StreamSessionState,
  StreamSession,
  StreamProgress,
  StreamError,
  WebSerialState,
  WebSerialProfile,
} from './webserial-v2';

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
} from './stock/index';

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
} from './stock/index';

export {
  createJobQueue,
  enqueueJob,
  cancelJob,
  promoteNextJobs,
  completeJob,
  failJob,
  reprioritiseJob,
  getQueueStats,
  getJobsByMachine,
  purgeFinishedJobs,
  DEFAULT_QUEUE_CONFIG,
} from './cnc-job-queue';

export type { JobPriority, JobState, QueuedJob, QueueStats, QueueConfig, EnqueueResult } from './cnc-job-queue';

export {
  isCapable,
  findCapableMachines,
  selectMachine,
  distributeJobs,
  markDispatched,
  markComplete as markWorkflowComplete,
  markFailed as markWorkflowFailed,
  getWorkflowProgress,
  computeMachineLoads,
  DEFAULT_WORKFLOW_CONFIG,
} from './multi-machine';

export type {
  MachineCapabilities,
  WorkshopMachine,
  JobAssignment,
  WorkflowDistribution,
  MachineLoad,
  DistributionStrategy,
  WorkflowConfig,
} from './multi-machine';

export {
  createInventory,
  addTool,
  removeTool,
  logUsage,
  getToolStatus,
  getAllToolStatuses,
  getMaintenanceAlerts,
  estimateRemainingForMaterial,
  MAX_TOOLS,
  MAX_USAGE_ENTRIES,
  CONDITION_THRESHOLDS,
  HARDNESS_FACTORS,
} from './tool-wear';

export type {
  ToolType,
  WearModel,
  ToolCondition,
  Tool,
  UsageEntry,
  ToolStatus,
  MaintenanceAlert,
  ToolInventory,
} from './tool-wear';

export {
  machineCfm,
  machineStaticPressure,
  recommendTrunkDiameter,
  recommendHp,
  calculateSystem,
  validateCollector,
  BASE_CFM,
} from './dust-collection';

export type {
  MachineType,
  DuctShape,
  DustMachine,
  DuctSegment,
  DustCollectionResult,
  MachineAirflow,
  CollectorSpec,
} from './dust-collection';

export { generateMaintenanceSchedule, computeHealthScore, getMostUrgentPerTool } from './maintenance-scheduler';

export type {
  IntervalUnit,
  MaintenancePriority,
  MaintenanceStatus,
  MaintenanceRule,
  ToolUsageState,
  MaintenanceEvent,
  MaintenanceScheduleResult,
} from './maintenance-scheduler';

export { checkStock, analyzeInventory, projectUsage, generateReorderList } from './stock/index';

export type {
  InventoryItem,
  InventoryStockStatus,
  StockCheck,
  ProjectUsage,
  UsageProjection,
  InventoryAnalysisResult,
} from './stock/index';

export { generatePanelLabel, generateLabelBatch, formatLabelText } from './panel-label';

export type { BandedEdge, PanelLabelInput, PanelLabel, PanelLabelBatch } from './panel-label';
