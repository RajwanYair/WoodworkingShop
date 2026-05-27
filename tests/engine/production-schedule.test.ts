import { describe, it, expect } from 'vitest';
import {
  createSchedule,
  addTask,
  computeSchedule,
  detectConflicts,
  getScheduleMetrics,
  crashTask,
  MAX_TASKS,
  MAX_RESOURCES,
} from '../../src/engine/production-schedule';
import type { WorkshopResource, ScheduleTask } from '../../src/engine/production-schedule';

// ─── Helpers ──────────────────────────────────────────────────────────────────

let idCounter = 0;
const testIdGen = () => `test-${++idCounter}`;

function makeResource(overrides: Partial<WorkshopResource> = {}): WorkshopResource {
  return {
    id: 'res-1',
    name: 'Table Saw',
    kind: 'machine',
    hoursPerDay: 8,
    availableDays: [1, 2, 3, 4, 5],
    ...overrides,
  };
}

function makeTask(overrides: Partial<ScheduleTask> = {}): ScheduleTask {
  return {
    id: `task-${++idCounter}`,
    name: 'Cut panels',
    projectId: 'proj-1',
    durationHours: 4,
    dependencies: [],
    requiredResources: ['res-1'],
    status: 'pending',
    isMilestone: false,
    priority: 1,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('production-schedule', () => {
  describe('createSchedule', () => {
    it('creates a schedule with name and resources', () => {
      const res = makeResource();
      const schedule = createSchedule('Kitchen Project', [res], testIdGen);

      expect(schedule.name).toBe('Kitchen Project');
      expect(schedule.resources).toHaveLength(1);
      expect(schedule.tasks).toHaveLength(0);
      expect(schedule.slots).toHaveLength(0);
      expect(schedule.totalDays).toBe(0);
      expect(schedule.criticalPath).toHaveLength(0);
    });

    it.each([
      { name: '', desc: 'empty string' },
      { name: '   ', desc: 'whitespace only' },
    ])('rejects $desc name', ({ name }) => {
      expect(() => createSchedule(name, [], testIdGen)).toThrow(RangeError);
    });

    it('rejects more than MAX_RESOURCES', () => {
      const resources = Array.from({ length: MAX_RESOURCES + 1 }, (_, i) => makeResource({ id: `res-${i}` }));
      expect(() => createSchedule('Big', resources, testIdGen)).toThrow(RangeError);
    });
  });

  describe('addTask', () => {
    it('adds a task to the schedule', () => {
      const schedule = createSchedule('Test', [makeResource()], testIdGen);
      const task = makeTask({ id: 'task-A' });
      const updated = addTask(schedule, task);

      expect(updated.tasks).toHaveLength(1);
      expect(updated.tasks[0].id).toBe('task-A');
    });

    it('rejects duplicate task IDs', () => {
      const schedule = createSchedule('Test', [makeResource()], testIdGen);
      const task = makeTask({ id: 'dup' });
      const updated = addTask(schedule, task);

      expect(() => addTask(updated, makeTask({ id: 'dup' }))).toThrow(RangeError);
    });

    it('rejects tasks with missing dependencies', () => {
      const schedule = createSchedule('Test', [makeResource()], testIdGen);
      const task = makeTask({ id: 'task-B', dependencies: ['nonexistent'] });

      expect(() => addTask(schedule, task)).toThrow(RangeError);
    });

    it('rejects exceeding MAX_TASKS', () => {
      let schedule = createSchedule('Test', [makeResource()], testIdGen);
      for (let i = 0; i < MAX_TASKS; i++) {
        schedule = addTask(schedule, makeTask({ id: `t-${i}` }));
      }
      expect(() => addTask(schedule, makeTask({ id: 'overflow' }))).toThrow(RangeError);
    });
  });

  describe('computeSchedule', () => {
    it('returns zero span for empty schedule', () => {
      const schedule = createSchedule('Empty', [makeResource()], testIdGen);
      const computed = computeSchedule(schedule);

      expect(computed.totalDays).toBe(0);
      expect(computed.slots).toHaveLength(0);
      expect(computed.criticalPath).toHaveLength(0);
    });

    it('schedules independent tasks in parallel', () => {
      const res = makeResource({ id: 'saw' });
      let schedule = createSchedule('Parallel', [res], testIdGen);
      schedule = addTask(schedule, makeTask({ id: 'a', durationHours: 4, requiredResources: [] }));
      schedule = addTask(schedule, makeTask({ id: 'b', durationHours: 4, requiredResources: [] }));

      const computed = computeSchedule(schedule);
      const slotA = computed.slots.find((s) => s.taskId === 'a')!;
      const slotB = computed.slots.find((s) => s.taskId === 'b')!;

      // Both start at day 0 since no dependencies
      expect(slotA.startDay).toBe(0);
      expect(slotB.startDay).toBe(0);
    });

    it('respects dependencies', () => {
      const res = makeResource({ id: 'r1', hoursPerDay: 8 });
      let schedule = createSchedule('Sequential', [res], testIdGen);
      schedule = addTask(schedule, makeTask({ id: 'cut', durationHours: 8 }));
      schedule = addTask(schedule, makeTask({ id: 'edge', durationHours: 8, dependencies: ['cut'] }));
      schedule = addTask(schedule, makeTask({ id: 'assemble', durationHours: 8, dependencies: ['edge'] }));

      const computed = computeSchedule(schedule);
      const slotCut = computed.slots.find((s) => s.taskId === 'cut')!;
      const slotEdge = computed.slots.find((s) => s.taskId === 'edge')!;
      const slotAssemble = computed.slots.find((s) => s.taskId === 'assemble')!;

      expect(slotCut.startDay).toBe(0);
      expect(slotEdge.startDay).toBeGreaterThanOrEqual(slotCut.endDay);
      expect(slotAssemble.startDay).toBeGreaterThanOrEqual(slotEdge.endDay);
    });

    it('computes critical path', () => {
      const res = makeResource({ id: 'r1' });
      let schedule = createSchedule('Critical', [res], testIdGen);
      schedule = addTask(schedule, makeTask({ id: 'a', durationHours: 16 }));
      schedule = addTask(schedule, makeTask({ id: 'b', durationHours: 4, dependencies: ['a'] }));
      // Short parallel path
      schedule = addTask(schedule, makeTask({ id: 'c', durationHours: 2 }));

      const computed = computeSchedule(schedule);

      expect(computed.criticalPath).toContain('a');
      expect(computed.criticalPath).toContain('b');
    });

    it('handles milestones (zero duration)', () => {
      const res = makeResource({ id: 'r1' });
      let schedule = createSchedule('Milestones', [res], testIdGen);
      schedule = addTask(schedule, makeTask({ id: 'work', durationHours: 8 }));
      schedule = addTask(
        schedule,
        makeTask({ id: 'milestone', durationHours: 0, isMilestone: true, dependencies: ['work'] }),
      );

      const computed = computeSchedule(schedule);
      const msSlot = computed.slots.find((s) => s.taskId === 'milestone')!;

      expect(msSlot.startDay).toBe(msSlot.endDay);
    });
  });

  describe('detectConflicts', () => {
    it('returns empty for non-conflicting schedule', () => {
      const res = makeResource({ id: 'r1' });
      let schedule = createSchedule('No conflicts', [res], testIdGen);
      schedule = addTask(schedule, makeTask({ id: 't1', durationHours: 4, requiredResources: [] }));
      const computed = computeSchedule(schedule);

      expect(detectConflicts(computed)).toHaveLength(0);
    });

    it('detects over-allocation on same resource and day', () => {
      const res = makeResource({ id: 'saw', hoursPerDay: 8 });
      let schedule = createSchedule('Conflict', [res], testIdGen);
      schedule = addTask(schedule, makeTask({ id: 't1', durationHours: 8, requiredResources: ['saw'] }));
      schedule = addTask(schedule, makeTask({ id: 't2', durationHours: 8, requiredResources: ['saw'] }));

      const computed = computeSchedule(schedule);
      const conflicts = detectConflicts(computed);

      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].resourceId).toBe('saw');
    });
  });

  describe('getScheduleMetrics', () => {
    it('computes correct metrics', () => {
      const res = makeResource({ id: 'r1', hoursPerDay: 8 });
      let schedule = createSchedule('Metrics', [res], testIdGen);
      schedule = addTask(schedule, makeTask({ id: 't1', durationHours: 8 }));
      schedule = addTask(schedule, makeTask({ id: 'ms', durationHours: 0, isMilestone: true, dependencies: ['t1'] }));
      const computed = computeSchedule(schedule);

      const metrics = getScheduleMetrics(computed);

      expect(metrics.totalTasks).toBe(2);
      expect(metrics.milestones).toBe(1);
      expect(metrics.spanDays).toBeGreaterThanOrEqual(1);
      expect(metrics.totalWorkHours).toBe(8);
    });
  });

  describe('crashTask', () => {
    it('reduces duration and recomputes', () => {
      const res = makeResource({ id: 'r1' });
      let schedule = createSchedule('Crash', [res], testIdGen);
      schedule = addTask(schedule, makeTask({ id: 'long', durationHours: 16 }));
      schedule = addTask(schedule, makeTask({ id: 'after', durationHours: 8, dependencies: ['long'] }));
      const computed = computeSchedule(schedule);
      const crashed = crashTask(computed, 'long', 8);

      expect(crashed.totalDays).toBeLessThanOrEqual(computed.totalDays);
    });

    it('rejects negative duration', () => {
      const schedule = createSchedule('Neg', [makeResource()], testIdGen);
      expect(() => crashTask(schedule, 'x', -1)).toThrow(RangeError);
    });

    it('rejects non-existent task', () => {
      const schedule = createSchedule('Missing', [makeResource()], testIdGen);
      expect(() => crashTask(schedule, 'ghost', 4)).toThrow(RangeError);
    });
  });
});
