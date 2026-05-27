import { describe, it, expect } from 'vitest';

import {
  generateMaintenanceSchedule,
  computeHealthScore,
  getMostUrgentPerTool,
} from '../../src/engine/maintenance-scheduler';
import type { MaintenanceRule, ToolUsageState, MaintenanceEvent } from '../../src/engine/maintenance-scheduler';

function rule(overrides: Partial<MaintenanceRule> & { id: string; toolId: string }): MaintenanceRule {
  return {
    task: 'General maintenance',
    interval: 100,
    unit: 'hours',
    priority: 'normal',
    ...overrides,
  };
}

function state(toolId: string, overrides: Partial<Omit<ToolUsageState, 'toolId'>> = {}): ToolUsageState {
  return {
    toolId,
    totalHours: 0,
    totalDays: 0,
    totalCuts: 0,
    sinceLastMaintenance: {},
    ...overrides,
  };
}

describe('generateMaintenanceSchedule', () => {
  it('throws on empty rules array', () => {
    expect(() => generateMaintenanceSchedule([], [])).toThrow(RangeError);
  });

  it('throws when rule references missing tool state', () => {
    const rules = [rule({ id: 'r1', toolId: 'saw' })];
    expect(() => generateMaintenanceSchedule(rules, [])).toThrow(/no usage state for tool "saw"/);
  });

  it('marks event as upcoming when well below interval', () => {
    const rules = [rule({ id: 'r1', toolId: 'saw', interval: 100, unit: 'hours' })];
    const states = [state('saw', { totalHours: 30, sinceLastMaintenance: { r1: 30 } })];
    const result = generateMaintenanceSchedule(rules, states);

    expect(result.events).toHaveLength(1);
    expect(result.events[0].status).toBe('upcoming');
    expect(result.events[0].remaining).toBe(70);
  });

  it('marks event as due when at 90%+ of interval', () => {
    const rules = [rule({ id: 'r1', toolId: 'saw', interval: 100, unit: 'hours' })];
    const states = [state('saw', { sinceLastMaintenance: { r1: 95 } })];
    const result = generateMaintenanceSchedule(rules, states);

    expect(result.events[0].status).toBe('due');
    expect(result.due).toHaveLength(1);
  });

  it('marks event as overdue when past interval', () => {
    const rules = [rule({ id: 'r1', toolId: 'saw', interval: 100, unit: 'hours' })];
    const states = [state('saw', { sinceLastMaintenance: { r1: 120 } })];
    const result = generateMaintenanceSchedule(rules, states);

    expect(result.events[0].status).toBe('overdue');
    expect(result.events[0].remaining).toBe(-20);
    expect(result.overdue).toHaveLength(1);
  });

  it('uses total usage as fallback when sinceLastMaintenance missing', () => {
    const rules = [rule({ id: 'r1', toolId: 'saw', interval: 50, unit: 'cuts' })];
    const states = [state('saw', { totalCuts: 60 })];
    const result = generateMaintenanceSchedule(rules, states);

    expect(result.events[0].status).toBe('overdue');
    expect(result.events[0].percentElapsed).toBe(120);
  });

  it('handles days interval unit', () => {
    const rules = [rule({ id: 'r1', toolId: 'drill', interval: 30, unit: 'days' })];
    const states = [state('drill', { totalDays: 25, sinceLastMaintenance: { r1: 25 } })];
    const result = generateMaintenanceSchedule(rules, states);

    expect(result.events[0].percentElapsed).toBeCloseTo(83.33, 1);
    expect(result.events[0].status).toBe('upcoming');
  });

  it('sorts events by urgency: overdue → due → upcoming', () => {
    const rules = [
      rule({ id: 'r1', toolId: 'saw', interval: 100, priority: 'normal' }),
      rule({ id: 'r2', toolId: 'drill', interval: 50, priority: 'high' }),
      rule({ id: 'r3', toolId: 'router', interval: 200, priority: 'low' }),
    ];
    const states = [
      state('saw', { sinceLastMaintenance: { r1: 150 } }), // overdue
      state('drill', { sinceLastMaintenance: { r2: 47 } }), // due (94%)
      state('router', { sinceLastMaintenance: { r3: 50 } }), // upcoming (25%)
    ];
    const result = generateMaintenanceSchedule(rules, states);

    expect(result.events[0].status).toBe('overdue');
    expect(result.events[1].status).toBe('due');
    expect(result.events[2].status).toBe('upcoming');
  });

  it('handles multiple rules per tool', () => {
    const rules = [
      rule({ id: 'blade-change', toolId: 'saw', interval: 200, unit: 'cuts' }),
      rule({ id: 'belt-check', toolId: 'saw', interval: 50, unit: 'hours' }),
    ];
    const states = [state('saw', { sinceLastMaintenance: { 'blade-change': 100, 'belt-check': 48 } })];
    const result = generateMaintenanceSchedule(rules, states);

    expect(result.events).toHaveLength(2);
    expect(result.totalRules).toBe(2);
  });
});

describe('computeHealthScore', () => {
  it('returns 100 when no events', () => {
    expect(computeHealthScore([])).toBe(100);
  });

  it('returns 100 when all events are upcoming', () => {
    const events: MaintenanceEvent[] = [
      {
        rule: rule({ id: 'r1', toolId: 'saw' }),
        status: 'upcoming',
        remaining: 50,
        percentElapsed: 50,
      },
    ];
    expect(computeHealthScore(events)).toBe(100);
  });

  it('penalizes overdue events by priority weight', () => {
    const events: MaintenanceEvent[] = [
      {
        rule: rule({ id: 'r1', toolId: 'saw', priority: 'critical' }),
        status: 'overdue',
        remaining: -20,
        percentElapsed: 120,
      },
    ];
    // Critical penalty = 30
    expect(computeHealthScore(events)).toBe(70);
  });

  it('penalizes due events at half weight', () => {
    const events: MaintenanceEvent[] = [
      {
        rule: rule({ id: 'r1', toolId: 'saw', priority: 'high' }),
        status: 'due',
        remaining: 5,
        percentElapsed: 95,
      },
    ];
    // High due penalty = 20 * 0.5 = 10
    expect(computeHealthScore(events)).toBe(90);
  });

  it('clamps to 0 for many overdue critical items', () => {
    const events: MaintenanceEvent[] = Array.from({ length: 5 }, (_, i) => ({
      rule: rule({ id: `r${i}`, toolId: `t${i}`, priority: 'critical' as const }),
      status: 'overdue' as const,
      remaining: -10,
      percentElapsed: 110,
    }));
    expect(computeHealthScore(events)).toBe(0);
  });
});

describe('getMostUrgentPerTool', () => {
  it('returns one event per tool (most urgent)', () => {
    const rules = [
      rule({ id: 'r1', toolId: 'saw', interval: 100 }),
      rule({ id: 'r2', toolId: 'saw', interval: 50 }),
      rule({ id: 'r3', toolId: 'drill', interval: 80 }),
    ];
    const states = [
      state('saw', { sinceLastMaintenance: { r1: 110, r2: 30 } }),
      state('drill', { sinceLastMaintenance: { r3: 40 } }),
    ];
    const result = generateMaintenanceSchedule(rules, states);
    const urgent = getMostUrgentPerTool(result);

    expect(urgent).toHaveLength(2);
    const toolIds = urgent.map((e) => e.rule.toolId);
    expect(toolIds).toContain('saw');
    expect(toolIds).toContain('drill');
  });
});
