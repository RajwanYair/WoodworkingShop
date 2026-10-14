/**
 * Sprint 163 — Batch Export Pipeline.
 *
 * Orchestrates exporting multiple projects or cabinets in a single operation.
 * Supports PDF, DXF, G-code, and BOM export formats with progress tracking
 * and error isolation (one failed export doesn't abort the entire batch).
 *
 * Features:
 *   - Batch job creation with multiple export items
 *   - Format-specific export configuration
 *   - Progress tracking per item and overall
 *   - Error isolation with per-item status
 *   - Export manifest generation (summary of all outputs)
 *   - Priority ordering (critical items first)
 *   - Batch cancellation support
 *
 * Pure TypeScript — no React, no DOM, no side effects.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Supported export formats. */
export type ExportFormat = 'pdf' | 'dxf' | 'gcode' | 'bom-csv' | 'bom-json';

/** Export priority level. */
export type ExportPriority = 'high' | 'normal' | 'low';

/** Status of an individual export item. */
export type ExportItemStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

/** Status of the entire batch. */
export type BatchStatus = 'idle' | 'running' | 'completed' | 'cancelled' | 'partial';

/** Configuration for a single export item. */
export interface ExportItemConfig {
  /** Unique item ID. */
  id: string;
  /** Project ID to export. */
  projectId: string;
  /** Project display name. */
  projectName: string;
  /** Export format. */
  format: ExportFormat;
  /** Priority level. */
  priority: ExportPriority;
  /** Format-specific options. */
  options: ExportOptions;
}

/** Format-specific export options. */
export interface ExportOptions {
  /** Include cut list (PDF/BOM). */
  includeCutList?: boolean;
  /** Include assembly instructions (PDF). */
  includeAssembly?: boolean;
  /** Include hardware list (PDF/BOM). */
  includeHardware?: boolean;
  /** DXF layer separation by material. */
  separateLayers?: boolean;
  /** G-code machine profile ID. */
  machineProfile?: string;
  /** Paper size for PDF. */
  paperSize?: 'A4' | 'A3' | 'letter' | 'tabloid';
}

/** Result of a single export item. */
export interface ExportItemResult {
  /** Item ID. */
  id: string;
  /** Final status. */
  status: ExportItemStatus;
  /** Output file name (if completed). */
  fileName: string | null;
  /** Output size in bytes (if completed). */
  sizeBytes: number | null;
  /** Error message (if failed). */
  error: string | null;
  /** Duration in ms. */
  durationMs: number;
}

/** A batch export job. */
export interface BatchExportJob {
  /** Unique batch ID. */
  batchId: string;
  /** Batch display name. */
  name: string;
  /** All export items. */
  items: ExportItemConfig[];
  /** Current batch status. */
  status: BatchStatus;
  /** Results for completed/failed items. */
  results: ExportItemResult[];
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 completion timestamp. */
  completedAt: string | null;
  /** Current processing index (-1 if not started). */
  currentIndex: number;
}

/** Batch progress information. */
export interface BatchProgress {
  /** Total items. */
  total: number;
  /** Completed items. */
  completed: number;
  /** Failed items. */
  failed: number;
  /** Cancelled items. */
  cancelled: number;
  /** Pending items. */
  pending: number;
  /** Overall percentage (0–100). */
  percentage: number;
  /** Estimated remaining time in ms (null if unknown). */
  estimatedRemainingMs: number | null;
}

/** Export manifest summarising a completed batch. */
export interface ExportManifest {
  /** Batch ID. */
  batchId: string;
  /** Batch name. */
  name: string;
  /** Total items. */
  totalItems: number;
  /** Successfully exported items. */
  successCount: number;
  /** Failed items. */
  failCount: number;
  /** Total output size in bytes. */
  totalSizeBytes: number;
  /** Total duration in ms. */
  totalDurationMs: number;
  /** Individual results. */
  items: ExportItemResult[];
}

