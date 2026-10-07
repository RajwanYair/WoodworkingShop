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
    vi.stubGlobal(
      'Worker',
      class WorkerStub {
        terminate() {}
      },
    );
    vi.mocked(Comlink.wrap).mockReturnValue({ run: () => new Promise<never>(() => {}) } as never);
    const cleanup = new AbortController();
    scheduleOptimization([], [], 0, {}, cleanup.signal);
    scheduleCostFromState(useCabinetStore.getState(), undefined, undefined, undefined, undefined, cleanup.signal);
    scheduleAssembly(DEFAULT_CONFIG, cleanup.signal);
    cleanup.abort();
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

    let resolveStale: (result: { steps: ReturnType<typeof generateAssemblySteps> }) => void = () => {};
    const staleRun = new Promise<{ steps: ReturnType<typeof generateAssemblySteps> }>((resolve) => {
      resolveStale = resolve;
    });
    run.mockReturnValueOnce(staleRun).mockResolvedValueOnce({ steps: [] });
    patches = [];
    scheduleAssembly(DEFAULT_CONFIG);
    scheduleAssembly(DEFAULT_CONFIG);
    resolveStale({ steps: generateAssemblySteps(DEFAULT_CONFIG) });

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

  it('clears optimization and cost pending state after rejection and recovers on later requests', async () => {
    const terminate = vi.fn();
    vi.stubGlobal(
      'Worker',
      class WorkerStub {
        terminate = terminate;
      },
    );
    const state = useCabinetStore.getState();
    const run = vi
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockRejectedValueOnce(new Error('Cost worker failed'))
      .mockResolvedValueOnce({ cost: state.cost })
      .mockRejectedValueOnce(new Error('Cut optimizer failed'))
      .mockResolvedValueOnce({
        activeResult: state.optimization,
        combinedResult: state.combinedOptimization,
      })
      .mockResolvedValueOnce({ cost: state.cost });
    vi.mocked(Comlink.wrap).mockReturnValue({ run } as never);

    scheduleCostFromState(state);
    await vi.waitFor(() => expect(patches).toContainEqual({ costPending: false }));
    expect(run).toHaveBeenCalledOnce();

    patches = [];
    scheduleCostFromState(state);
    await vi.waitFor(() => expect(patches).toContainEqual({ cost: state.cost, costPending: false }));
    expect(run).toHaveBeenCalledTimes(2);

    patches = [];
    scheduleOptimization([], [], 0, {});
    await vi.waitFor(() => expect(patches).toContainEqual({ optimizationPending: false }));
    expect(run).toHaveBeenCalledTimes(3);
    expect(terminate).toHaveBeenCalledOnce();

    patches = [];
    scheduleOptimization([], [], 0, {});
    await vi.waitFor(() => expect(patches).toContainEqual({ cost: state.cost, costPending: false }));
    expect(patches).toContainEqual({
      optimization: state.optimization,
      combinedOptimization: state.combinedOptimization,
      optimizationPending: false,
      costPending: true,
    });
    expect(run).toHaveBeenCalledTimes(5);
  });

  it('terminates an in-flight optimization when a newer request supersedes it', () => {
    const terminate = vi.fn();
    vi.stubGlobal(
      'Worker',
      class WorkerStub {
        terminate = terminate;
      },
    );
    const run = vi.fn(() => new Promise<never>(() => {}));
    vi.mocked(Comlink.wrap).mockReturnValue({ run } as never);

    scheduleOptimization([], [], 0, {});
    scheduleOptimization([], [], 0, {});

    expect(terminate).toHaveBeenCalledOnce();
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('terminates in-flight optimization when the superseding request is already aborted', () => {
    const terminate = vi.fn();
    vi.stubGlobal(
      'Worker',
      class WorkerStub {
        terminate = terminate;
      },
    );
    const run = vi.fn(() => new Promise<never>(() => {}));
    vi.mocked(Comlink.wrap).mockReturnValue({ run } as never);
    const controller = new AbortController();

    scheduleOptimization([], [], 0, {});
    controller.abort();
    scheduleOptimization([], [], 0, {}, controller.signal);

    expect(terminate).toHaveBeenCalledOnce();
    expect(run).toHaveBeenCalledOnce();
    expect(patches.at(-1)).toEqual({ optimizationPending: false });
  });

  it('terminates timed-out optimization and cost workers and recovers on retry', async () => {
    vi.useFakeTimers();
    const terminate = vi.fn();
    vi.stubGlobal(
      'Worker',
      class WorkerStub {
        terminate = terminate;
      },
    );
    const state = useCabinetStore.getState();
    const pendingRequest = new Promise<unknown>(() => {});
    const run = vi.fn<(...args: unknown[]) => Promise<unknown>>(() => pendingRequest);
    vi.mocked(Comlink.wrap).mockReturnValue({ run } as never);

    scheduleCostFromState(state);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(terminate).toHaveBeenCalledOnce();
    expect(patches).toEqual([{ costPending: false }]);

    run.mockResolvedValueOnce({ cost: state.cost });
    patches = [];
    scheduleCostFromState(state);
    await vi.advanceTimersByTimeAsync(0);
    expect(patches).toEqual([{ cost: state.cost, costPending: false }]);

    run.mockReturnValueOnce(pendingRequest);
    patches = [];
    scheduleOptimization([], [], 0, {});
    await vi.advanceTimersByTimeAsync(30_000);
    expect(terminate).toHaveBeenCalledTimes(2);
    expect(patches).toEqual([{ optimizationPending: false }]);

    run
      .mockResolvedValueOnce({
        activeResult: state.optimization,
        combinedResult: state.combinedOptimization,
      })
      .mockResolvedValueOnce({ cost: state.cost });
    patches = [];
    scheduleOptimization([], [], 0, {});
    await vi.advanceTimersByTimeAsync(0);
    expect(patches).toContainEqual({
      optimization: state.optimization,
      combinedOptimization: state.combinedOptimization,
      optimizationPending: false,
      costPending: true,
    });
    expect(patches).toContainEqual({ cost: state.cost, costPending: false });
  });

  it('ignores stale optimization and cost replies after newer requests complete', async () => {
    vi.stubGlobal(
      'Worker',
      class WorkerStub {
        terminate() {}
      },
    );
    const state = useCabinetStore.getState();
    let resolveOldCost: (result: { cost: typeof state.cost }) => void = () => {};
    let resolveNewCost: (result: { cost: typeof state.cost }) => void = () => {};
    const oldCost = new Promise<{ cost: typeof state.cost }>((resolve) => {
      resolveOldCost = resolve;
    });
    const latestCost = { ...state.cost, totalCost: state.cost.totalCost + 1 };
    const newCost = new Promise<{ cost: typeof state.cost }>((resolve) => {
      resolveNewCost = resolve;
    });
    const run = vi
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockReturnValueOnce(oldCost)
      .mockReturnValueOnce(newCost);
    vi.mocked(Comlink.wrap).mockReturnValue({ run } as never);

    scheduleCostFromState(state);
    scheduleCostFromState(state);
    resolveNewCost({ cost: latestCost });
    await vi.waitFor(() => expect(patches).toEqual([{ cost: latestCost, costPending: false }]));
    resolveOldCost({ cost: state.cost });
    await Promise.resolve();
    expect(patches).toEqual([{ cost: latestCost, costPending: false }]);

    let resolveOldCut: (result: {
      activeResult: typeof state.optimization;
      combinedResult: typeof state.combinedOptimization;
    }) => void = () => {};
    let resolveNewCut: (result: {
      activeResult: typeof state.optimization;
      combinedResult: typeof state.combinedOptimization;
    }) => void = () => {};
    const oldCut = new Promise<{
      activeResult: typeof state.optimization;
      combinedResult: typeof state.combinedOptimization;
    }>((resolve) => {
      resolveOldCut = resolve;
    });
    const newCut = new Promise<{
      activeResult: typeof state.optimization;
      combinedResult: typeof state.combinedOptimization;
    }>((resolve) => {
      resolveNewCut = resolve;
    });
    run.mockReturnValueOnce(oldCut).mockReturnValueOnce(newCut).mockResolvedValueOnce({ cost: state.cost });
    patches = [];
    scheduleOptimization([], [], 0, {});
    scheduleOptimization([], [], 0, {});
    resolveNewCut({ activeResult: state.optimization, combinedResult: state.combinedOptimization });
    await vi.waitFor(() =>
      expect(patches).toContainEqual({
        optimization: state.optimization,
        combinedOptimization: state.combinedOptimization,
        optimizationPending: false,
        costPending: true,
      }),
    );
    resolveOldCut({ activeResult: state.optimization, combinedResult: state.combinedOptimization });
    await Promise.resolve();
    expect(patches.filter((patch) => 'optimization' in patch)).toHaveLength(1);
  });
});
