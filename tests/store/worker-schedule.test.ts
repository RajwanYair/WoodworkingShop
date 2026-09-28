import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Comlink from 'comlink';
import { generateAssemblySteps } from '../../src/engine/assembly';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import { generateParts } from '../../src/engine/parts';
import type { Part } from '../../src/engine/types';
import { useCabinetStore } from '../../src/store/cabinet-store';
import {
  applyLocks,
  initWorkerSchedule,
  scheduleAssembly,
  scheduleCostFromState,
  scheduleOptimization,
  setRotationLocks,
} from '../../src/store/worker-schedule';
import type { CabinetState } from '../../src/store/cabinet-store';

vi.mock('comlink', async (importOriginal) => {
  const actual = await importOriginal<typeof import('comlink')>();
  return { ...actual, wrap: vi.fn(actual.wrap) };
});

describe('worker schedule fallbacks', () => {
  let patches: Array<Partial<CabinetState>>;

  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    patches = [];
    vi.stubGlobal('Worker', undefined);
    initWorkerSchedule(
      (patch) => patches.push(patch),
      () => useCabinetStore.getState(),
    );
  });

  it('decorates only locked parts and preserves the original array when no lock matches', () => {
    const parts: Part[] = generateParts(DEFAULT_CONFIG);
    const firstPart = parts[0];
    expect(firstPart).toBeDefined();
    if (!firstPart) return;

    expect(applyLocks(parts)).toBe(parts);

    setRotationLocks({ [firstPart.id]: true });
    const lockedParts = applyLocks(parts);
    expect(lockedParts).not.toBe(parts);
    expect(lockedParts.find((part) => part.id === firstPart.id)).toMatchObject({ rotationLocked: true });
    expect(parts.find((part) => part.id === firstPart.id)).not.toHaveProperty('rotationLocked');
  });

  it('computes assembly steps synchronously when workers are unavailable', () => {
    scheduleAssembly(DEFAULT_CONFIG);

    expect(patches).toHaveLength(1);
    expect(patches[0]?.assemblyPending).toBe(false);
    expect(patches[0]?.assemblySteps).toBeInstanceOf(Array);
    expect(patches[0]?.assemblySteps?.length).toBeGreaterThan(0);
  });

  it('clears pending state on failure, timeout, and abort, then recovers', async () => {
    const terminate = vi.fn();
    vi.stubGlobal(
      'Worker',
      class WorkerStub {
        terminate = terminate;
      },
    );
    const run = vi.fn().mockRejectedValue(new Error('Worker failed'));
    vi.mocked(Comlink.wrap).mockReturnValue({ run } as never);

    scheduleAssembly(DEFAULT_CONFIG);
    await vi.waitFor(() => expect(patches).toContainEqual({ assemblyPending: false }));
    expect(run).toHaveBeenCalledOnce();

    let rejectStale: (reason: Error) => void = () => {};
    const staleRun = new Promise<{ steps: ReturnType<typeof generateAssemblySteps> }>((_, reject) => {
      rejectStale = reject;
    });
    run.mockReturnValueOnce(staleRun).mockResolvedValueOnce({ steps: [] });
    patches = [];
    scheduleAssembly(DEFAULT_CONFIG);
    scheduleAssembly(DEFAULT_CONFIG);
    rejectStale(new Error('Stale worker failed'));

    await vi.waitFor(() => expect(patches).toHaveLength(1));
    expect(patches).toEqual([{ assemblySteps: [], assemblyPending: false }]);

    let resolveBeforeAbort: (result: { steps: ReturnType<typeof generateAssemblySteps> }) => void = () => {};
    const beforeAbort = new Promise<{ steps: ReturnType<typeof generateAssemblySteps> }>((resolve) => {
      resolveBeforeAbort = resolve;
    });
    run.mockReturnValueOnce(beforeAbort);
    patches = [];
    scheduleAssembly(DEFAULT_CONFIG);
    const aborted = new AbortController();
    aborted.abort();
    scheduleAssembly(DEFAULT_CONFIG, aborted.signal);
    resolveBeforeAbort({ steps: [] });
    await Promise.resolve();
    await Promise.resolve();
    expect(patches).toEqual([{ assemblyPending: false }]);

    vi.useFakeTimers();
    const pendingRequest = new Promise<{ steps: ReturnType<typeof generateAssemblySteps> }>(() => {});
    run.mockReturnValueOnce(pendingRequest);
    patches = [];
    scheduleAssembly(DEFAULT_CONFIG);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(terminate).toHaveBeenCalledOnce();
    expect(patches).toEqual([{ assemblyPending: false }]);

    const controller = new AbortController();
    run.mockReturnValueOnce(pendingRequest);
    patches = [];
    scheduleAssembly(DEFAULT_CONFIG, controller.signal);
    controller.abort();
    await vi.advanceTimersByTimeAsync(0);
    expect(terminate).toHaveBeenCalledTimes(2);
    expect(patches).toEqual([{ assemblyPending: false }]);

    const alreadyAborted = new AbortController();
    alreadyAborted.abort();
    patches = [];
    scheduleAssembly(DEFAULT_CONFIG, alreadyAborted.signal);
    expect(terminate).toHaveBeenCalledTimes(2);
    expect(patches).toEqual([{ assemblyPending: false }]);

    run.mockResolvedValueOnce({ steps: [] });
    patches = [];
    scheduleAssembly(DEFAULT_CONFIG);
    await vi.advanceTimersByTimeAsync(0);
    expect(patches).toEqual([{ assemblySteps: [], assemblyPending: false }]);
  });

  it('clears pending state for optimization and cost requests that are already aborted', () => {
    const controller = new AbortController();
    controller.abort();
    scheduleOptimization([], [], 0, {}, controller.signal);
    scheduleCostFromState(useCabinetStore.getState(), undefined, undefined, undefined, undefined, controller.signal);

    expect(patches).toEqual([{ optimizationPending: false }, { costPending: false }]);
  });

  it('terminates optimization and cost workers when their active requests are aborted', () => {
    const terminate = vi.fn();
    vi.stubGlobal(
      'Worker',
      class WorkerStub {
        terminate = terminate;
      },
    );
    const run = vi.fn(() => new Promise<never>(() => {}));
    vi.mocked(Comlink.wrap).mockReturnValue({ run } as never);
    const optimizationController = new AbortController();
    const costController = new AbortController();

    scheduleOptimization([], [], 0, {}, optimizationController.signal);
    optimizationController.abort();
    scheduleCostFromState(
      useCabinetStore.getState(),
      undefined,
      undefined,
      undefined,
      undefined,
      costController.signal,
    );
    costController.abort();

    expect(terminate).toHaveBeenCalledTimes(2);
    expect(patches).toEqual([{ optimizationPending: false }, { costPending: false }]);
  });
});
