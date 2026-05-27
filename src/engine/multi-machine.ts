/**
 * Sprint 159 — Multi-machine workflow engine.
 *
 * Splits a set of machining jobs across multiple CNC controllers based on
 * machine capabilities, availability, and workload balancing.
 *
 * Features:
 *   - Machine capability matching (spindle speed, bed size, supported ops)
 *   - Workload balancing across available machines
 *   - Job splitting when a part set exceeds single-machine capacity
 *   - Workflow status tracking (pending → dispatched → complete)
 *   - Estimated completion time for the entire workflow
 *
 * Pure TypeScript — no React, no DOM, no side effects.
 */

import type { MachiningJob } from './machining-job';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Machine capability flags. */
export interface MachineCapabilities {
  /** Maximum bed width (mm). */
  maxBedWidth: number;
  /** Maximum bed length (mm). */
  maxBedLength: number;
  /** Maximum spindle speed (RPM). */
  maxSpindleRpm: number;
  /** Supported operation types. */
  supportedOps: string[];
  /** Whether machine supports tool-change. */
  hasToolChanger: boolean;
}

/** A CNC machine available in the workshop. */
export interface WorkshopMachine {
  /** Unique machine identifier. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Machine capabilities. */
  capabilities: MachineCapabilities;
  /** Whether the machine is currently online/available. */
  online: boolean;
  /** Current queue load (total seconds of pending work). */
  currentLoadSec: number;
}

/** Assignment of a job to a specific machine. */
export interface JobAssignment {
  /** The machining job. */
  job: MachiningJob;
  /** Assigned machine ID. */
  machineId: string;
  /** Assignment state. */
  state: 'pending' | 'dispatched' | 'complete' | 'failed';
  /** Reason if a job cannot be assigned. */
  reason?: string;
}

/** Result of distributing jobs across machines. */
export interface WorkflowDistribution {
  /** Successfully assigned jobs. */
  assigned: JobAssignment[];
  /** Jobs that couldn't be assigned (no capable machine). */
  unassigned: JobAssignment[];
  /** Total estimated time for the workflow (seconds, parallel execution). */
  estimatedTotalTimeSec: number;
  /** Per-machine load summary. */
  machineLoads: MachineLoad[];
}

/** Load summary for one machine. */
export interface MachineLoad {
  /** Machine ID. */
  machineId: string;
  /** Machine name. */
  machineName: string;
  /** Number of assigned jobs. */
  jobCount: number;
  /** Total time in seconds. */
  totalTimeSec: number;
}

/** Strategy for distributing jobs. */
export type DistributionStrategy = 'least-loaded' | 'fastest-first' | 'round-robin';