/** ID generator function type (injectable for testing). */
export type IdGenerator = () => string;

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum items per batch. */
export const MAX_BATCH_ITEMS = 200;

/** Maximum concurrent exports (for future worker support). */
export const MAX_CONCURRENT = 4;

/** Priority weight for ordering. */
const PRIORITY_WEIGHT: Record<ExportPriority, number> = {
  high: 0,
  normal: 1,
  low: 2,
};

// ─── Core functions ───────────────────────────────────────────────────────────

/**
 * Create a new batch export job.
 *
 * @param name       Batch display name.
 * @param items      Export items to include.
 * @param idGen      ID generator (injectable for testing).
 * @returns New batch export job.
 * @throws RangeError if name is empty or items exceed MAX_BATCH_ITEMS.
 */
export function createBatchJob(
  name: string,
  items: ExportItemConfig[],
  idGen: IdGenerator = defaultIdGenerator,
): BatchExportJob {
  if (!name || name.trim().length === 0) {
    throw new RangeError('createBatchJob: name must not be empty');
  }
  if (items.length === 0) {
    throw new RangeError('createBatchJob: at least one item is required');
  }
  if (items.length > MAX_BATCH_ITEMS) {
    throw new RangeError(`createBatchJob: items exceed maximum of ${MAX_BATCH_ITEMS}`);
  }

  return {
    batchId: idGen(),
    name: name.trim(),
    items: sortByPriority(items),
    status: 'idle',
    results: [],
    createdAt: new Date().toISOString(),
    completedAt: null,
    currentIndex: -1,
  };
}

/**
 * Start processing the next item in a batch job.
 *
 * @param job  Current batch job state.
 * @returns Updated job with next item marked as processing, or null if done.
 */
export function startNextItem(job: BatchExportJob): BatchExportJob | null {
  const nextIndex = job.currentIndex + 1;
  if (nextIndex >= job.items.length) return null;
  if (job.status === 'cancelled') return null;

  return {
    ...job,
    status: 'running',
    currentIndex: nextIndex,
  };
}

/**
 * Record a successful export result.
 *
 * @param job         Current batch job.
 * @param itemId      Item that completed.
 * @param fileName    Output file name.
 * @param sizeBytes   Output size.
 * @param durationMs  Processing duration.
 * @returns Updated job.
 */
export function recordSuccess(
  job: BatchExportJob,
  itemId: string,
  fileName: string,
  sizeBytes: number,
  durationMs: number,
): BatchExportJob {
  const result: ExportItemResult = {
    id: itemId,
    status: 'completed',
    fileName,
    sizeBytes,
    error: null,
    durationMs,
  };
  const results = [...job.results, result];
  const status = computeBatchStatus(job.items.length, results);

  return {
    ...job,
    results,
    status,
    completedAt: status !== 'running' ? new Date().toISOString() : null,
  };
}

/**
 * Record a failed export result.
 *
 * @param job         Current batch job.
 * @param itemId      Item that failed.
 * @param error       Error message.
 * @param durationMs  Processing duration.
 * @returns Updated job.
 */
export function recordFailure(job: BatchExportJob, itemId: string, error: string, durationMs: number): BatchExportJob {
  const result: ExportItemResult = {
    id: itemId,
    status: 'failed',
    fileName: null,
    sizeBytes: null,
    error,
    durationMs,
  };
  const results = [...job.results, result];
  const status = computeBatchStatus(job.items.length, results);

  return {
    ...job,
    results,
    status,
    completedAt: status !== 'running' ? new Date().toISOString() : null,
  };
}

/**
 * Cancel a batch job. Remaining items are marked as cancelled.
 *
 * @param job  Current batch job.
 * @returns Updated job with cancelled status.
 */
