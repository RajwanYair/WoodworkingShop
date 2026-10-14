/**
 * Phase 12 / Sprint 8 — Engine assembly sub-module barrel.
 * Covers: assembly step generation, snapshot diffing, JSON memoisation.
 *
 * @example
 * ```ts
 * import { generateAssemblySteps, diffSnapshots } from '../engine/assembly';
 * ```
 */
export { generateAssemblySteps, buildAssemblyDAG } from './assembly.ts';
export type { AssemblyStep } from './assembly.ts';

export { diffSnapshots } from '../project/comparison/index';
export type { FieldDelta, CabinetDiff, SnapshotDiff, SnapshotLike } from '../project/comparison/index';

export { createJsonMemo } from '../core/contracts/index.ts';

export type { RawStep } from './assembly.ts';

export { estimateStepTime, estimateAssemblyTime, getActionRate } from './assembly-timer';

export type { AssemblyActionType, TimerStep, TimedStep, AssemblyTimeEstimate } from './assembly-timer';

export { resolveAssemblyDeps, hasCycle, maxParallelism } from './assembly-dependency';

export type {
  StepId,
  AssemblyStep as DependencyAssemblyStep,
  ScheduledStep,
  DependencyResult,
} from './assembly-dependency';
