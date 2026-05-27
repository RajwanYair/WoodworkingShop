import { describe, it, expect } from 'vitest';
import {
  isCapable,
  findCapableMachines,
  selectMachine,
  distributeJobs,
  markDispatched,
  markComplete,
  markFailed,
  getWorkflowProgress,
  computeMachineLoads,
  DEFAULT_WORKFLOW_CONFIG,
} from '../../src/engine/multi-machine';
import type { WorkshopMachine, WorkflowConfig } from '../../src/engine/multi-machine';
import type { MachiningJob } from '../../src/engine/machining-job';

function makeMachine(overrides: Partial<WorkshopMachine> = {}): WorkshopMachine {
  return {
    id: 'machine-1',
    name: 'CNC Router 1',
    capabilities: {
      maxBedWidth: 1300,
      maxBedLength: 2500,
      maxSpindleRpm: 24000,
      supportedOps: ['profile-cut', 'dado', 'rabbet', 'drill', 'pocket'],
      hasToolChanger: true,
    },
    online: true,
    currentLoadSec: 0,
    ...overrides,
  };
}

function makeJob(overrides: Partial<MachiningJob> = {}): MachiningJob {
  return {
    id: `job-${Math.random().toString(36).slice(2, 8)}`,
    name: 'Test Job',
    material: 'MDF 18mm',
    sheetWidth: 1220,
    sheetLength: 2440,
    createdAt: new Date().toISOString(),
    machineProfileId: 'generic-3axis',
    toolSetup: {
      toolDiameter: 6,
      passDepth: 4,
      feedRate: 3000,
      plungeRate: 1000,
      spindleRpm: 18000,
      safeZ: 5,
    },
    operations: [
      {
        id: 'op1',
        type: 'profile-cut',
        partId: 'p1',
        partLabel: 'Side',
        depth: 18,
        x: 0,
        y: 0,
        length: 600,
        alongGrain: true,
        estimatedTimeSec: 30,
      },
    ],
    totalTimeSec: 120,
    totalPasses: 8,
    ...overrides,
  };
}

