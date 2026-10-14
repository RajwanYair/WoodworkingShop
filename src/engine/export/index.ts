/**
 * Phase 12 / Sprint 8 — Engine export sub-module barrel.
 * Covers: G-code toolpath parsing, G-code validation.
 *
 * @example
 * ```ts
 * import { parseToolpath, validateGcode } from '../engine/export';
 * ```
 */
export { parseToolpath } from './gcode-toolpath.ts';
export type { MoveKind, ToolMove, ToolpathBounds, ParsedToolpath } from './gcode-toolpath.ts';

export { validateGcode } from './gcode-validator.ts';
export type { GcodeSeverity, GcodeIssue, GcodeValidationResult } from './gcode-validator.ts';

export { generateIfcContent } from './ifc-export';
export type { IfcResult } from './ifc-export';

export { generateStepContent } from './step-export';
export type { StepResult } from './step-export';

export { generateGltfContent } from './gltf-document';
export type { GltfResult } from './gltf-document';

export { filterBomParts, getBomMaterials, getBomPartTypes, getBomZones, totalPartCount } from './bom-filter';

export type { BomFilterablePart, BomFilterCriteria } from './bom-filter';

export {
  EXPORT_FORMATS,
  getFormatsByCategory,
  getAvailableFormats,
  getExportFormat,
  describeFormat,
} from './export-format';

export type { ExportFormatId, ExportCategory, ExportFormat } from './export-format';

export {
  buildErpLineItems,
  formatAsSap,
  formatAsOracle,
  formatAsWebhook,
  validateErpPayload,
  exportErp,
  ERP_SCHEMA_VERSION,
} from './erp-export';

export type { ErpSystem, ErpFindingSeverity, ErpLineItem, ErpHeader, ErpExportResult, ErpFinding } from './erp-export';

export {
  buildGltfScene,
  serializeGltf,
  estimateGltfSize,
  buildIfcScene,
  serializeIfc,
  GLTF_SCHEMA_VERSION,
  IFC_SCHEMA_VERSION,
  GLTF_GENERATOR,
} from './gltf-ifc-model';

export type {
  GltfComponentType,
  GltfAccessorType,
  GltfVec3,
  GltfPbrMaterial,
  GltfBoxMesh,
  GltfNode,
  GltfScene,
  GltfExportResult,
  IfcEntity,
  IfcRelationship,
  IfcScene,
  IfcExportResult,
} from './gltf-ifc-model';

export {
  createBatchJob,
  startNextItem,
  recordSuccess,
  recordFailure,
  cancelBatch,
  getBatchProgress,
  generateManifest,
  getItemsByFormat,
  generateFileName,
  MAX_BATCH_ITEMS,
  MAX_CONCURRENT,
} from './batch-export';

export type {
  ExportFormat as BatchExportFormat,
  ExportPriority,
  ExportItemStatus,
  BatchStatus,
  ExportItemConfig,
  ExportOptions,
  ExportItemResult,
  BatchExportJob,
  BatchProgress,
  ExportManifest,
  IdGenerator as BatchIdGenerator,
} from './batch-export';
