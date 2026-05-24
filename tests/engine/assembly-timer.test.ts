import { describe, it, expect } from 'vitest';
import { estimateStepTime, estimateAssemblyTime, getActionRate } from '../../src/engine/assembly-timer';
import type { TimerStep } from '../../src/engine/assembly-timer';

function step(action: TimerStep['action'], count: number): TimerStep {
  return { id: `${action}-1`, action, count };
}

describe('estimateStepTime — screw', () => {
  it('returns 1 min per screw with no overhead', () => {
    const timed = estimateStepTime(step('screw', 4));
    expect(timed.estimatedMinutes).toBe(4); // 4 × 1 min
  });
});

describe('estimateStepTime — dado-route', () => {
  it('includes setup overhead', () => {
    const timed = estimateStepTime(step('dado-route', 2));
    // 10 (setup) + 2 × 4 = 18
    expect(timed.estimatedMinutes).toBe(18);
  });
});

describe('estimateStepTime — pocket-screw', () => {
  it('includes setup overhead', () => {
    const timed = estimateStepTime(step('pocket-screw', 3));
    // 5 (setup) + 3 × 2 = 11
    expect(timed.estimatedMinutes).toBe(11);
  });
});

describe('estimateStepTime — count clamped to min 1', () => {
  it('uses at least 1 operation even when count is 0', () => {
    const timed = estimateStepTime(step('screw', 0));
    expect(timed.estimatedMinutes).toBeGreaterThanOrEqual(1);
  });
});

describe('estimateStepTime — custom description', () => {
  it('uses custom description as label', () => {
    const s: TimerStep = {
      id: 'x',
      action: 'install-hinge',
      count: 2,
      description: { en: 'Soft-close hinges', he: 'ציריות סגירה-רכה' },
    };
    const timed = estimateStepTime(s);
    expect(timed.label.en).toBe('Soft-close hinges');
  });
});

describe('estimateAssemblyTime', () => {
  it('sums all step times', () => {
    const result = estimateAssemblyTime([
      step('screw', 4), // 4 min
      step('install-hinge', 2), // 10 min
      step('edge-band', 3), // 9 min
    ]);
    expect(result.totalMinutes).toBe(23);
  });

  it('formats under 60 minutes as "Xm"', () => {
    const result = estimateAssemblyTime([step('screw', 4)]);
    expect(result.totalFormatted).toMatch(/^\d+m$/);
  });

  it('formats 60+ minutes as "Xh Ym"', () => {
    // build a large enough step list
    const result = estimateAssemblyTime([
      step('dado-route', 10), // 10 + 40 = 50
      step('glue-up', 5), // 25 → total 75
    ]);
    expect(result.totalMinutes).toBeGreaterThanOrEqual(60);
    expect(result.totalFormatted).toMatch(/^\d+h \d+m$/);
  });

  it('returns 0 total for empty step list', () => {
    const result = estimateAssemblyTime([]);
    expect(result.totalMinutes).toBe(0);
    expect(result.totalFormatted).toBe('0m');
  });

  it('returns all timed steps', () => {
    const result = estimateAssemblyTime([step('sand-face', 3), step('edge-band', 2)]);
    expect(result.steps).toHaveLength(2);
  });
});

describe('getActionRate', () => {
  it('returns the per-operation rate for each action', () => {
    expect(getActionRate('screw')).toBe(1);
    expect(getActionRate('install-drawer-runner')).toBe(8);
  });
});