describe('multi-machine', () => {
  describe('isCapable', () => {
    it('returns true when machine meets all requirements', () => {
      const machine = makeMachine();
      const job = makeJob();
      expect(isCapable(machine, job)).toBe(true);
    });

    it.each([
      { field: 'sheetWidth', jobValue: 1400, desc: 'sheet too wide' },
      { field: 'sheetLength', jobValue: 2600, desc: 'sheet too long' },
    ])('returns false when $desc', ({ field, jobValue }) => {
      const machine = makeMachine();
      const job = makeJob({ [field]: jobValue });
      expect(isCapable(machine, job)).toBe(false);
    });

    it('returns false when spindle RPM exceeds machine capability', () => {
      const machine = makeMachine({ capabilities: { ...makeMachine().capabilities, maxSpindleRpm: 12000 } });
      const job = makeJob();
      expect(isCapable(machine, job)).toBe(false);
    });

    it('returns false when operation type not supported', () => {
      const machine = makeMachine({
        capabilities: { ...makeMachine().capabilities, supportedOps: ['drill'] },
      });
      const job = makeJob(); // has profile-cut
      expect(isCapable(machine, job)).toBe(false);
    });
  });

  describe('findCapableMachines', () => {
    it('filters out offline machines by default', () => {
      const machines = [makeMachine({ id: 'm1', online: true }), makeMachine({ id: 'm2', online: false })];
      const job = makeJob();
      const capable = findCapableMachines(machines, job);
      expect(capable).toHaveLength(1);
      expect(capable[0].id).toBe('m1');
    });

    it('includes offline machines when configured', () => {
      const machines = [makeMachine({ id: 'm1', online: true }), makeMachine({ id: 'm2', online: false })];
      const job = makeJob();
      const config: WorkflowConfig = { strategy: 'least-loaded', includeOffline: true };
      const capable = findCapableMachines(machines, job, config);
      expect(capable).toHaveLength(2);
    });
  });

  describe('selectMachine', () => {
    const machines = [
      makeMachine({ id: 'm1', currentLoadSec: 100 }),
      makeMachine({ id: 'm2', currentLoadSec: 50 }),
      makeMachine({ id: 'm3', currentLoadSec: 200 }),
    ];

    it('least-loaded: picks machine with lowest total load', () => {
      const loads = new Map<string, number>();
      const selected = selectMachine(machines, makeJob(), loads, 'least-loaded', 0);
      expect(selected).toBe('m2');
    });

    it('least-loaded: accounts for accumulated loads', () => {
      const loads = new Map([['m2', 200]]);
      const selected = selectMachine(machines, makeJob(), loads, 'least-loaded', 0);
      expect(selected).toBe('m1');
    });

    it('fastest-first: picks machine with highest spindle RPM', () => {
      const fastMachines = [
        makeMachine({ id: 'm1', capabilities: { ...makeMachine().capabilities, maxSpindleRpm: 18000 } }),
        makeMachine({ id: 'm2', capabilities: { ...makeMachine().capabilities, maxSpindleRpm: 24000 } }),
      ];
      const selected = selectMachine(fastMachines, makeJob(), new Map(), 'fastest-first', 0);
      expect(selected).toBe('m2');
    });

    it('round-robin: cycles through machines', () => {
      const loads = new Map<string, number>();
      expect(selectMachine(machines, makeJob(), loads, 'round-robin', 0)).toBe('m1');
      expect(selectMachine(machines, makeJob(), loads, 'round-robin', 1)).toBe('m2');
      expect(selectMachine(machines, makeJob(), loads, 'round-robin', 2)).toBe('m3');
      expect(selectMachine(machines, makeJob(), loads, 'round-robin', 3)).toBe('m1');
    });

    it('returns null for empty machine list', () => {
      expect(selectMachine([], makeJob(), new Map(), 'least-loaded', 0)).toBeNull();
    });
  });

  describe('distributeJobs', () => {
    it('assigns all jobs to capable machines', () => {
      const machines = [makeMachine({ id: 'm1' }), makeMachine({ id: 'm2' })];
      const jobs = [makeJob({ id: 'j1', totalTimeSec: 60 }), makeJob({ id: 'j2', totalTimeSec: 90 })];
      const result = distributeJobs(jobs, machines);

      expect(result.assigned).toHaveLength(2);
      expect(result.unassigned).toHaveLength(0);
    });

    it('marks jobs as unassigned when no machine is capable', () => {
      const machines = [makeMachine({ id: 'm1', capabilities: { ...makeMachine().capabilities, maxBedWidth: 500 } })];
      const jobs = [makeJob({ id: 'j1', sheetWidth: 1220 })];
      const result = distributeJobs(jobs, machines);

      expect(result.assigned).toHaveLength(0);
      expect(result.unassigned).toHaveLength(1);
      expect(result.unassigned[0].reason).toContain('No capable machine');
    });

    it('balances load with least-loaded strategy', () => {
      const machines = [makeMachine({ id: 'm1', currentLoadSec: 0 }), makeMachine({ id: 'm2', currentLoadSec: 0 })];
      const jobs = [
        makeJob({ id: 'j1', totalTimeSec: 100 }),
        makeJob({ id: 'j2', totalTimeSec: 100 }),
        makeJob({ id: 'j3', totalTimeSec: 100 }),
        makeJob({ id: 'j4', totalTimeSec: 100 }),
      ];
      const result = distributeJobs(jobs, machines);

      const m1Jobs = result.assigned.filter((a) => a.machineId === 'm1');
      const m2Jobs = result.assigned.filter((a) => a.machineId === 'm2');
      expect(m1Jobs.length).toBe(2);
      expect(m2Jobs.length).toBe(2);
    });

    it('computes estimated total time as max across machines', () => {
      const machines = [makeMachine({ id: 'm1', currentLoadSec: 0 }), makeMachine({ id: 'm2', currentLoadSec: 0 })];
      const jobs = [makeJob({ id: 'j1', totalTimeSec: 100 }), makeJob({ id: 'j2', totalTimeSec: 200 })];
      const result = distributeJobs(jobs, machines);
      // least-loaded: j1→m1 (100s), j2→m2 (200s) → max = 200
      expect(result.estimatedTotalTimeSec).toBe(200);
    });
  });

  describe('workflow state transitions', () => {
    it('markDispatched transitions pending → dispatched', () => {
      const assignments = [{ job: makeJob({ id: 'j1' }), machineId: 'm1', state: 'pending' as const }];
      const updated = markDispatched(assignments, 'j1');
      expect(updated[0].state).toBe('dispatched');
    });

    it('markComplete transitions dispatched → complete', () => {
      const assignments = [{ job: makeJob({ id: 'j1' }), machineId: 'm1', state: 'dispatched' as const }];
      const updated = markComplete(assignments, 'j1');
      expect(updated[0].state).toBe('complete');
    });

    it('markFailed transitions dispatched → failed with reason', () => {
      const assignments = [{ job: makeJob({ id: 'j1' }), machineId: 'm1', state: 'dispatched' as const }];
      const updated = markFailed(assignments, 'j1', 'Tool broke');
      expect(updated[0].state).toBe('failed');
      expect(updated[0].reason).toBe('Tool broke');
    });
  });

  describe('getWorkflowProgress', () => {
    it('returns 100 for empty assignments', () => {
      expect(getWorkflowProgress([])).toBe(100);
    });

    it('returns 0 when no jobs are complete', () => {
      const assignments = [
        { job: makeJob({ id: 'j1' }), machineId: 'm1', state: 'pending' as const },
        { job: makeJob({ id: 'j2' }), machineId: 'm1', state: 'dispatched' as const },
      ];
      expect(getWorkflowProgress(assignments)).toBe(0);
    });

    it('returns correct percentage for mixed states', () => {
      const assignments = [
        { job: makeJob({ id: 'j1' }), machineId: 'm1', state: 'complete' as const },
        { job: makeJob({ id: 'j2' }), machineId: 'm1', state: 'complete' as const },
        { job: makeJob({ id: 'j3' }), machineId: 'm1', state: 'dispatched' as const },
        { job: makeJob({ id: 'j4' }), machineId: 'm1', state: 'pending' as const },
      ];
      expect(getWorkflowProgress(assignments)).toBe(50);
    });
  });

  describe('computeMachineLoads', () => {
    it('computes per-machine totals', () => {
      const machines = [makeMachine({ id: 'm1', name: 'Router A' }), makeMachine({ id: 'm2', name: 'Router B' })];
      const assignments = [
        { job: makeJob({ id: 'j1', totalTimeSec: 60 }), machineId: 'm1', state: 'pending' as const },
        { job: makeJob({ id: 'j2', totalTimeSec: 90 }), machineId: 'm1', state: 'pending' as const },
        { job: makeJob({ id: 'j3', totalTimeSec: 120 }), machineId: 'm2', state: 'pending' as const },
      ];
      const loads = computeMachineLoads(assignments, machines);

      expect(loads).toHaveLength(2);
      const m1Load = loads.find((l) => l.machineId === 'm1');
      expect(m1Load?.jobCount).toBe(2);
      expect(m1Load?.totalTimeSec).toBe(150);
      expect(m1Load?.machineName).toBe('Router A');
    });
  });

  describe('DEFAULT_WORKFLOW_CONFIG', () => {
    it('defaults to least-loaded without offline', () => {
      expect(DEFAULT_WORKFLOW_CONFIG.strategy).toBe('least-loaded');
      expect(DEFAULT_WORKFLOW_CONFIG.includeOffline).toBe(false);
    });
  });
});
