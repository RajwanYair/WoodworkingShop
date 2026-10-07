/**
 * Project Time Estimator — Sprint 180
 *
 * Estimate total build hours from part count and operations.
 * Supports operation-based time lookup, skill-level multipliers,
 * and parallel vs sequential task detection.
 */

/** Skill level affects estimated time via a multiplier. */
export type SkillLevel = 'beginner' | 'intermediate' | 'expert';

/** Operation types with base time in minutes per unit. */
export type OperationType = 'cutting' | 'edgeBanding' | 'drilling' | 'assembly' | 'sanding' | 'finishing' | 'hardware';

/** A single task in the project timeline. */
export interface ProjectTask {
  readonly id: string;
  readonly operation: OperationType;
  /** Number of parts/items for this task. */
  readonly quantity: number;
  /** Tasks that must complete before this one (IDs). */
  readonly dependsOn: readonly string[];
}

/** Time breakdown for a single task. */
export interface TaskEstimate {
  readonly taskId: string;
  readonly operation: OperationType;
  readonly baseMinutes: number;
  readonly adjustedMinutes: number;
  readonly isParallel: boolean;
}

/** Full project time estimation result. */
export interface TimeEstimationResult {
  readonly tasks: readonly TaskEstimate[];
  readonly totalMinutes: number;
  readonly totalHours: number;
  readonly criticalPathMinutes: number;
  readonly criticalPathHours: number;
  readonly parallelTasks: number;
  readonly sequentialTasks: number;
  readonly skillMultiplier: number;
}

/**
 * Base time in minutes per unit for each operation type.
 * Calibrated for intermediate skill level.
 */
const BASE_MINUTES_PER_UNIT: Record<OperationType, number> = {
  cutting: 5,
  edgeBanding: 8,
  drilling: 3,
  assembly: 15,
  sanding: 10,
  finishing: 12,
  hardware: 6,
} as const;

/**
 * Skill multipliers relative to intermediate baseline.
 */
const SKILL_MULTIPLIERS: Record<SkillLevel, number> = {
  beginner: 1.8,
  intermediate: 1.0,
  expert: 0.7,
} as const;

/**
 * Get the skill multiplier for a given level.
 */
export function getSkillMultiplier(skill: SkillLevel): number {
  return SKILL_MULTIPLIERS[skill];
}

/**
 * Get base minutes for an operation (per unit, at intermediate level).
 */
export function getBaseMinutes(operation: OperationType): number {
  return BASE_MINUTES_PER_UNIT[operation];
}

/**
 * Estimate time for a single task given skill level.
 */
export function estimateTaskTime(task: ProjectTask, skill: SkillLevel): TaskEstimate {
  const baseMinutes = BASE_MINUTES_PER_UNIT[task.operation] * task.quantity;
  const multiplier = SKILL_MULTIPLIERS[skill];
  const adjustedMinutes = Math.round(baseMinutes * multiplier * 100) / 100;

  return {
    taskId: task.id,
    operation: task.operation,
    baseMinutes,
    adjustedMinutes,
    isParallel: task.dependsOn.length === 0,
  };
}

/**
 * Compute the critical path duration using topological ordering.
 * Returns the longest path through the dependency graph in minutes.
 */
function computeCriticalPath(tasks: readonly ProjectTask[], estimates: ReadonlyMap<string, number>): number {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const memo = new Map<string, number>();

  function longestPath(id: string): number {
    if (memo.has(id)) return memo.get(id)!;

    const task = taskMap.get(id);
    if (!task) return 0;

    const ownTime = estimates.get(id) ?? 0;

    if (task.dependsOn.length === 0) {
      memo.set(id, ownTime);
      return ownTime;
    }

    let maxDep = 0;
    for (const depId of task.dependsOn) {
      const depPath = longestPath(depId);
      if (depPath > maxDep) maxDep = depPath;
    }

    const total = maxDep + ownTime;
    memo.set(id, total);
    return total;
  }

  let maxPath = 0;
  for (const task of tasks) {
    const path = longestPath(task.id);
    if (path > maxPath) maxPath = path;
  }

  return maxPath;
}

/**
 * Estimate total project time from tasks and skill level.
 *
 * @throws {RangeError} If tasks array is empty.
 */
export function estimateProjectTime(
  tasks: readonly ProjectTask[],
  skill: SkillLevel = 'intermediate',
): TimeEstimationResult {
  if (tasks.length === 0) {
    throw new RangeError('tasks must not be empty');
  }

  const taskEstimates: TaskEstimate[] = [];
  const estimateMap = new Map<string, number>();

  for (const task of tasks) {
    const estimate = estimateTaskTime(task, skill);
    taskEstimates.push(estimate);
    estimateMap.set(task.id, estimate.adjustedMinutes);
  }

  const totalMinutes = taskEstimates.reduce((sum, e) => sum + e.adjustedMinutes, 0);
  const criticalPathMinutes = computeCriticalPath(tasks, estimateMap);

  const parallelTasks = taskEstimates.filter((e) => e.isParallel).length;
  const sequentialTasks = taskEstimates.length - parallelTasks;

  return {
    tasks: taskEstimates,
    totalMinutes,
    totalHours: Math.round((totalMinutes / 60) * 100) / 100,
    criticalPathMinutes,
    criticalPathHours: Math.round((criticalPathMinutes / 60) * 100) / 100,
    parallelTasks,
    sequentialTasks,
    skillMultiplier: SKILL_MULTIPLIERS[skill],
  };
}
