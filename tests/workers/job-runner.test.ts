import { afterEach, describe, expect, it, vi } from 'vitest';
import * as Comlink from 'comlink';
import {
  MAX_POOL_SIZE,
  readPooledWorker,
  resetWorkerPoolForTests,
  runPackedTextJob,
  runPooledJob,
  type WorkerJobHooks,
} from '../../src/workers/job-runner';
import { packText } from '../../src/workers/text-payload';

vi.mock('comlink', async (importOriginal) => {
  const actual = await importOriginal<typeof import('comlink')>();
  return { ...actual, wrap: vi.fn(actual.wrap) };
});

class FakeWorker {
  terminate = vi.fn();
}

function asWorkerFactory(worker: FakeWorker = new FakeWorker()): () => Worker {
  return () => worker as unknown as Worker;
}

function hooks(overrides: Partial<WorkerJobHooks> = {}): WorkerJobHooks {
  return {
    isLatest: () => true,
    onTimeout: () => {},
    onAbort: () => {},
    ...overrides,
  };
}

describe('typed worker pool', () => {
  afterEach(() => {
    resetWorkerPoolForTests();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('rejects an unsupported input schema before creating a worker', async () => {
    const createWorker = vi.fn(asWorkerFactory());

    await expect(runPooledJob('schema', 'job', { ok: true }, undefined, hooks(), createWorker, 2)).rejects.toThrow(
      /schema 2/,
    );
    expect(createWorker).not.toHaveBeenCalled();
  });

  it('reports progress and calls run with one argument', async () => {
    vi.stubGlobal('Worker', FakeWorker);
    const run = vi.fn().mockResolvedValue({ activeResult: 1 });
    vi.mocked(Comlink.wrap).mockReturnValue({ run } as never);
    const progress: Array<{ completed: number }> = [];

    const result = await runPooledJob(
      'cut',
      'job-1',
      { parts: 2 },
      undefined,
      hooks({ onProgress: (event) => progress.push(event) }),
      asWorkerFactory(),
    );

    expect(result).toEqual({ activeResult: 1 });
    expect(run).toHaveBeenCalledOnce();
    expect(run).toHaveBeenCalledWith({ parts: 2 });
    expect(progress).toEqual([
      { jobId: 'job-1', completed: 0, total: 1 },
      { jobId: 'job-1', completed: 1, total: 1 },
    ]);
    expect(readPooledWorker('cut')).toEqual({ alive: true, lastError: null });
  });

  it('terminates the oldest slot when the pool is full', async () => {
    vi.stubGlobal('Worker', FakeWorker);
    vi.mocked(Comlink.wrap).mockReturnValue({ run: vi.fn().mockResolvedValue('ok') } as never);
    const workers = Array.from({ length: MAX_POOL_SIZE + 1 }, () => new FakeWorker());

    for (const [index, worker] of workers.entries()) {
      await runPooledJob(`kind-${index}`, `job-${index}`, index, undefined, hooks(), asWorkerFactory(worker));
    }

    expect(workers[0]?.terminate).toHaveBeenCalledOnce();
    expect(readPooledWorker('kind-0').alive).toBe(false);
    expect(readPooledWorker(`kind-${MAX_POOL_SIZE}`).alive).toBe(true);
  });

  it('times out, records the error, and releases the worker', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('Worker', FakeWorker);
    const worker = new FakeWorker();
    vi.mocked(Comlink.wrap).mockReturnValue({ run: () => new Promise(() => {}) } as never);
    const onTimeout = vi.fn();
    const pending = runPooledJob('cost', 'job', {}, undefined, hooks({ onTimeout }), asWorkerFactory(worker));
    const timedOut = expect(pending).rejects.toThrow(/timed out/);

    await vi.advanceTimersByTimeAsync(30_000);
    await timedOut;
    expect(onTimeout).toHaveBeenCalledOnce();
    expect(readPooledWorker('cost').lastError).toMatch(/timed out/);
  });

  it('returns null for packed text when Worker is unavailable', async () => {
    vi.stubGlobal('Worker', undefined);

    await expect(runPackedTextJob('bom', 'bom', { cabinets: [] }, undefined, asWorkerFactory())).resolves.toBeNull();
  });

  it('unpacks a transferable text result and ignores a late resolution after timeout', async () => {
    vi.stubGlobal('Worker', FakeWorker);
    const packed = packText('csv-body', undefined, 'out.csv');
    const run = vi.fn().mockResolvedValue(packed);
    vi.mocked(Comlink.wrap).mockReturnValue({ run } as never);

    await expect(runPackedTextJob('bom', 'bom', { cabinets: [] }, undefined, asWorkerFactory())).resolves.toEqual({
      text: 'csv-body',
      filename: 'out.csv',
    });
    expect(run.mock.calls[0]).toHaveLength(2);

    vi.useFakeTimers();
    let resolveLate: (value: typeof packed) => void = () => {};
    run.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveLate = resolve;
      }),
    );
    const worker = new FakeWorker();
    const pending = runPackedTextJob('dxf', 'late', { cabinets: [] }, undefined, asWorkerFactory(worker));
    const timedOut = expect(pending).rejects.toThrow(/timed out/);
    await vi.advanceTimersByTimeAsync(30_000);
    resolveLate(packText('late', undefined));
    await timedOut;
    expect(worker.terminate).toHaveBeenCalled();
  });
});
