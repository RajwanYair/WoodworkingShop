/**
 * Batch Export — Sprint 19
 *
 * Coordinate parallel export of a project in multiple formats simultaneously.
 * Instead of making the user trigger exports one at a time, `batchExport()`
 * runs all requested export tasks concurrently and collects results (with
 * per-task success/error reporting).
 *
 * Each export task is a named callable that returns a `Blob` (or string) plus
 * a suggested filename.  Tasks are fully composable — callers register
 * adapters for G-code, DXF, BOM, IFC, etc.
 *
 * Pure TypeScript — no React, no side-effects (callers provide adapters).
 */

// ── Types ─────────────────────────────────────────────────────────────────────

/** Supported export format identifiers. */
export type BatchExportFormat = 'gcode' | 'dxf' | 'bom-csv' | 'bom-xlsx' | 'ifc' | 'pdf' | string;

/** An individual export task descriptor. */
export interface ExportTask {
  /** Unique task ID within the batch (e.g. 'gcode-sheet-1'). */
  id: string;
  /** Human-readable label. */
  label: string;
  /** Format identifier. */
  format: BatchExportFormat;
  /** Async function that performs the export and returns the output. */
  run: () => Promise<ExportOutput>;
}

/** The output produced by a successful export task. */
export interface ExportOutput {
  /** Content as a string or Blob. */
  content: string | Blob;
  /** Suggested download filename (e.g. 'kitchen-gcode-sheet1.nc'). */
  filename: string;
  /** MIME type of the content. */
  mimeType: string;
}

/** Result for one export task in a batch. */
export type ExportTaskResult =
  | {
      id: string;
      label: string;
      format: BatchExportFormat;
      status: 'success';
      output: ExportOutput;
      durationMs: number;
    }
  | { id: string; label: string; format: BatchExportFormat; status: 'error'; error: string; durationMs: number };

/** Summary of a completed batch export. */
export interface BatchExportResult {
  /** ISO timestamp of when the batch started. */
  startedAt: string;
  /** Total wall-clock duration in milliseconds. */
  totalDurationMs: number;
  /** Per-task results. */
  results: ExportTaskResult[];
  /** Convenience: tasks that succeeded. */
  succeeded: ExportTaskResult[];
  /** Convenience: tasks that failed. */
  failed: ExportTaskResult[];
}

// ── Core ──────────────────────────────────────────────────────────────────────

/**
 * Run all export tasks concurrently and return a summary.
 *
 * Tasks are executed in parallel using `Promise.allSettled`.
 * Individual failures do not abort other tasks.
 *
 * @param tasks  Export tasks to run.
 * @param onProgress  Optional callback invoked as each task completes.
 */
export async function batchExport(
  tasks: ExportTask[],
  onProgress?: (result: ExportTaskResult, completedCount: number, totalCount: number) => void,
): Promise<BatchExportResult> {
  const startedAt = new Date().toISOString();
  const wallStart = Date.now();
  let completedCount = 0;

  const settled = await Promise.allSettled(
    tasks.map(async (task) => {
      const taskStart = Date.now();
      try {
        const output = await task.run();
        const result: ExportTaskResult = {
          id: task.id,
          label: task.label,
          format: task.format,
          status: 'success',
          output,
          durationMs: Date.now() - taskStart,
        };
        completedCount++;
        onProgress?.(result, completedCount, tasks.length);
        return result;
      } catch (e: unknown) {
        const result: ExportTaskResult = {
          id: task.id,
          label: task.label,
          format: task.format,
          status: 'error',
          error: e instanceof Error ? e.message : String(e),
          durationMs: Date.now() - taskStart,
        };
        completedCount++;
        onProgress?.(result, completedCount, tasks.length);
        return result;
      }
    }),
  );

  const results: ExportTaskResult[] = settled.map((s) => {
    // Promise.allSettled won't reject because we catch inside the task wrapper
    if (s.status === 'fulfilled') return s.value;
    // Should never happen, but satisfy the type checker
    const unknown: ExportTaskResult = {
      id: 'unknown',
      label: 'unknown',
      format: 'unknown',
      status: 'error',
      error: 'Unexpected task rejection',
      durationMs: 0,
    };
    return unknown;
  });

  const succeeded = results.filter((r): r is ExportTaskResult & { status: 'success' } => r.status === 'success');
  const failed = results.filter((r): r is ExportTaskResult & { status: 'error' } => r.status === 'error');

  return {
    startedAt,
    totalDurationMs: Date.now() - wallStart,
    results,
    succeeded,
    failed,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a simple string-output export task adapter.
 */
export function makeStringExportTask(
  id: string,
  label: string,
  format: BatchExportFormat,
  fn: () => Promise<{ content: string; filename: string; mimeType: string }>,
): ExportTask {
  return {
    id,
    label,
    format,
    run: fn,
  };
}

/**
 * Return a subset of tasks matching the given formats.
 */
export function filterTasksByFormat(tasks: ExportTask[], formats: BatchExportFormat[]): ExportTask[] {
  const set = new Set(formats);
  return tasks.filter((t) => set.has(t.format));
}
