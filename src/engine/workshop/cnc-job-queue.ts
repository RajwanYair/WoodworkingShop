/**
 * Sprint 157 — CNC job queue engine.
 *
 * Manages a priority queue of machining jobs destined for one or more CNC
 * controllers. Features:
 *   - Priority-based scheduling (urgent, normal, low)
 *   - Job state machine (queued → running → completed | failed | cancelled)
 *   - Estimated completion time for the entire queue
 *   - Job reordering and cancellation
 *   - Queue capacity limits and overflow detection
 *
 * Pure TypeScript — no React, no DOM, no side effects.
 */

import type { MachiningJob } from './machining-job';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Job priority levels (lower number = higher priority). */
export type JobPriority = 'urgent' | 'normal' | 'low';

/** Job execution state. */
export type JobState = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

/** A job entry in the queue with scheduling metadata. */
export interface QueuedJob {
  /** The underlying machining job. */
  job: MachiningJob;
  /** Priority level. */
  priority: JobPriority;
  /** Current state. */
  state: JobState;
  /** ISO 8601 timestamp when the job was enqueued. */
  enqueuedAt: string;
  /** ISO 8601 timestamp when the job started executing (undefined if not started). */
  startedAt?: string;
  /** ISO 8601 timestamp when the job finished (completed/failed/cancelled). */
  finishedAt?: string;
  /** Error message if state is 'failed'. */
  errorMessage?: string;
  /** Target machine profile ID (which CNC controller to run on). */
  targetMachineId: string;
  /** Position in the queue (0-based, recomputed on changes). */
  position: number;
}

/** Queue statistics. */
export interface QueueStats {
  /** Total number of jobs in the queue. */
  total: number;
  /** Number of jobs in each state. */
  queued: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
  /** Estimated total time remaining for all queued + running jobs (seconds). */
  estimatedRemainingTimeSec: number;
  /** Queue utilisation (0–1): running jobs / max concurrent. */
  utilisation: number;
}

/** Queue configuration. */
export interface QueueConfig {
  /** Maximum jobs allowed in the queue (0 = unlimited). */
  maxQueueSize: number;
  /** Maximum concurrent running jobs. */
  maxConcurrent: number;
}

