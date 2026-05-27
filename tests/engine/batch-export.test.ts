import { describe, it, expect } from 'vitest';
import {
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
} from '../../src/engine/batch-export';
import type { ExportItemConfig } from '../../src/engine/batch-export';

let idCounter = 0;
function testIdGen(): string {
  return `batch-${++idCounter}`;
}

function makeItem(overrides: Partial<ExportItemConfig> = {}): ExportItemConfig {
  return {
    id: `item-${++idCounter}`,
    projectId: 'proj-1',
    projectName: 'Kitchen Base',
    format: 'pdf',
    priority: 'normal',
    options: {},
    ...overrides,
  };
}

describe('batch-export', () => {
  describe('createBatchJob', () => {
    it('creates a valid batch job with sorted items', () => {
      const items = [makeItem({ priority: 'low' }), makeItem({ priority: 'high' }), makeItem({ priority: 'normal' })];
      const job = createBatchJob('Test Batch', items, testIdGen);

      expect(job.name).toBe('Test Batch');
      expect(job.status).toBe('idle');
      expect(job.items[0].priority).toBe('high');
      expect(job.items[1].priority).toBe('normal');
      expect(job.items[2].priority).toBe('low');
      expect(job.results).toHaveLength(0);
      expect(job.currentIndex).toBe(-1);
    });

    it('throws on empty name', () => {
      expect(() => createBatchJob('', [makeItem()], testIdGen)).toThrow('name must not be empty');
    });

    it('throws on empty items', () => {
      expect(() => createBatchJob('Batch', [], testIdGen)).toThrow('at least one item');
    });

    it('throws on too many items', () => {
      const items = Array.from({ length: MAX_BATCH_ITEMS + 1 }, () => makeItem());
      expect(() => createBatchJob('Big', items, testIdGen)).toThrow(`exceed maximum`);
    });
  });

  describe('startNextItem', () => {
    it('advances to the first item', () => {
      const job = createBatchJob('B', [makeItem()], testIdGen);
      const next = startNextItem(job);
      expect(next).not.toBeNull();
      expect(next!.currentIndex).toBe(0);
      expect(next!.status).toBe('running');
    });

    it('returns null when all items processed', () => {
      const job = createBatchJob('B', [makeItem()], testIdGen);
      const started = startNextItem(job)!;
      const completed = recordSuccess(started, started.items[0].id, 'out.pdf', 1024, 100);
      const next = startNextItem(completed);
      expect(next).toBeNull();
    });

    it('returns null for cancelled batch', () => {
      const job = createBatchJob('B', [makeItem(), makeItem()], testIdGen);
      const cancelled = cancelBatch(job);
      expect(startNextItem(cancelled)).toBeNull();
    });
  });

  describe('recordSuccess', () => {
    it('adds a completed result', () => {
      const job = createBatchJob('B', [makeItem()], testIdGen);
      const started = startNextItem(job)!;
      const updated = recordSuccess(started, started.items[0].id, 'output.pdf', 2048, 150);

      expect(updated.results).toHaveLength(1);
      expect(updated.results[0].status).toBe('completed');
      expect(updated.results[0].fileName).toBe('output.pdf');
      expect(updated.results[0].sizeBytes).toBe(2048);
      expect(updated.status).toBe('completed');
    });
  });

  describe('recordFailure', () => {
    it('adds a failed result', () => {
      const items = [makeItem(), makeItem()];
      const job = createBatchJob('B', items, testIdGen);
      const started = startNextItem(job)!;
      const updated = recordFailure(started, started.items[0].id, 'Render error', 50);

      expect(updated.results).toHaveLength(1);
      expect(updated.results[0].status).toBe('failed');
      expect(updated.results[0].error).toBe('Render error');
      expect(updated.status).toBe('running'); // still has pending items
    });

    it('marks batch as partial when all done with some failures', () => {
      const items = [makeItem(), makeItem()];
      const job = createBatchJob('B', items, testIdGen);
      let current = startNextItem(job)!;
      current = recordSuccess(current, current.items[0].id, 'a.pdf', 100, 10);
      current = recordFailure(current, current.items[1].id, 'Error', 5);

      expect(current.status).toBe('partial');
    });
  });

  describe('cancelBatch', () => {
    it('marks remaining items as cancelled', () => {
      const items = [makeItem(), makeItem(), makeItem()];
      const job = createBatchJob('B', items, testIdGen);
      const started = startNextItem(job)!;
      const withResult = recordSuccess(started, started.items[0].id, 'a.pdf', 100, 10);
      const cancelled = cancelBatch(withResult);

      expect(cancelled.status).toBe('cancelled');
      expect(cancelled.results).toHaveLength(3);
      expect(cancelled.results.filter((r) => r.status === 'cancelled')).toHaveLength(2);
    });

    it('is idempotent on already-completed batch', () => {
      const job = createBatchJob('B', [makeItem()], testIdGen);
      const started = startNextItem(job)!;
      const done = recordSuccess(started, started.items[0].id, 'a.pdf', 100, 10);
      const cancelled = cancelBatch(done);
      expect(cancelled.status).toBe('completed'); // unchanged
    });
  });

  describe('getBatchProgress', () => {
    it('computes correct progress', () => {
      const items = [makeItem(), makeItem(), makeItem(), makeItem()];
      const job = createBatchJob('B', items, testIdGen);
      let current = startNextItem(job)!;
      current = recordSuccess(current, current.items[0].id, 'a.pdf', 100, 200);
      current = recordFailure(current, current.items[1].id, 'Error', 50);

      const progress = getBatchProgress(current);
      expect(progress.total).toBe(4);
      expect(progress.completed).toBe(1);
      expect(progress.failed).toBe(1);
      expect(progress.pending).toBe(2);
      expect(progress.percentage).toBe(50);
      expect(progress.estimatedRemainingMs).toBe(400); // avg 200ms * 2 pending
    });

    it('returns null estimated time with no completions', () => {
      const job = createBatchJob('B', [makeItem()], testIdGen);
      const progress = getBatchProgress(job);
      expect(progress.estimatedRemainingMs).toBeNull();
    });
  });

  describe('generateManifest', () => {
    it('generates manifest from completed batch', () => {
      const items = [makeItem(), makeItem()];
      const job = createBatchJob('B', items, testIdGen);
      let current = startNextItem(job)!;
      current = recordSuccess(current, current.items[0].id, 'a.pdf', 1024, 100);
      current = recordSuccess(current, current.items[1].id, 'b.pdf', 2048, 200);

      const manifest = generateManifest(current);
      expect(manifest.totalItems).toBe(2);
      expect(manifest.successCount).toBe(2);
      expect(manifest.failCount).toBe(0);
      expect(manifest.totalSizeBytes).toBe(3072);
      expect(manifest.totalDurationMs).toBe(300);
    });

    it('throws on running batch', () => {
      const job = createBatchJob('B', [makeItem()], testIdGen);
      expect(() => generateManifest(job)).toThrow('not yet complete');
    });
  });

  describe('getItemsByFormat', () => {
    it('filters items by format', () => {
      const items = [
        makeItem({ format: 'pdf' }),
        makeItem({ format: 'dxf' }),
        makeItem({ format: 'pdf' }),
        makeItem({ format: 'gcode' }),
      ];
      const job = createBatchJob('B', items, testIdGen);
      expect(getItemsByFormat(job, 'pdf')).toHaveLength(2);
      expect(getItemsByFormat(job, 'dxf')).toHaveLength(1);
      expect(getItemsByFormat(job, 'bom-csv')).toHaveLength(0);
    });
  });

  describe('generateFileName', () => {
    it.each([
      { name: 'Kitchen Base', format: 'pdf' as const, expected: 'kitchen-base.pdf' },
      { name: 'Wall Cabinet #3', format: 'dxf' as const, expected: 'wall-cabinet-3.dxf' },
      { name: '  Tall Unit  ', format: 'gcode' as const, expected: 'tall-unit.nc' },
      { name: 'My Project', format: 'bom-csv' as const, expected: 'my-project.csv' },
      { name: 'Export (v2)', format: 'bom-json' as const, expected: 'export-v2.json' },
    ])('generates "$expected" for "$name" as $format', ({ name, format, expected }) => {
      expect(generateFileName(name, format)).toBe(expected);
    });
  });
});
