/**
 * Assembly step DAG scheduler — Sprint 25 tests
 */
import { describe, it, expect } from 'vitest';
import type { AssemblyStep } from '../../src/engine/assembly';
import {
  validateDAG,
  topologicalSort,
  scheduleWaves,
  criticalPath,
  dependents,
} from '../../src/engine/assembly-dag';

// ── Test factory ──────────────────────────────────────────────────────────────

function makeStep(
  num: number,
  deps: string[] = [],
  mins = 10,
): AssemblyStep {
  return {
    stepNumber: num,
    id: `step-${num}`,
    title: { en: `Step ${num}`, he: `שלב ${num}` },
    description: { en: `Do step ${num}`, he: `בצע שלב ${num}` },
    parts: [],
    icon: '🔧',
    riskLevel: 'low',
    estimatedMinutes: mins,
    dependencies: deps,
    parallel: false,
  };
}

// simple 3-node chain: 1 → 2 → 3
const chain = [makeStep(1), makeStep(2, ['step-1']), makeStep(3, ['step-2'])];

// diamond: 1 → 2, 1 → 3, {2,3} → 4
const diamond = [
  makeStep(1),
  makeStep(2, ['step-1']),
  makeStep(3, ['step-1']),
  makeStep(4, ['step-2', 'step-3']),
];

// ── validateDAG ───────────────────────────────────────────────────────────────

describe('validateDAG', () => {
  it('valid chain passes', () => {
    expect(validateDAG(chain).valid).toBe(true);
  });

  it('detects missing dependency', () => {
    const broken = [makeStep(1, ['step-99'])];
    const r = validateDAG(broken);
    expect(r.valid).toBe(false);
    expect(r.missingDeps).toContain('step-99');
  });

  it('detects a 2-node cycle', () => {
    const cyclic = [
      makeStep(1, ['step-2']),
      makeStep(2, ['step-1']),
    ];
    const r = validateDAG(cyclic);
    expect(r.valid).toBe(false);
    expect(r.cyclicIds.length).toBeGreaterThan(0);
  });

  it('empty step list is valid', () => {
    expect(validateDAG([]).valid).toBe(true);
  });

  it('diamond passes validation', () => {
    expect(validateDAG(diamond).valid).toBe(true);
  });
});

// ── topologicalSort ───────────────────────────────────────────────────────────

describe('topologicalSort', () => {
  it('returns empty array for empty input', () => {
    expect(topologicalSort([])).toHaveLength(0);
  });

  it('sorts chain in dependency order', () => {
    const sorted = topologicalSort([...chain].reverse()); // pass in reverse
    expect(sorted.map((s) => s.id)).toEqual(['step-1', 'step-2', 'step-3']);
  });

  it('step-1 precedes step-2 and step-3 in diamond', () => {
    const sorted = topologicalSort(diamond);
    const idx = (id: string) => sorted.findIndex((s) => s.id === id);
    expect(idx('step-1')).toBeLessThan(idx('step-2'));
    expect(idx('step-1')).toBeLessThan(idx('step-3'));
    expect(idx('step-2')).toBeLessThan(idx('step-4'));
    expect(idx('step-3')).toBeLessThan(idx('step-4'));
  });

  it('throws on cyclic graph', () => {
    const cyclic = [makeStep(1, ['step-2']), makeStep(2, ['step-1'])];
    expect(() => topologicalSort(cyclic)).toThrow(/cycle/i);
  });

  it('single node', () => {
    const sorted = topologicalSort([makeStep(5)]);
    expect(sorted[0]!.id).toBe('step-5');
  });
});

// ── scheduleWaves ─────────────────────────────────────────────────────────────

describe('scheduleWaves', () => {
  it('returns empty result for empty input', () => {
    const r = scheduleWaves([]);
    expect(r.waves).toHaveLength(0);
    expect(r.totalMinutes).toBe(0);
    expect(r.criticalPath).toHaveLength(0);
  });

  it('chain produces 3 waves of 1 step each', () => {
    const r = scheduleWaves(chain);
    expect(r.waves).toHaveLength(3);
    expect(r.waves[0]).toHaveLength(1);
    expect(r.waves[1]).toHaveLength(1);
    expect(r.waves[2]).toHaveLength(1);
  });

  it('diamond wave 1 contains steps 2 and 3 (parallel)', () => {
    const r = scheduleWaves(diamond);
    // wave 0: step-1, wave 1: step-2 + step-3, wave 2: step-4
    expect(r.waves[0]).toHaveLength(1);
    const wave1Ids = r.waves[1]!.map((s) => s.id).sort();
    expect(wave1Ids).toEqual(['step-2', 'step-3']);
    expect(r.waves[2]).toHaveLength(1);
  });

  it('totalMinutes is sum of wave durations', () => {
    // chain: 3 waves × 10 min each = 30
    const r = scheduleWaves(chain);
    expect(r.totalMinutes).toBe(30);
  });

  it('totalMinutes respects max within wave (parallel)', () => {
    const steps = [
      makeStep(1, [], 5),
      makeStep(2, ['step-1'], 20),
      makeStep(3, ['step-1'], 10), // same wave as 2 → max is 20
    ];
    const r = scheduleWaves(steps);
    // wave 0 = 5 min, wave 1 = max(20,10) = 20 min → total 25
    expect(r.totalMinutes).toBe(25);
  });

  it('critical path for chain is all 3 steps', () => {
    const r = scheduleWaves(chain);
    expect(r.criticalPath.map((s) => s.id)).toEqual(['step-1', 'step-2', 'step-3']);
  });

  it('critical path for diamond follows the heavier branch', () => {
    const heavy = [
      makeStep(1, [], 5),
      makeStep(2, ['step-1'], 1),   // light branch
      makeStep(3, ['step-1'], 20),  // heavy branch
      makeStep(4, ['step-2', 'step-3'], 5),
    ];
    const r = scheduleWaves(heavy);
    const cp = r.criticalPath.map((s) => s.id);
    // Critical path: 1 (5) → 3 (20) → 4 (5) = 30 vs 1→2→4 = 11
    expect(cp).toContain('step-3');
    expect(cp).not.toContain('step-2');
  });
});

// ── criticalPath helper ───────────────────────────────────────────────────────

describe('criticalPath', () => {
  it('returns same critical path as scheduleWaves', () => {
    const cp = criticalPath(chain);
    expect(cp.map((s) => s.id)).toEqual(['step-1', 'step-2', 'step-3']);
  });
});

// ── dependents ────────────────────────────────────────────────────────────────

describe('dependents', () => {
  it('returns all downstream steps in chain', () => {
    const deps = dependents(chain, 'step-1');
    const ids = deps.map((s) => s.id).sort();
    expect(ids).toEqual(['step-2', 'step-3']);
  });

  it('returns direct successor only for middle step', () => {
    const deps = dependents(chain, 'step-2');
    expect(deps.map((s) => s.id)).toEqual(['step-3']);
  });

  it('returns empty for leaf step', () => {
    expect(dependents(chain, 'step-3')).toHaveLength(0);
  });

  it('diamond: dependents of step-1 includes 2, 3, 4', () => {
    const ids = dependents(diamond, 'step-1').map((s) => s.id).sort();
    expect(ids).toEqual(['step-2', 'step-3', 'step-4']);
  });
});
