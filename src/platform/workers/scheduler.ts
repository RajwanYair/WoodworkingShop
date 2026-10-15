/**
 * Scheduler worker factories. Store code imports this module, not worker files.
 * BOM and DXF stay in `src/workers/export-jobs.ts` so they remain in the lazy
 * optimizer chunk.
 */
import { readPooledWorker, releasePooledWorker, runPooledJob, type WorkerJobHooks } from '../../workers/job-runner';
import AssemblyWorker from '../../workers/assembly.worker?worker';
import CostEstimatorWorker from '../../workers/cost-estimator.worker?worker';
import CutOptimizerWorker from '../../workers/cut-optimizer.worker?worker';

export type SchedulerWorkerKind = 'cut' | 'cost' | 'assembly';

const FACTORIES: Record<SchedulerWorkerKind, () => Worker> = {
  cut: () => new CutOptimizerWorker(),
  cost: () => new CostEstimatorWorker(),
  assembly: () => new AssemblyWorker(),
};

export function getSchedulerWorkerHealth(): {
  cutOptimizer: boolean;
  costEstimator: boolean;
  assembly: boolean;
} {
  return {
    cutOptimizer: readPooledWorker('cut').alive,
    costEstimator: readPooledWorker('cost').alive,
    assembly: readPooledWorker('assembly').alive,
  };
}

export function terminateSchedulerWorker(kind: SchedulerWorkerKind): void {
  releasePooledWorker(kind);
}

export function runSchedulerWorker<I, O>(
  kind: SchedulerWorkerKind,
  id: string,
  input: I,
  signal: AbortSignal | undefined,
  hooks: WorkerJobHooks,
): Promise<O> | null {
  return runPooledJob(kind, id, input, signal, hooks, FACTORIES[kind]);
}
