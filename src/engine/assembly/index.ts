/**
 * Phase 12 / Sprint 8 — Engine assembly sub-module barrel.
 * Covers: assembly step generation, snapshot diffing, JSON memoisation.
 *
 * @example
 * ```ts
 * import { generateAssemblySteps, diffSnapshots } from '../engine/assembly';
 * ```
 */
export { generateAssemblySteps, buildAssemblyDAG } from '../assembly.ts';
export type { AssemblyStep } from '../assembly.ts';

export { diffSnapshots } from '../comparison';
export type { FieldDelta, CabinetDiff, SnapshotDiff, SnapshotLike } from '../comparison';

export { createJsonMemo } from '../memo.ts';