/** Result of attempting to enqueue a job. */
export interface EnqueueResult {
  success: boolean;
  /** Position assigned (undefined on failure). */
  position?: number;
  /** Error reason if failed. */
  error?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Default queue configuration. */
export const DEFAULT_QUEUE_CONFIG: QueueConfig = {
  maxQueueSize: 50,
  maxConcurrent: 1,
};

/** Priority sort weights (lower = earlier in queue). */
const PRIORITY_WEIGHT: Record<JobPriority, number> = {
  urgent: 0,
  normal: 1,
  low: 2,
};

// ─── Queue operations ─────────────────────────────────────────────────────────

/**
 * Create a new empty job queue.
 *
 * @returns Empty queue array.
 */
export function createJobQueue(): QueuedJob[] {
  return [];
}

/**
 * Enqueue a machining job with the given priority.
 *
 * @param queue          Current queue (not mutated — returns new array).
 * @param job            Machining job to add.
 * @param priority       Priority level.
 * @param targetMachineId  Target CNC machine profile ID.
 * @param config         Queue configuration.
 * @returns Tuple of [new queue, enqueue result].
 */
export function enqueueJob(
  queue: QueuedJob[],
  job: MachiningJob,
  priority: JobPriority,
  targetMachineId: string,
  config: QueueConfig = DEFAULT_QUEUE_CONFIG,
): [QueuedJob[], EnqueueResult] {
  const activeJobs = queue.filter((j) => j.state === 'queued' || j.state === 'running');

  if (config.maxQueueSize > 0 && activeJobs.length >= config.maxQueueSize) {
    return [queue, { success: false, error: 'Queue is full.' }];
  }

  const entry: QueuedJob = {
    job,
    priority,
    state: 'queued',
    enqueuedAt: new Date().toISOString(),
    targetMachineId,
    position: 0,
  };

  const newQueue = recomputePositions([...queue, entry]);
  const position = newQueue.find((j) => j.job.id === job.id)?.position ?? -1;

  return [newQueue, { success: true, position }];
}

/**
 * Cancel a queued job by job ID.
 *
 * @param queue  Current queue.
 * @param jobId  ID of the job to cancel.
 * @returns New queue with the job marked cancelled (or unchanged if not found/not cancellable).
 */
export function cancelJob(queue: QueuedJob[], jobId: string): QueuedJob[] {
  return recomputePositions(
    queue.map((entry) => {
      if (entry.job.id === jobId && (entry.state === 'queued' || entry.state === 'running')) {
        return { ...entry, state: 'cancelled' as const, finishedAt: new Date().toISOString() };
      }
      return entry;
    }),
  );
}

/**
 * Transition the next eligible job(s) from 'queued' to 'running'.
 *
 * @param queue   Current queue.
 * @param config  Queue configuration (determines maxConcurrent).
 * @returns New queue with jobs promoted to running.
 */
export function promoteNextJobs(queue: QueuedJob[], config: QueueConfig = DEFAULT_QUEUE_CONFIG): QueuedJob[] {
  const runningCount = queue.filter((j) => j.state === 'running').length;
  const slotsAvailable = config.maxConcurrent - runningCount;

  if (slotsAvailable <= 0) return queue;

  const sorted = sortByPriority(queue.filter((j) => j.state === 'queued'));
  const toPromote = new Set(sorted.slice(0, slotsAvailable).map((j) => j.job.id));

  return recomputePositions(
    queue.map((entry) => {
      if (toPromote.has(entry.job.id)) {
        return { ...entry, state: 'running' as const, startedAt: new Date().toISOString() };
      }
      return entry;
    }),
  );
}

/**
 * Mark a running job as completed.
 *
 * @param queue  Current queue.
 * @param jobId  ID of the job that completed.
 * @returns Updated queue.
 */
export function completeJob(queue: QueuedJob[], jobId: string): QueuedJob[] {
  return recomputePositions(
    queue.map((entry) => {
      if (entry.job.id === jobId && entry.state === 'running') {
        return { ...entry, state: 'completed' as const, finishedAt: new Date().toISOString() };
      }
      return entry;
    }),
  );
}

/**
 * Mark a running job as failed.
 *
 * @param queue         Current queue.
 * @param jobId         ID of the job that failed.
 * @param errorMessage  Reason for failure.
 * @returns Updated queue.
 */
export function failJob(queue: QueuedJob[], jobId: string, errorMessage: string): QueuedJob[] {
  return recomputePositions(
    queue.map((entry) => {
      if (entry.job.id === jobId && entry.state === 'running') {
        return { ...entry, state: 'failed' as const, finishedAt: new Date().toISOString(), errorMessage };
      }
      return entry;
    }),
  );
}

/**
 * Change the priority of a queued job.
 *
 * @param queue     Current queue.
 * @param jobId     Job to reprioritise.
 * @param priority  New priority.
 * @returns Updated queue with recomputed positions.
 */
export function reprioritiseJob(queue: QueuedJob[], jobId: string, priority: JobPriority): QueuedJob[] {
  return recomputePositions(
    queue.map((entry) => {
      if (entry.job.id === jobId && entry.state === 'queued') {
        return { ...entry, priority };
      }
      return entry;
    }),
  );
}

/**
 * Compute queue statistics.
 *
 * @param queue   Current queue.
 * @param config  Queue configuration.
 * @returns Queue stats including estimated remaining time.
 */
export function getQueueStats(queue: QueuedJob[], config: QueueConfig = DEFAULT_QUEUE_CONFIG): QueueStats {
  const queued = queue.filter((j) => j.state === 'queued').length;
  const running = queue.filter((j) => j.state === 'running').length;
  const completed = queue.filter((j) => j.state === 'completed').length;
  const failed = queue.filter((j) => j.state === 'failed').length;
  const cancelled = queue.filter((j) => j.state === 'cancelled').length;

  const remainingTimeSec = queue
    .filter((j) => j.state === 'queued' || j.state === 'running')
    .reduce((sum, j) => sum + j.job.totalTimeSec, 0);

  return {
    total: queue.length,
    queued,
    running,
    completed,
    failed,
    cancelled,
    estimatedRemainingTimeSec: remainingTimeSec,
    utilisation: config.maxConcurrent > 0 ? running / config.maxConcurrent : 0,
  };
}

/**
 * Get jobs filtered by target machine.
 *
 * @param queue      Current queue.
 * @param machineId  Machine profile ID to filter by.
 * @returns Jobs targeting the specified machine.
 */
export function getJobsByMachine(queue: QueuedJob[], machineId: string): QueuedJob[] {
  return queue.filter((j) => j.targetMachineId === machineId);
}

/**
 * Purge completed/failed/cancelled jobs from the queue.
 *
 * @param queue  Current queue.
 * @returns Queue containing only active (queued/running) jobs.
 */
export function purgeFinishedJobs(queue: QueuedJob[]): QueuedJob[] {
  return recomputePositions(queue.filter((j) => j.state === 'queued' || j.state === 'running'));
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Sort jobs by priority (urgent first), then by enqueue time (FIFO within same priority). */
function sortByPriority(jobs: QueuedJob[]): QueuedJob[] {
  return [...jobs].sort((a, b) => {
    const pw = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    if (pw !== 0) return pw;
    return a.enqueuedAt.localeCompare(b.enqueuedAt);
  });
}

/** Recompute position indices for all queued jobs (sorted by priority + FIFO). */
function recomputePositions(queue: QueuedJob[]): QueuedJob[] {
  const active = queue.filter((j) => j.state === 'queued' || j.state === 'running');
  const sorted = sortByPriority(active);
  const positionMap = new Map<string, number>();
  sorted.forEach((j, i) => positionMap.set(j.job.id, i));

  return queue.map((entry) => ({
    ...entry,
    position: positionMap.get(entry.job.id) ?? entry.position,
  }));
}
