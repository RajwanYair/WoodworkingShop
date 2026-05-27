/**
 * Sprint 167 — Production Schedule Planner.
 *
 * Timeline-based scheduling for woodworking production runs. Allocates
 * cabinet builds across available work days, respecting dependencies
 * (e.g., cut → edge-band → assemble) and resource constraints.
 *
 * Features:
 *   - Task creation with duration, dependencies, and resource requirements
 *   - Forward-scheduling algorithm (earliest start)
 *   - Critical path calculation
 *   - Resource conflict detection
 *   - Schedule compression (crashing)
 *   - Milestone support
 *   - Gantt-compatible output format
 *
 * Pure TypeScript — no React, no DOM, no side effects.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Task status in the schedule. */
export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'blocked' | 'skipped';

/** Resource type available in the workshop. */
export type ResourceKind = 'machine' | 'worker' | 'station' | 'tool';

/** A resource in the workshop. */
export interface WorkshopResource {
  /** Unique resource ID. */
  id: string;
  /** Resource display name. */
  name: string;
  /** Resource kind. */
  kind: ResourceKind;
  /** Available hours per day. */
  hoursPerDay: number;
  /** Days of week available (0 = Sunday, 6 = Saturday). */
  availableDays: number[];
}

/** A scheduled task (operation). */
export interface ScheduleTask {
  /** Unique task ID. */
  id: string;
  /** Task display name. */
  name: string;
  /** Project ID this task belongs to. */
  projectId: string;
  /** Estimated duration in hours. */
  durationHours: number;
  /** IDs of tasks that must complete before this one starts. */
  dependencies: string[];
  /** Required resource IDs. */
  requiredResources: string[];
  /** Current status. */
  status: TaskStatus;
  /** Whether this is a milestone (zero-duration marker). */
  isMilestone: boolean;
  /** Priority (lower = higher priority). */
  priority: number;
}

/** A scheduled slot (task placed in time). */
export interface ScheduledSlot {
  /** Task ID. */
  taskId: string;
  /** Start day offset from schedule start (0-based). */
  startDay: number;
  /** End day offset (exclusive). */
  endDay: number;
  /** Start hour within the day. */
  startHour: number;
  /** Allocated resource IDs. */
  allocatedResources: string[];
  /** Whether this task is on the critical path. */
  isCritical: boolean;
}

/** Full production schedule. */
export interface ProductionSchedule {
  /** Schedule ID. */
  id: string;
  /** Schedule name. */
  name: string;
  /** All tasks in the schedule. */
  tasks: ScheduleTask[];
  /** All resources available. */
  resources: WorkshopResource[];
  /** Computed slots (after scheduling). */
  slots: ScheduledSlot[];
  /** Total span in days. */
  totalDays: number;
  /** Critical path task IDs (in order). */
  criticalPath: string[];
}

/** Resource conflict detected during scheduling. */
export interface ResourceConflict {
  /** Resource ID that is over-allocated. */
  resourceId: string;
  /** Day on which the conflict occurs. */
  day: number;
  /** Tasks competing for this resource. */
  taskIds: string[];
  /** Over-allocation in hours. */
  overHours: number;
}

/** Schedule summary metrics. */
export interface ScheduleMetrics {
  /** Total tasks. */
  totalTasks: number;
  /** Total milestones. */
  milestones: number;
  /** Schedule span in days. */
  spanDays: number;
  /** Critical path length in days. */
  criticalPathDays: number;
  /** Total work hours. */
  totalWorkHours: number;
  /** Average resource utilization (0–1). */
  avgUtilization: number;
  /** Number of resource conflicts. */
  conflicts: number;
}

/** ID generator type. */
export type IdGenerator = () => string;

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum tasks per schedule. */
export const MAX_TASKS = 500;

/** Maximum resources per schedule. */
export const MAX_RESOURCES = 50;

/** Default working hours per day. */
export const DEFAULT_HOURS_PER_DAY = 8;

// ─── Core functions ───────────────────────────────────────────────────────────

/**
 * Create a new empty production schedule.
 *
 * @param name       Schedule name.
 * @param resources  Available resources.
 * @param idGen      ID generator.
 * @returns New production schedule.
 */
export function createSchedule(
  name: string,
  resources: WorkshopResource[],
  idGen: IdGenerator = defaultIdGen,
): ProductionSchedule {
  if (!name || name.trim().length === 0) {
    throw new RangeError('createSchedule: name must not be empty');
  }
  if (resources.length > MAX_RESOURCES) {
    throw new RangeError(`createSchedule: resources exceed maximum of ${MAX_RESOURCES}`);
  }

  return {
    id: idGen(),
    name: name.trim(),
    tasks: [],
    resources,
    slots: [],
    totalDays: 0,
    criticalPath: [],
  };
}

