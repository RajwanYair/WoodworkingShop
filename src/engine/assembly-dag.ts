/**
 * Assembly step DAG scheduler — Sprint 25
 *
 * Topological sort and wave-based parallel scheduling for `AssemblyStep[]`.
 * Works on any DAG built with the `id` / `dependencies` fields present on
 * `AssemblyStep` (populated by `buildAssemblyDAG`).
 *
 * All functions are pure (no side effects, no React, no IDB).
 */

import type { AssemblyStep } from './assembly';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * A wave is a group of steps whose dependencies all belong to previous waves.
 * Every step within a wave can be executed in parallel.
 */
export type ScheduleWave = AssemblyStep[];

export interface ScheduleResult {
  /** Ordered waves — execute wave[0], then wave[1], etc. */
  waves: ScheduleWave[];
  /** Total estimated duration assuming perfect parallelism (minutes). */
  totalMinutes: number;
  /** Ordered list of steps along the longest dependency chain by time. */
  criticalPath: AssemblyStep[];
}

export interface DAGValidationResult {
  valid: boolean;
  /** Step ids involved in a cycle (empty when valid). */
  cyclicIds: string[];
  /** Step ids whose declared dependencies reference unknown step ids. */
  missingDeps: string[];
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Build an adjacency map: stepId → Set<stepId> of direct successors. */
function buildSuccessors(steps: AssemblyStep[]): Map<string, Set<string>> {
  const succ = new Map<string, Set<string>>(steps.map((s) => [s.id, new Set()]));
  for (const step of steps) {
    for (const dep of step.dependencies ?? []) {
      succ.get(dep)?.add(step.id);
    }
  }
  return succ;
}

/** Build a map of in-degree counts: stepId → number of unresolved dependencies. */
function buildInDegrees(steps: AssemblyStep[]): Map<string, number> {
  return new Map(steps.map((s) => [s.id, (s.dependencies ?? []).filter((d) => steps.some((x) => x.id === d)).length]));
}

// ── Core API ──────────────────────────────────────────────────────────────────

/**
 * Validate a DAG for cycles and missing dependency references.
 *
 * @param steps  Steps to validate (must have `id` and optional `dependencies`).
 */
export function validateDAG(steps: AssemblyStep[]): DAGValidationResult {
  const ids = new Set(steps.map((s) => s.id));
  const missingDeps: string[] = [];

  for (const step of steps) {
    for (const dep of step.dependencies ?? []) {
      if (!ids.has(dep)) missingDeps.push(dep);
    }
  }

  // Cycle detection via Kahn's: if topological sort can't include all nodes → cycle
  const inDeg = buildInDegrees(steps);
  const succ = buildSuccessors(steps);
  const queue: string[] = [];
  for (const [id, deg] of inDeg) {
    if (deg === 0) queue.push(id);
  }
  let visited = 0;
  while (queue.length > 0) {
    const cur = queue.shift()!;
    visited++;
    for (const next of succ.get(cur) ?? []) {
      const newDeg = (inDeg.get(next) ?? 0) - 1;
      inDeg.set(next, newDeg);
      if (newDeg === 0) queue.push(next);
    }
  }

  const cyclicIds = visited < steps.length ? steps.filter((s) => (inDeg.get(s.id) ?? 0) > 0).map((s) => s.id) : [];

  return { valid: cyclicIds.length === 0 && missingDeps.length === 0, cyclicIds, missingDeps };
}

/**
 * Topological sort of `steps` using Kahn's algorithm (BFS-based).
 *
 * Steps with no dependencies come first. Steps at the same topological
 * depth are sorted by `stepNumber` for deterministic output.
 *
 * @throws {Error} When the graph contains a cycle.
 */
export function topologicalSort(steps: AssemblyStep[]): AssemblyStep[] {
  if (steps.length === 0) return [];

  const byId = new Map(steps.map((s) => [s.id, s]));
  const inDeg = buildInDegrees(steps);
  const succ = buildSuccessors(steps);

  // Sort by stepNumber so the order is deterministic when in-degrees are equal
  const queue: string[] = [...inDeg.entries()]
    .filter(([, d]) => d === 0)
    .map(([id]) => id)
    .sort((a, b) => (byId.get(a)?.stepNumber ?? 0) - (byId.get(b)?.stepNumber ?? 0));

  const result: AssemblyStep[] = [];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    const step = byId.get(cur);
    if (step) result.push(step);

    const nexts = [...(succ.get(cur) ?? [])].sort(
      (a, b) => (byId.get(a)?.stepNumber ?? 0) - (byId.get(b)?.stepNumber ?? 0),
    );

    for (const next of nexts) {
      const newDeg = (inDeg.get(next) ?? 0) - 1;
      inDeg.set(next, newDeg);
      if (newDeg === 0) queue.push(next);
    }
  }