/** Workflow configuration. */
export interface WorkflowConfig {
  /** Distribution strategy. */
  strategy: DistributionStrategy;
  /** Whether to include offline machines in planning. */
  includeOffline: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Default workflow configuration. */
export const DEFAULT_WORKFLOW_CONFIG: WorkflowConfig = {
  strategy: 'least-loaded',
  includeOffline: false,
};

// ─── Core functions ───────────────────────────────────────────────────────────

/**
 * Check whether a machine is capable of running a specific job.
 *
 * @param machine  Workshop machine.
 * @param job      Machining job to check.
 * @returns True if the machine can handle the job.
 */
export function isCapable(machine: WorkshopMachine, job: MachiningJob): boolean {
  const caps = machine.capabilities;

  if (job.sheetWidth > caps.maxBedWidth) return false;
  if (job.sheetLength > caps.maxBedLength) return false;
  if (job.toolSetup.spindleRpm > caps.maxSpindleRpm) return false;

  const requiredOps = new Set(job.operations.map((op) => op.type));
  for (const op of requiredOps) {
    if (!caps.supportedOps.includes(op)) return false;
  }

  return true;
}

/**
 * Find all machines capable of running a given job.
 *
 * @param machines  Available machines.
 * @param job       Machining job.
 * @param config    Workflow configuration.
 * @returns Filtered list of capable machines.
 */
export function findCapableMachines(
  machines: WorkshopMachine[],
  job: MachiningJob,
  config: WorkflowConfig = DEFAULT_WORKFLOW_CONFIG,
): WorkshopMachine[] {
  return machines.filter((m) => (config.includeOffline || m.online) && isCapable(m, job));
}

/**
 * Select the best machine for a job using the configured strategy.
 *
 * @param machines  Capable machines.
 * @param job       Job to assign.
 * @param loads     Current machine loads (mutable — updated in place by caller).
 * @param strategy  Distribution strategy.
 * @param index     Current round-robin index.
 * @returns Selected machine ID, or null if none available.
 */
export function selectMachine(
  machines: WorkshopMachine[],
  _job: MachiningJob,
  loads: Map<string, number>,
  strategy: DistributionStrategy,
  index: number,
): string | null {
  if (machines.length === 0) return null;

  switch (strategy) {
    case 'least-loaded': {
      let bestId = machines[0].id;
      let bestLoad = (loads.get(machines[0].id) ?? 0) + machines[0].currentLoadSec;
      for (const m of machines) {
        const load = (loads.get(m.id) ?? 0) + m.currentLoadSec;
        if (load < bestLoad) {
          bestLoad = load;
          bestId = m.id;
        }
      }
      return bestId;
    }
    case 'fastest-first': {
      let bestId = machines[0].id;
      let bestRpm = machines[0].capabilities.maxSpindleRpm;
      for (const m of machines) {
        if (m.capabilities.maxSpindleRpm > bestRpm) {
          bestRpm = m.capabilities.maxSpindleRpm;
          bestId = m.id;
        }
      }
      return bestId;
    }
    case 'round-robin': {
      return machines[index % machines.length].id;
    }
  }
}

/**
 * Distribute a set of machining jobs across available workshop machines.
 *
 * @param jobs      Jobs to distribute.
 * @param machines  Available workshop machines.
 * @param config    Workflow configuration.
 * @returns Distribution result with assignments and load summaries.
 */
export function distributeJobs(
  jobs: MachiningJob[],
  machines: WorkshopMachine[],
  config: WorkflowConfig = DEFAULT_WORKFLOW_CONFIG,
): WorkflowDistribution {
  const assigned: JobAssignment[] = [];
  const unassigned: JobAssignment[] = [];
  const loads = new Map<string, number>();
  let rrIndex = 0;

  for (const job of jobs) {
    const capable = findCapableMachines(machines, job, config);

    if (capable.length === 0) {
      unassigned.push({ job, machineId: '', state: 'pending', reason: 'No capable machine available' });
      continue;
    }

    const machineId = selectMachine(capable, job, loads, config.strategy, rrIndex);
    if (!machineId) {
      unassigned.push({ job, machineId: '', state: 'pending', reason: 'Selection failed' });
      continue;
    }

    assigned.push({ job, machineId, state: 'pending' });
    loads.set(machineId, (loads.get(machineId) ?? 0) + job.totalTimeSec);
    rrIndex++;
  }

  const machineLoads = computeMachineLoads(assigned, machines);
  const estimatedTotalTimeSec = machineLoads.length > 0 ? Math.max(...machineLoads.map((ml) => ml.totalTimeSec)) : 0;

  return { assigned, unassigned, estimatedTotalTimeSec, machineLoads };
}

/**
 * Mark an assignment as dispatched.
 *
 * @param assignments  Current assignments.
 * @param jobId        Job ID to mark.
 * @returns Updated assignments array.
 */
export function markDispatched(assignments: JobAssignment[], jobId: string): JobAssignment[] {
  return assignments.map((a) => (a.job.id === jobId && a.state === 'pending' ? { ...a, state: 'dispatched' } : a));
}

/**
 * Mark an assignment as complete.
 *
 * @param assignments  Current assignments.
 * @param jobId        Job ID to mark.
 * @returns Updated assignments array.
 */
export function markComplete(assignments: JobAssignment[], jobId: string): JobAssignment[] {
  return assignments.map((a) => (a.job.id === jobId && a.state === 'dispatched' ? { ...a, state: 'complete' } : a));
}

/**
 * Mark an assignment as failed.
 *
 * @param assignments  Current assignments.
 * @param jobId        Job ID to mark.
 * @param reason       Failure reason.
 * @returns Updated assignments array.
 */
export function markFailed(assignments: JobAssignment[], jobId: string, reason: string): JobAssignment[] {
  return assignments.map((a) =>
    a.job.id === jobId && a.state === 'dispatched' ? { ...a, state: 'failed', reason } : a,
  );
}

/**
 * Get workflow progress as percentage (0–100).
 *
 * @param assignments  All assignments.
 * @returns Completion percentage.
 */
export function getWorkflowProgress(assignments: JobAssignment[]): number {
  if (assignments.length === 0) return 100;
  const completed = assignments.filter((a) => a.state === 'complete').length;
  return Math.round((completed / assignments.length) * 100);
}

/**
 * Compute per-machine load summaries.
 *
 * @param assignments  Job assignments.
 * @param machines     Workshop machines (for names).
 * @returns Array of machine load summaries.
 */
export function computeMachineLoads(assignments: JobAssignment[], machines: WorkshopMachine[]): MachineLoad[] {
  const machineMap = new Map(machines.map((m) => [m.id, m.name]));
  const loadMap = new Map<string, { count: number; time: number }>();

  for (const a of assignments) {
    if (!a.machineId) continue;
    const current = loadMap.get(a.machineId) ?? { count: 0, time: 0 };
    current.count += 1;
    current.time += a.job.totalTimeSec;
    loadMap.set(a.machineId, current);
  }

  return [...loadMap.entries()].map(([id, { count, time }]) => ({
    machineId: id,
    machineName: machineMap.get(id) ?? id,
    jobCount: count,
    totalTimeSec: time,
  }));
}
