import { describe, it, expect } from 'vitest';

import {
  getSkillMultiplier,
  getBaseMinutes,
  estimateTaskTime,
  estimateProjectTime,
} from '../../src/engine/time-estimator';
import type { ProjectTask } from '../../src/engine/time-estimator';

describe('getSkillMultiplier', () => {
  it.each([
    ['beginner', 1.8],
    ['intermediate', 1.0],
    ['expert', 0.7],
  ] as const)('returns %f for %s', (skill, expected) => {
    expect(getSkillMultiplier(skill)).toBe(expected);
  });
});

describe('getBaseMinutes', () => {
  it.each([
    ['cutting', 5],
    ['edgeBanding', 8],
    ['drilling', 3],
    ['assembly', 15],
    ['sanding', 10],
    ['finishing', 12],
    ['hardware', 6],
  ] as const)('returns %d minutes for %s', (op, expected) => {
    expect(getBaseMinutes(op)).toBe(expected);
  });
});

describe('estimateTaskTime', () => {
  it('computes base minutes as operation time × quantity', () => {
    const task: ProjectTask = {
      id: 't1',
      operation: 'cutting',
      quantity: 4,
      dependsOn: [],
    };
    const result = estimateTaskTime(task, 'intermediate');
    expect(result.baseMinutes).toBe(20); // 5 × 4
    expect(result.adjustedMinutes).toBe(20); // ×1.0
    expect(result.isParallel).toBe(true);
  });

  it('applies skill multiplier correctly', () => {
    const task: ProjectTask = {
      id: 't1',
      operation: 'assembly',
      quantity: 2,
      dependsOn: ['t0'],
    };
    const result = estimateTaskTime(task, 'beginner');
    expect(result.baseMinutes).toBe(30); // 15 × 2
    expect(result.adjustedMinutes).toBe(54); // 30 × 1.8
    expect(result.isParallel).toBe(false);
  });

  it('marks tasks with dependencies as non-parallel', () => {
    const task: ProjectTask = {
      id: 't2',
      operation: 'sanding',
      quantity: 1,
      dependsOn: ['t1'],
    };
    const result = estimateTaskTime(task, 'expert');
    expect(result.isParallel).toBe(false);
  });
});

describe('estimateProjectTime', () => {
  it('throws on empty tasks', () => {
    expect(() => estimateProjectTime([])).toThrow(RangeError);
  });

  it('computes total minutes as sum of all adjusted task times', () => {
    const tasks: ProjectTask[] = [
      { id: 'cut', operation: 'cutting', quantity: 4, dependsOn: [] },
      { id: 'sand', operation: 'sanding', quantity: 4, dependsOn: [] },
    ];
    const result = estimateProjectTime(tasks, 'intermediate');
    // cutting: 5×4=20, sanding: 10×4=40, total=60
    expect(result.totalMinutes).toBe(60);
    expect(result.totalHours).toBe(1);
  });

  it('computes critical path through dependency chain', () => {
    const tasks: ProjectTask[] = [
      { id: 'cut', operation: 'cutting', quantity: 2, dependsOn: [] },
      { id: 'sand', operation: 'sanding', quantity: 2, dependsOn: ['cut'] },
      { id: 'finish', operation: 'finishing', quantity: 2, dependsOn: ['sand'] },
    ];
    const result = estimateProjectTime(tasks, 'intermediate');
    // cut: 10, sand: 20, finish: 24 → critical path = 10+20+24 = 54
    expect(result.criticalPathMinutes).toBe(54);
  });

  it('critical path is shorter than total when tasks are parallel', () => {
    const tasks: ProjectTask[] = [
      { id: 'cut', operation: 'cutting', quantity: 4, dependsOn: [] },
      { id: 'drill', operation: 'drilling', quantity: 4, dependsOn: [] },
      { id: 'assemble', operation: 'assembly', quantity: 2, dependsOn: ['cut', 'drill'] },
    ];
    const result = estimateProjectTime(tasks, 'intermediate');
    // cut: 20, drill: 12, assemble: 30
    // total: 62
    // critical path: max(20,12) + 30 = 50
    expect(result.totalMinutes).toBe(62);
    expect(result.criticalPathMinutes).toBe(50);
    expect(result.criticalPathMinutes).toBeLessThan(result.totalMinutes);
  });

  it('counts parallel and sequential tasks', () => {
    const tasks: ProjectTask[] = [
      { id: 'a', operation: 'cutting', quantity: 1, dependsOn: [] },
      { id: 'b', operation: 'drilling', quantity: 1, dependsOn: [] },
      { id: 'c', operation: 'assembly', quantity: 1, dependsOn: ['a', 'b'] },
    ];
    const result = estimateProjectTime(tasks);
    expect(result.parallelTasks).toBe(2);
    expect(result.sequentialTasks).toBe(1);
  });

  it('applies expert multiplier to reduce time', () => {
    const tasks: ProjectTask[] = [{ id: 'cut', operation: 'cutting', quantity: 10, dependsOn: [] }];
    const expert = estimateProjectTime(tasks, 'expert');
    const beginner = estimateProjectTime(tasks, 'beginner');
    expect(expert.totalMinutes).toBeLessThan(beginner.totalMinutes);
    expect(expert.skillMultiplier).toBe(0.7);
    expect(beginner.skillMultiplier).toBe(1.8);
  });

  it('returns correct totalHours rounding', () => {
    const tasks: ProjectTask[] = [{ id: 'a', operation: 'cutting', quantity: 7, dependsOn: [] }];
    const result = estimateProjectTime(tasks, 'intermediate');
    // 5×7=35 minutes = 0.583... hours → 0.58
    expect(result.totalHours).toBe(0.58);
  });
});
