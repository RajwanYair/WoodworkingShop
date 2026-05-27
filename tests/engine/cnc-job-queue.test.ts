import { describe, it, expect, beforeEach } from 'vitest';
import {
  createJobQueue,
  enqueueJob,
  cancelJob,
  promoteNextJobs,
  completeJob,
  failJob,
  reprioritiseJob,
  getQueueStats,
  getJobsByMachine,
  purgeFinishedJobs,
  DEFAULT_QUEUE_CONFIG,
} from '../../src/engine/cnc-job-queue';
import type { QueuedJob, QueueConfig } from '../../src/engine/cnc-job-queue';
import type { MachiningJob } from '../../src/engine/machining-job';

/** Minimal machining job factory for testing. */
function makeJob(overrides: Partial<MachiningJob> = {}): MachiningJob {
  return {
    id: `job-${Math.random().toString(36).slice(2, 8)}`,
    name: 'Test Job',
    material: 'Plywood 18mm',
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
    operations: [],
    totalTimeSec: 120,
    totalPasses: 8,
    ...overrides,
  };
}

describe('cnc-job-queue', () => {
  let queue: QueuedJob[];

  beforeEach(() => {
    queue = createJobQueue();
  });

  describe('createJobQueue', () => {
    it('returns an empty array', () => {
      expect(queue).toEqual([]);
    });
  });

  describe('enqueueJob', () => {
    it('adds a job to the queue with correct initial state', () => {
      const job = makeJob({ id: 'j1' });
      const [newQueue, result] = enqueueJob(queue, job, 'normal', 'machine-1');

      expect(result.success).toBe(true);
      expect(result.position).toBe(0);
      expect(newQueue).toHaveLength(1);
      expect(newQueue[0].state).toBe('queued');
      expect(newQueue[0].priority).toBe('normal');
      expect(newQueue[0].targetMachineId).toBe('machine-1');
    });

    it('rejects when queue is full', () => {
      const config: QueueConfig = { maxQueueSize: 2, maxConcurrent: 1 };
      const q = queue;
      const [q1] = enqueueJob(q, makeJob({ id: 'j1' }), 'normal', 'm1', config);
      const [q2] = enqueueJob(q1, makeJob({ id: 'j2' }), 'normal', 'm1', config);
      const [q3, result] = enqueueJob(q2, makeJob({ id: 'j3' }), 'normal', 'm1', config);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Queue is full.');
      expect(q3).toHaveLength(2);
    });

    it('allows unlimited queue when maxQueueSize is 0', () => {
      const config: QueueConfig = { maxQueueSize: 0, maxConcurrent: 1 };
      let q = queue;
      for (let i = 0; i < 100; i++) {
        const [nq] = enqueueJob(q, makeJob({ id: `j${i}` }), 'normal', 'm1', config);
        q = nq;
      }
      expect(q).toHaveLength(100);
    });

    it.each([
      { priority: 'urgent' as const, expectedPosition: 0 },
      { priority: 'normal' as const, expectedPosition: 1 },
      { priority: 'low' as const, expectedPosition: 2 },
    ])('assigns position based on priority ($priority → $expectedPosition)', ({ priority, expectedPosition }) => {
      const q = queue;
      const [q1] = enqueueJob(q, makeJob({ id: 'normal-1' }), 'normal', 'm1');
      const [q2] = enqueueJob(q1, makeJob({ id: 'low-1' }), 'low', 'm1');
      const [q3, result] = enqueueJob(q2, makeJob({ id: `test-${priority}` }), priority, 'm1');

      // The newly added job should be at the expected position
      const addedJob = q3.find((j) => j.job.id === `test-${priority}`);
      expect(addedJob).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.position).toBe(expectedPosition);
    });
  });

  describe('cancelJob', () => {
    it('marks a queued job as cancelled', () => {
      const [q1] = enqueueJob(queue, makeJob({ id: 'j1' }), 'normal', 'm1');
      const q2 = cancelJob(q1, 'j1');

      expect(q2[0].state).toBe('cancelled');
      expect(q2[0].finishedAt).toBeDefined();
    });

    it('marks a running job as cancelled', () => {
      const [q1] = enqueueJob(queue, makeJob({ id: 'j1' }), 'normal', 'm1');
      const q2 = promoteNextJobs(q1);
      const q3 = cancelJob(q2, 'j1');

      expect(q3[0].state).toBe('cancelled');
    });

    it('does not cancel completed/failed jobs', () => {
      const [q1] = enqueueJob(queue, makeJob({ id: 'j1' }), 'normal', 'm1');
      const q2 = promoteNextJobs(q1);
      const q3 = completeJob(q2, 'j1');
      const q4 = cancelJob(q3, 'j1');

      expect(q4[0].state).toBe('completed');
    });
  });

  describe('promoteNextJobs', () => {
    it('promotes the highest-priority queued job to running', () => {
      const [q1] = enqueueJob(queue, makeJob({ id: 'j1' }), 'low', 'm1');
      const [q2] = enqueueJob(q1, makeJob({ id: 'j2' }), 'urgent', 'm1');
      const q3 = promoteNextJobs(q2);

      const running = q3.filter((j) => j.state === 'running');
      expect(running).toHaveLength(1);
      expect(running[0].job.id).toBe('j2');
      expect(running[0].startedAt).toBeDefined();
    });

    it('respects maxConcurrent limit', () => {
      const config: QueueConfig = { maxQueueSize: 50, maxConcurrent: 2 };
      let q = queue;
      for (let i = 0; i < 5; i++) {
        const [nq] = enqueueJob(q, makeJob({ id: `j${i}` }), 'normal', 'm1', config);
        q = nq;
      }
      const promoted = promoteNextJobs(q, config);
      const running = promoted.filter((j) => j.state === 'running');
      expect(running).toHaveLength(2);
    });

    it('does not promote when slots are full', () => {
      const [q1] = enqueueJob(queue, makeJob({ id: 'j1' }), 'normal', 'm1');
      const [q2] = enqueueJob(q1, makeJob({ id: 'j2' }), 'normal', 'm1');
      const q3 = promoteNextJobs(q2); // promotes j1
      const q4 = promoteNextJobs(q3); // no slots available (maxConcurrent = 1)

      const running = q4.filter((j) => j.state === 'running');
      expect(running).toHaveLength(1);
    });
  });

  describe('completeJob', () => {
    it('transitions a running job to completed', () => {
      const [q1] = enqueueJob(queue, makeJob({ id: 'j1' }), 'normal', 'm1');
      const q2 = promoteNextJobs(q1);
      const q3 = completeJob(q2, 'j1');

      expect(q3[0].state).toBe('completed');
      expect(q3[0].finishedAt).toBeDefined();
    });

    it('does not affect queued jobs', () => {
      const [q1] = enqueueJob(queue, makeJob({ id: 'j1' }), 'normal', 'm1');
      const q2 = completeJob(q1, 'j1');

      expect(q2[0].state).toBe('queued');
    });
  });

  describe('failJob', () => {
    it('marks a running job as failed with error message', () => {
      const [q1] = enqueueJob(queue, makeJob({ id: 'j1' }), 'normal', 'm1');
      const q2 = promoteNextJobs(q1);
      const q3 = failJob(q2, 'j1', 'Spindle overload');

      expect(q3[0].state).toBe('failed');
      expect(q3[0].errorMessage).toBe('Spindle overload');
      expect(q3[0].finishedAt).toBeDefined();
    });
  });

  describe('reprioritiseJob', () => {
    it('changes priority and recomputes positions', () => {
      const [q1] = enqueueJob(queue, makeJob({ id: 'j1' }), 'low', 'm1');
      const [q2] = enqueueJob(q1, makeJob({ id: 'j2' }), 'normal', 'm1');
      const q3 = reprioritiseJob(q2, 'j1', 'urgent');

      const j1 = q3.find((j) => j.job.id === 'j1');
      expect(j1?.priority).toBe('urgent');
      expect(j1?.position).toBe(0);
    });

    it('does not change priority of non-queued jobs', () => {
      const [q1] = enqueueJob(queue, makeJob({ id: 'j1' }), 'normal', 'm1');
      const q2 = promoteNextJobs(q1);
      const q3 = reprioritiseJob(q2, 'j1', 'low');

      expect(q3[0].priority).toBe('normal'); // unchanged because running
    });
  });

  describe('getQueueStats', () => {
    it('computes correct statistics for mixed queue', () => {
      const q = queue;
      const [q1] = enqueueJob(q, makeJob({ id: 'j1', totalTimeSec: 60 }), 'normal', 'm1');
      const [q2] = enqueueJob(q1, makeJob({ id: 'j2', totalTimeSec: 90 }), 'normal', 'm1');
      const [q3] = enqueueJob(q2, makeJob({ id: 'j3', totalTimeSec: 30 }), 'low', 'm1');
      const q4 = promoteNextJobs(q3);
      const q5 = completeJob(q4, 'j1');

      const stats = getQueueStats(q5);
      expect(stats.total).toBe(3);
      expect(stats.completed).toBe(1);
      expect(stats.queued).toBe(2);
      expect(stats.running).toBe(0);
      expect(stats.estimatedRemainingTimeSec).toBe(120); // 90 + 30
      expect(stats.utilisation).toBe(0);
    });

    it('returns zero utilisation when maxConcurrent is 0', () => {
      const stats = getQueueStats(queue, { maxQueueSize: 50, maxConcurrent: 0 });
      expect(stats.utilisation).toBe(0);
    });
  });

  describe('getJobsByMachine', () => {
    it('filters jobs by target machine', () => {
      const q = queue;
      const [q1] = enqueueJob(q, makeJob({ id: 'j1' }), 'normal', 'machine-A');
      const [q2] = enqueueJob(q1, makeJob({ id: 'j2' }), 'normal', 'machine-B');
      const [q3] = enqueueJob(q2, makeJob({ id: 'j3' }), 'normal', 'machine-A');

      const machineAJobs = getJobsByMachine(q3, 'machine-A');
      expect(machineAJobs).toHaveLength(2);
      expect(machineAJobs.every((j) => j.targetMachineId === 'machine-A')).toBe(true);
    });
  });

  describe('purgeFinishedJobs', () => {
    it('removes completed, failed, and cancelled jobs', () => {
      const q = queue;
      const [q1] = enqueueJob(q, makeJob({ id: 'j1' }), 'normal', 'm1');
      const [q2] = enqueueJob(q1, makeJob({ id: 'j2' }), 'normal', 'm1');
      const [q3] = enqueueJob(q2, makeJob({ id: 'j3' }), 'normal', 'm1');
      const q4 = promoteNextJobs(q3);
      const q5 = completeJob(q4, 'j1');
      const q6 = cancelJob(q5, 'j2');
      const q7 = purgeFinishedJobs(q6);

      expect(q7).toHaveLength(1);
      expect(q7[0].job.id).toBe('j3');
      expect(q7[0].position).toBe(0);
    });
  });

  describe('DEFAULT_QUEUE_CONFIG', () => {
    it('has sensible defaults', () => {
      expect(DEFAULT_QUEUE_CONFIG.maxQueueSize).toBe(50);
      expect(DEFAULT_QUEUE_CONFIG.maxConcurrent).toBe(1);
    });
  });
});
