/**
 * Assembly Dependency Resolver — Sprint 174
 *
 * Topological sort of assembly steps with parallel-task detection,
 * critical-path calculation, and cycle detection.
 */

/** Unique identifier for an assembly step. */
export type StepId = string;

/** A single assembly step with its dependencies. */
export interface AssemblyStep {
  /** Unique step identifier. */
  readonly id: StepId;
  /** Human-readable step label. */
  readonly label: string;
  /** IDs of steps that must complete before this one can start. */
  readonly dependsOn: readonly StepId[];
  /** Estimated duration in minutes. */
  readonly duration: number;
}

/** Scheduling info for one step after resolution. */
export interface ScheduledStep {
  /** The original step definition. */
  readonly step: AssemblyStep;
  /** Earliest start time (minutes from project start). */
  readonly earliestStart: number;
  /** Earliest finish time (earliestStart + duration). */
  readonly earliestFinish: number;
  /** Latest start time without delaying the project. */
  readonly latestStart: number;
  /** Latest finish time without delaying the project. */
  readonly latestFinish: number;
  /** Float/slack (latestStart - earliestStart). */
  readonly slack: number;
  /** Whether this step is on the critical path (slack === 0). */
  readonly isCritical: boolean;
}

/** Result of dependency resolution. */
export interface DependencyResult {
  /** Steps in topological order (safe execution sequence). */
  readonly sorted: readonly AssemblyStep[];
  /** Steps grouped by parallel execution level (wave). */
  readonly waves: readonly (readonly AssemblyStep[])[];
  /** Total project duration (critical path length in minutes). */
  readonly totalDuration: number;
  /** Critical path step IDs in order. */
  readonly criticalPath: readonly StepId[];
  /** Full scheduling details per step. */
  readonly schedule: readonly ScheduledStep[];
}

/**
 * Validates that all dependency references exist in the step list.
 * @param steps - Array of assembly steps
 * @throws RangeError if a step references a non-existent dependency
 */
function validateReferences(steps: readonly AssemblyStep[]): void {
  const ids = new Set(steps.map((s) => s.id));
  for (const step of steps) {
    for (const dep of step.dependsOn) {
      if (!ids.has(dep)) {
        throw new RangeError(`resolveAssemblyDeps: step "${step.id}" depends on unknown step "${dep}"`);
      }
    }
  }
}

/**
 * Detects cycles using Kahn's algorithm (BFS topological sort).
 * @param steps - Array of assembly steps
 * @returns Topologically sorted step IDs, or null if a cycle exists
 */