/**
 * Add a task to the schedule.
 *
 * @param schedule  Current schedule.
 * @param task      Task to add.
 * @returns Updated schedule.
 */
export function addTask(schedule: ProductionSchedule, task: ScheduleTask): ProductionSchedule {
  if (schedule.tasks.length >= MAX_TASKS) {
    throw new RangeError(`addTask: tasks exceed maximum of ${MAX_TASKS}`);
  }
  if (schedule.tasks.some((t) => t.id === task.id)) {
    throw new RangeError(`addTask: task "${task.id}" already exists`);
  }
  // Validate dependencies exist
  for (const dep of task.dependencies) {
    if (!schedule.tasks.some((t) => t.id === dep)) {
      throw new RangeError(`addTask: dependency "${dep}" not found`);
    }
  }

  return { ...schedule, tasks: [...schedule.tasks, task] };
}

/**
 * Compute the schedule (forward pass scheduling).
 *
 * Uses topological sort on dependencies, then places each task at
 * its earliest possible start time respecting resource constraints.
 *
 * @param schedule  Schedule with tasks and resources.
 * @returns Computed schedule with slots, critical path, and total days.
 */
export function computeSchedule(schedule: ProductionSchedule): ProductionSchedule {
  if (schedule.tasks.length === 0) {
    return { ...schedule, slots: [], totalDays: 0, criticalPath: [] };
  }

  // Topological sort
  const sorted = topoSort(schedule.tasks);

  // Forward pass: compute earliest start for each task
  const earliestStart = new Map<string, number>();
  const taskDuration = new Map<string, number>();

  for (const task of sorted) {
    const depsEnd = task.dependencies.map((d) => {
      const start = earliestStart.get(d) ?? 0;
      const dur = taskDuration.get(d) ?? 0;
      return start + dur;
    });
    const es = depsEnd.length > 0 ? Math.max(...depsEnd) : 0;
    earliestStart.set(task.id, es);
    taskDuration.set(task.id, task.isMilestone ? 0 : task.durationHours);
  }

  // Convert hours to day slots
  const defaultHours = getDefaultHoursPerDay(schedule.resources);
  const slots: ScheduledSlot[] = sorted.map((task) => {
    const startHours = earliestStart.get(task.id) ?? 0;
    const startDay = Math.floor(startHours / defaultHours);
    const startHour = startHours % defaultHours;
    const endHours = startHours + (task.isMilestone ? 0 : task.durationHours);
    const endDay = Math.ceil(endHours / defaultHours);

    return {
      taskId: task.id,
      startDay,
      endDay,
      startHour,
      allocatedResources: task.requiredResources,
      isCritical: false, // computed below
    };
  });

  const totalDays = slots.reduce((max, s) => Math.max(max, s.endDay), 0);

  // Critical path: longest path through the dependency graph
  const criticalPath = computeCriticalPath(sorted, earliestStart, taskDuration);

  // Mark critical slots
  const criticalSet = new Set(criticalPath);
  const markedSlots = slots.map((s) => ({
    ...s,
    isCritical: criticalSet.has(s.taskId),
  }));

  return { ...schedule, slots: markedSlots, totalDays, criticalPath };
}

/**
 * Detect resource conflicts in a computed schedule.
 *
 * @param schedule  Computed schedule.
 * @returns Array of resource conflicts.
 */
export function detectConflicts(schedule: ProductionSchedule): ResourceConflict[] {
  const conflicts: ResourceConflict[] = [];
  const defaultHours = getDefaultHoursPerDay(schedule.resources);

  // Group slots by day and resource
  const dayResourceMap = new Map<string, { taskIds: string[]; hours: number }>();

  for (const slot of schedule.slots) {
    for (let day = slot.startDay; day < slot.endDay; day++) {
      for (const resId of slot.allocatedResources) {
        const key = `${day}:${resId}`;
        const entry = dayResourceMap.get(key) ?? { taskIds: [], hours: 0 };
        entry.taskIds.push(slot.taskId);
        const task = schedule.tasks.find((t) => t.id === slot.taskId);
        const hoursOnDay = Math.min(task?.durationHours ?? defaultHours, defaultHours);
        entry.hours += hoursOnDay;
        dayResourceMap.set(key, entry);
      }
    }
  }

  for (const [key, entry] of dayResourceMap) {
    if (entry.taskIds.length > 1) {
      const [dayStr, resourceId] = key.split(':');
      const day = Number(dayStr);
      const overHours = entry.hours - defaultHours;
      if (overHours > 0) {
        conflicts.push({ resourceId, day, taskIds: entry.taskIds, overHours });
      }
    }
  }

  return conflicts;
}

