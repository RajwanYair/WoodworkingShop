/**
 * Batch Export — Sprint 19
 *
 * Tests for src/utils/batch-export.ts
 */
import { describe, it, expect, vi } from 'vitest';
import {
  batchExport,
  makeStringExportTask,
  filterTasksByFormat,
} from '../../src/utils/batch-export';
import type { ExportTask, ExportTaskResult } from '../../src/utils/batch-export';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSuccessTask(id: string, format = 'gcode', delayMs = 0): ExportTask {
  return {
    id,
    label: `Label ${id}`,
    format,
    run: async () => {
      if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
      return { content: `output-${id}`, filename: `${id}.txt`, mimeType: 'text/plain' };
    },
  };
}

function makeFailTask(id: string, message = 'Export failed'): ExportTask {
  return {
    id,
    label: `Label ${id}`,
    format: 'gcode',
    run: async () => { throw new Error(message); },
  };
}

// ── batchExport ───────────────────────────────────────────────────────────────

describe('batchExport', () => {
  it('returns empty result for zero tasks', async () => {
    const result = await batchExport([]);
    expect(result.results).toHaveLength(0);
    expect(result.succeeded).toHaveLength(0);
    expect(result.failed).toHaveLength(0);
  });

  it('runs a single successful task', async () => {
    const result = await batchExport([makeSuccessTask('t1')]);
    expect(result.succeeded).toHaveLength(1);
    expect(result.failed).toHaveLength(0);
    const task = result.succeeded[0] as ExportTaskResult & { status: 'success' };
    expect(task.status).toBe('success');
    expect((task.output.content as string)).toBe('output-t1');
    expect(task.output.filename).toBe('t1.txt');
  });

  it('captures error for failing task', async () => {
    const result = await batchExport([makeFailTask('bad', 'CNC error')]);
    expect(result.failed).toHaveLength(1);
    const task = result.failed[0] as ExportTaskResult & { status: 'error' };
    expect(task.status).toBe('error');
    expect(task.error).toContain('CNC error');
  });

  it('continues other tasks when one fails', async () => {
    const result = await batchExport([
      makeSuccessTask('ok1'),
      makeFailTask('bad'),
      makeSuccessTask('ok2'),
    ]);
    expect(result.succeeded).toHaveLength(2);
    expect(result.failed).toHaveLength(1);
  });

  it('sets startedAt to a valid ISO timestamp', async () => {
    const result = await batchExport([makeSuccessTask('t')]);
    expect(() => new Date(result.startedAt).toISOString()).not.toThrow();
  });

  it('records durationMs for each task', async () => {
    const result = await batchExport([makeSuccessTask('t')]);
    expect(result.results[0].durationMs).toBeGreaterThanOrEqual(0);
  });

  it('totalDurationMs is non-negative', async () => {
    const result = await batchExport([makeSuccessTask('t')]);
    expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('runs tasks in parallel (total time ~ max single task)', async () => {
    const start = Date.now();
    await batchExport([
      makeSuccessTask('a', 'gcode', 20),
      makeSuccessTask('b', 'gcode', 20),
      makeSuccessTask('c', 'gcode', 20),
    ]);
    const elapsed = Date.now() - start;
    // Parallel: should finish in roughly 20ms, not 60ms
    expect(elapsed).toBeLessThan(200);
  });

  it('invokes onProgress for each task', async () => {
    const progress: number[] = [];
    await batchExport(
      [makeSuccessTask('a'), makeSuccessTask('b'), makeSuccessTask('c')],
      (_, completed, total) => { progress.push(completed / total); },
    );
    expect(progress).toHaveLength(3);
    expect(progress[progress.length - 1]).toBe(1);
  });

  it('onProgress receives correct completedCount', async () => {
    const counts: number[] = [];
    await batchExport(
      [makeSuccessTask('a'), makeSuccessTask('b')],
      (_, completed) => { counts.push(completed); },
    );
    expect(counts.sort((a, b) => a - b)).toEqual([1, 2]);
  });

  it('preserves task id and label in result', async () => {
    const task = { id: 'custom-id', label: 'My Label', format: 'dxf', run: async () => ({ content: '', filename: 'f.dxf', mimeType: 'application/dxf' }) };
    const result = await batchExport([task]);
    expect(result.results[0].id).toBe('custom-id');
    expect(result.results[0].label).toBe('My Label');
  });

  it('non-Error thrown value is stringified in error message', async () => {
    const task: ExportTask = {
      id: 'str-throw',
      label: 'String throw',
      format: 'bom-csv',
      run: async () => { throw 'raw string error'; },
    };
    const result = await batchExport([task]);
    const failed = result.failed[0] as ExportTaskResult & { status: 'error' };
    expect(failed.error).toContain('raw string error');
  });
});

// ── makeStringExportTask ──────────────────────────────────────────────────────

describe('makeStringExportTask', () => {
  it('creates a valid task', async () => {
    const fn = vi.fn().mockResolvedValue({ content: 'data', filename: 'out.csv', mimeType: 'text/csv' });
    const task = makeStringExportTask('t', 'Label', 'bom-csv', fn);
    const output = await task.run();
    expect(task.id).toBe('t');
    expect(task.format).toBe('bom-csv');
    expect(output.content).toBe('data');
  });
});

// ── filterTasksByFormat ───────────────────────────────────────────────────────

describe('filterTasksByFormat', () => {
  const tasks = [
    makeSuccessTask('a', 'gcode'),
    makeSuccessTask('b', 'dxf'),
    makeSuccessTask('c', 'bom-csv'),
    makeSuccessTask('d', 'ifc'),
  ];

  it('returns only tasks matching formats', () => {
    const filtered = filterTasksByFormat(tasks, ['gcode', 'ifc']);
    expect(filtered.map((t) => t.format)).toEqual(['gcode', 'ifc']);
  });

  it('returns empty when no match', () => {
    expect(filterTasksByFormat(tasks, ['pdf'])).toHaveLength(0);
  });

  it('returns all tasks when all formats listed', () => {
    expect(filterTasksByFormat(tasks, ['gcode', 'dxf', 'bom-csv', 'ifc'])).toHaveLength(4);
  });
});