function kahnSort(steps: readonly AssemblyStep[]): StepId[] | null {
  const inDegree = new Map<StepId, number>();
  const adjacency = new Map<StepId, StepId[]>();

  for (const step of steps) {
    inDegree.set(step.id, 0);
    adjacency.set(step.id, []);
  }

  for (const step of steps) {
    for (const dep of step.dependsOn) {
      adjacency.get(dep)!.push(step.id);
      inDegree.set(step.id, inDegree.get(step.id)! + 1);
    }
  }

  const queue: StepId[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: StepId[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const neighbor of adjacency.get(current)!) {
      const newDeg = inDegree.get(neighbor)! - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  return sorted.length === steps.length ? sorted : null;
}

/**
 * Groups steps into parallel execution waves (levels).
 * Each wave contains steps whose dependencies are all satisfied by prior waves.
 * @param steps - Array of assembly steps
 * @param sortedIds - Topologically sorted step IDs
 * @returns Array of waves (each wave is an array of steps)
 */
function buildWaves(steps: readonly AssemblyStep[], sortedIds: readonly StepId[]): AssemblyStep[][] {
  const stepMap = new Map(steps.map((s) => [s.id, s]));
  const levelMap = new Map<StepId, number>();

  for (const id of sortedIds) {
    const step = stepMap.get(id)!;
    let maxDepLevel = -1;
    for (const dep of step.dependsOn) {
      const depLevel = levelMap.get(dep)!;
      if (depLevel > maxDepLevel) maxDepLevel = depLevel;
    }
    levelMap.set(id, maxDepLevel + 1);
  }

  const waves: AssemblyStep[][] = [];
  for (const id of sortedIds) {
    const level = levelMap.get(id)!;
    while (waves.length <= level) waves.push([]);
    waves[level].push(stepMap.get(id)!);
  }

  return waves;
}

/**
 * Computes forward/backward pass for critical-path scheduling.
 * @param steps - Array of assembly steps
 * @param sortedIds - Topologically sorted step IDs
 * @returns Scheduled steps with earliest/latest times and slack
 */
function computeSchedule(steps: readonly AssemblyStep[], sortedIds: readonly StepId[]): ScheduledStep[] {
  const stepMap = new Map(steps.map((s) => [s.id, s]));

  // Forward pass — earliest start/finish
  const es = new Map<StepId, number>();
  const ef = new Map<StepId, number>();

  for (const id of sortedIds) {
    const step = stepMap.get(id)!;
    let earliest = 0;
    for (const dep of step.dependsOn) {
      const depFinish = ef.get(dep)!;
      if (depFinish > earliest) earliest = depFinish;
    }
    es.set(id, earliest);
    ef.set(id, earliest + step.duration);
  }

  // Project duration
  let projectDuration = 0;
  for (const finish of ef.values()) {
    if (finish > projectDuration) projectDuration = finish;
  }

  // Backward pass — latest start/finish
  const lf = new Map<StepId, number>();
  const ls = new Map<StepId, number>();

  // Initialize all to project duration
  for (const id of sortedIds) {
    lf.set(id, projectDuration);
  }

  // Reverse order
  const reversed = [...sortedIds].reverse();
  // Build successor map
  const successors = new Map<StepId, StepId[]>();
  for (const step of steps) {
    successors.set(step.id, []);
  }
  for (const step of steps) {
    for (const dep of step.dependsOn) {
      successors.get(dep)!.push(step.id);
    }
  }

  for (const id of reversed) {
    const step = stepMap.get(id)!;
    const succs = successors.get(id)!;
    let latestFinish = projectDuration;
    for (const succ of succs) {
      const succStart = ls.get(succ)!;
      if (succStart < latestFinish) latestFinish = succStart;
    }
    lf.set(id, latestFinish);
    ls.set(id, latestFinish - step.duration);
  }

  // Build scheduled steps
  return sortedIds.map((id) => {
    const step = stepMap.get(id)!;
    const earliestStart = es.get(id)!;
    const earliestFinish = ef.get(id)!;
    const latestStart = ls.get(id)!;
    const latestFinish = lf.get(id)!;
    const slack = latestStart - earliestStart;
    return {
      step,
      earliestStart,
      earliestFinish,
      latestStart,
      latestFinish,
      slack,
      isCritical: slack === 0,
    };
  });
}

/**
 * Resolves assembly step dependencies, producing a topological order,
 * parallel execution waves, critical path, and full schedule.
 *
 * @param steps - Array of assembly steps with dependency declarations
 * @returns Full dependency resolution result
 * @throws RangeError if steps array is empty
 * @throws RangeError if a step references a non-existent dependency
 * @throws RangeError if a circular dependency is detected
 */
export function resolveAssemblyDeps(steps: readonly AssemblyStep[]): DependencyResult {
  if (steps.length === 0) {
    throw new RangeError('resolveAssemblyDeps: steps array must not be empty');
  }

  // Check for duplicate IDs
  const ids = new Set<StepId>();
  for (const step of steps) {
    if (ids.has(step.id)) {
      throw new RangeError(`resolveAssemblyDeps: duplicate step id "${step.id}"`);
    }
    ids.add(step.id);
  }

  validateReferences(steps);

  const sortedIds = kahnSort(steps);
  if (sortedIds === null) {
    throw new RangeError('resolveAssemblyDeps: circular dependency detected among steps');
  }

  const stepMap = new Map(steps.map((s) => [s.id, s]));
  const sorted = sortedIds.map((id) => stepMap.get(id)!);
  const waves = buildWaves(steps, sortedIds);
  const schedule = computeSchedule(steps, sortedIds);

  const totalDuration = schedule.reduce((max, s) => Math.max(max, s.earliestFinish), 0);

  const criticalPath = schedule.filter((s) => s.isCritical).map((s) => s.step.id);

  return { sorted, waves, totalDuration, criticalPath, schedule };
}

/**
 * Detects whether a set of steps contains a dependency cycle.
 *
 * @param steps - Array of assembly steps
 * @returns true if a cycle exists, false otherwise
 * @throws RangeError if steps array is empty
 */
export function hasCycle(steps: readonly AssemblyStep[]): boolean {
  if (steps.length === 0) {
    throw new RangeError('hasCycle: steps array must not be empty');
  }
  return kahnSort(steps) === null;
}

/**
 * Returns the maximum number of steps that can execute in parallel.
 *
 * @param steps - Array of assembly steps
 * @returns Maximum parallelism (size of the widest wave)
 * @throws RangeError if steps array is empty or contains a cycle
 */
export function maxParallelism(steps: readonly AssemblyStep[]): number {
  const result = resolveAssemblyDeps(steps);
  return result.waves.reduce((max, wave) => Math.max(max, wave.length), 0);
}