  if (result.length !== steps.length) {
    throw new Error('Assembly step DAG contains a cycle — cannot topologically sort.');
  }

  return result;
}

/**
 * Group steps into parallel waves using a BFS level decomposition.
 *
 * All steps at wave 0 have no dependencies (or all their deps are outside the
 * provided set). Steps at wave N depend only on steps in waves 0…N-1.
 *
 * @param steps  Steps in any order — they will be sorted internally.
 * @returns      `ScheduleResult` with `waves`, `totalMinutes`, and `criticalPath`.
 */
export function scheduleWaves(steps: AssemblyStep[]): ScheduleResult {
  if (steps.length === 0) {
    return { waves: [], totalMinutes: 0, criticalPath: [] };
  }

  const sorted = topologicalSort(steps);
  const byId = new Map(sorted.map((s) => [s.id, s]));

  // Assign each step to the earliest wave that satisfies all dependencies
  const waveOf = new Map<string, number>();
  for (const step of sorted) {
    const maxDepWave = (step.dependencies ?? []).reduce((max, dep) => {
      return Math.max(max, (waveOf.get(dep) ?? -1) + 1);
    }, 0);
    waveOf.set(step.id, maxDepWave);
  }

  const maxWave = Math.max(...waveOf.values());
  const waves: ScheduleWave[] = Array.from({ length: maxWave + 1 }, () => []);
  for (const step of sorted) {
    waves[waveOf.get(step.id)!]!.push(step);
  }

  // Each wave's duration = max(estimatedMinutes) of its steps (parallel execution)
  const waveDurations = waves.map((w) => w.reduce((m, s) => Math.max(m, s.estimatedMinutes), 0));
  const totalMinutes = waveDurations.reduce((s, d) => s + d, 0);

  // Critical path: longest path by accumulated time (DP)
  const dp = new Map<string, number>(); // stepId → accumulated time to END of step
  const prev = new Map<string, string | null>(); // stepId → predecessor id on critical path

  for (const step of sorted) {
    const predTime = (step.dependencies ?? []).reduce((max, dep) => {
      return Math.max(max, dp.get(dep) ?? 0);
    }, 0);
    dp.set(step.id, predTime + step.estimatedMinutes);

    const bestDep = (step.dependencies ?? []).reduce(
      (best, dep) => ((dp.get(dep) ?? 0) > (dp.get(best ?? '') ?? 0) ? dep : best),
      null as string | null,
    );
    prev.set(step.id, bestDep);
  }

  // Find the step with the maximum accumulated time
  let endId = sorted[0]!.id;
  for (const [id, t] of dp) {
    if (t > (dp.get(endId) ?? 0)) endId = id;
  }

  // Trace back the critical path
  const pathIds: string[] = [];
  let cur: string | null = endId;
  while (cur !== null) {
    pathIds.unshift(cur);
    cur = prev.get(cur) ?? null;
  }
  const criticalPath = pathIds.map((id) => byId.get(id)!).filter(Boolean);

  return { waves, totalMinutes, criticalPath };
}

/**
 * Return only the steps that lie on the critical (longest) path.
 * Convenience wrapper around `scheduleWaves`.
 */
export function criticalPath(steps: AssemblyStep[]): AssemblyStep[] {
  return scheduleWaves(steps).criticalPath;
}

/**
 * Return all steps that are direct or transitive dependents of `stepId`.
 * Useful for highlighting "what gets blocked if this step is delayed".
 */
export function dependents(steps: AssemblyStep[], stepId: string): AssemblyStep[] {
  const succ = buildSuccessors(steps);
  const visited = new Set<string>();
  const queue = [stepId];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const next of succ.get(cur) ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }

  return steps.filter((s) => visited.has(s.id));
}