/**
 * Get schedule metrics.
 *
 * @param schedule  Computed schedule.
 * @returns Schedule metrics summary.
 */
export function getScheduleMetrics(schedule: ProductionSchedule): ScheduleMetrics {
  const totalTasks = schedule.tasks.length;
  const milestones = schedule.tasks.filter((t) => t.isMilestone).length;
  const totalWorkHours = schedule.tasks.reduce((s, t) => s + (t.isMilestone ? 0 : t.durationHours), 0);

  const defaultHours = getDefaultHoursPerDay(schedule.resources);
  const totalCapacity = schedule.totalDays * schedule.resources.length * defaultHours;
  const avgUtilization = totalCapacity > 0 ? totalWorkHours / totalCapacity : 0;

  const criticalPathDays =
    schedule.criticalPath.length > 0
      ? schedule.slots.filter((s) => s.isCritical).reduce((max, s) => Math.max(max, s.endDay), 0)
      : 0;

  const conflicts = detectConflicts(schedule).length;

  return {
    totalTasks,
    milestones,
    spanDays: schedule.totalDays,
    criticalPathDays,
    totalWorkHours,
    avgUtilization: Math.round(avgUtilization * 100) / 100,
    conflicts,
  };
}

/**
 * Compress the schedule by reducing task duration (crashing).
 *
 * @param schedule       Computed schedule.
 * @param taskId         Task to crash.
 * @param newDuration    New duration in hours.
 * @returns Updated schedule (recomputed).
 */
export function crashTask(schedule: ProductionSchedule, taskId: string, newDuration: number): ProductionSchedule {
  if (newDuration < 0) {
    throw new RangeError('crashTask: duration cannot be negative');
  }
  const taskIndex = schedule.tasks.findIndex((t) => t.id === taskId);
  if (taskIndex === -1) {
    throw new RangeError(`crashTask: task "${taskId}" not found`);
  }

  const updated = [...schedule.tasks];
  updated[taskIndex] = { ...updated[taskIndex], durationHours: newDuration };

  return computeSchedule({ ...schedule, tasks: updated });
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

let idSeq = 0;
function defaultIdGen(): string {
  return `sched-${Date.now()}-${++idSeq}`;
}

function getDefaultHoursPerDay(resources: WorkshopResource[]): number {
  if (resources.length === 0) return DEFAULT_HOURS_PER_DAY;
  return resources[0].hoursPerDay || DEFAULT_HOURS_PER_DAY;
}

function topoSort(tasks: ScheduleTask[]): ScheduleTask[] {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const visited = new Set<string>();
  const result: ScheduleTask[] = [];

  function visit(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    const task = taskMap.get(id)!;
    for (const dep of task.dependencies) {
      visit(dep);
    }
    result.push(task);
  }

  for (const task of tasks) {
    visit(task.id);
  }

  return result;
}

function computeCriticalPath(
  sorted: ScheduleTask[],
  earliestStart: Map<string, number>,
  taskDuration: Map<string, number>,
): string[] {
  // Find the task with the latest finish time
  let maxFinish = 0;
  let lastTaskId = '';

  for (const task of sorted) {
    const finish = (earliestStart.get(task.id) ?? 0) + (taskDuration.get(task.id) ?? 0);
    if (finish >= maxFinish) {
      maxFinish = finish;
      lastTaskId = task.id;
    }
  }

  if (!lastTaskId) return [];

  // Trace back through dependencies to build critical path
  const path: string[] = [];
  const taskMap = new Map(sorted.map((t) => [t.id, t]));
  let currentId: string | null = lastTaskId;

  while (currentId) {
    path.unshift(currentId);
    const task = taskMap.get(currentId);
    if (!task || task.dependencies.length === 0) break;

    // Follow the dependency with the latest finish
    let longestDep: string | null = null;
    let longestFinish = -1;
    for (const depId of task.dependencies) {
      const depFinish = (earliestStart.get(depId) ?? 0) + (taskDuration.get(depId) ?? 0);
      if (depFinish > longestFinish) {
        longestFinish = depFinish;
        longestDep = depId;
      }
    }
    currentId = longestDep;
  }

  return path;
}