export function cancelBatch(job: BatchExportJob): BatchExportJob {
  if (job.status === 'completed' || job.status === 'cancelled') return job;

  const processedIds = new Set(job.results.map((r) => r.id));
  const cancelledResults: ExportItemResult[] = job.items
    .filter((item) => !processedIds.has(item.id))
    .map((item) => ({
      id: item.id,
      status: 'cancelled' as const,
      fileName: null,
      sizeBytes: null,
      error: null,
      durationMs: 0,
    }));

  return {
    ...job,
    status: 'cancelled',
    results: [...job.results, ...cancelledResults],
    completedAt: new Date().toISOString(),
  };
}

/**
 * Get current progress of a batch job.
 *
 * @param job  Current batch job.
 * @returns Progress information.
 */
export function getBatchProgress(job: BatchExportJob): BatchProgress {
  const total = job.items.length;
  const completed = job.results.filter((r) => r.status === 'completed').length;
  const failed = job.results.filter((r) => r.status === 'failed').length;
  const cancelled = job.results.filter((r) => r.status === 'cancelled').length;
  const pending = total - completed - failed - cancelled;
  const percentage = total > 0 ? Math.round(((completed + failed + cancelled) / total) * 100) : 0;

  // Estimate remaining time from average completed duration
  const completedResults = job.results.filter((r) => r.status === 'completed');
  let estimatedRemainingMs: number | null = null;
  if (completedResults.length > 0 && pending > 0) {
    const avgMs = completedResults.reduce((s, r) => s + r.durationMs, 0) / completedResults.length;
    estimatedRemainingMs = Math.round(avgMs * pending);
  }

  return { total, completed, failed, cancelled, pending, percentage, estimatedRemainingMs };
}

/**
 * Generate an export manifest from a completed batch.
 *
 * @param job  Completed batch job.
 * @returns Export manifest.
 * @throws RangeError if batch is still running.
 */
export function generateManifest(job: BatchExportJob): ExportManifest {
  if (job.status === 'running' || job.status === 'idle') {
    throw new RangeError('generateManifest: batch is not yet complete');
  }

  const successCount = job.results.filter((r) => r.status === 'completed').length;
  const failCount = job.results.filter((r) => r.status === 'failed').length;
  const totalSizeBytes = job.results.reduce((s, r) => s + (r.sizeBytes ?? 0), 0);
  const totalDurationMs = job.results.reduce((s, r) => s + r.durationMs, 0);

  return {
    batchId: job.batchId,
    name: job.name,
    totalItems: job.items.length,
    successCount,
    failCount,
    totalSizeBytes,
    totalDurationMs,
    items: job.results,
  };
}

/**
 * Filter batch items by format.
 *
 * @param job     Batch job.
 * @param format  Format to filter by.
 * @returns Filtered items.
 */
export function getItemsByFormat(job: BatchExportJob, format: ExportFormat): ExportItemConfig[] {
  return job.items.filter((item) => item.format === format);
}

/**
 * Get the file name for an export item based on project name and format.
 *
 * @param projectName  Project display name.
 * @param format       Export format.
 * @returns Sanitised file name.
 */
export function generateFileName(projectName: string, format: ExportFormat): string {
  const safe = projectName
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
  const ext = FORMAT_EXTENSIONS[format];
  return `${safe}.${ext}`;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const FORMAT_EXTENSIONS: Record<ExportFormat, string> = {
  pdf: 'pdf',
  dxf: 'dxf',
  gcode: 'nc',
  'bom-csv': 'csv',
  'bom-json': 'json',
};

function sortByPriority(items: ExportItemConfig[]): ExportItemConfig[] {
  return [...items].sort((a, b) => PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]);
}

function computeBatchStatus(totalItems: number, results: ExportItemResult[]): BatchStatus {
  if (results.length < totalItems) return 'running';
  const allCompleted = results.every((r) => r.status === 'completed');
  if (allCompleted) return 'completed';
  const allCancelled = results.every((r) => r.status === 'cancelled');
  if (allCancelled) return 'cancelled';
  return 'partial';
}

function defaultIdGenerator(): string {
  return `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
