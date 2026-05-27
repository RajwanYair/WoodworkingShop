import { describe, it, expect } from 'vitest';

import { resolveAssemblyDeps, hasCycle, maxParallelism } from '../../src/engine/assembly-dependency';
import type { AssemblyStep } from '../../src/engine/assembly-dependency';

/** Helper: simple linear chain A → B → C */
function linearChain(): AssemblyStep[] {
  return [
    { id: 'A', label: 'Step A', dependsOn: [], duration: 10 },
    { id: 'B', label: 'Step B', dependsOn: ['A'], duration: 5 },
    { id: 'C', label: 'Step C', dependsOn: ['B'], duration: 8 },
  ];
}

/** Helper: diamond dependency A → B, A → C, B+C → D */
function diamondGraph(): AssemblyStep[] {
  return [
    { id: 'A', label: 'Step A', dependsOn: [], duration: 3 },
    { id: 'B', label: 'Step B', dependsOn: ['A'], duration: 7 },
    { id: 'C', label: 'Step C', dependsOn: ['A'], duration: 4 },
    { id: 'D', label: 'Step D', dependsOn: ['B', 'C'], duration: 2 },
  ];
}

describe('resolveAssemblyDeps', () => {
  it('throws on empty steps array', () => {
    expect(() => resolveAssemblyDeps([])).toThrow(RangeError);
  });

  it('throws on duplicate step IDs', () => {
    const steps: AssemblyStep[] = [
      { id: 'X', label: 'First', dependsOn: [], duration: 1 },
      { id: 'X', label: 'Duplicate', dependsOn: [], duration: 2 },
    ];
    expect(() => resolveAssemblyDeps(steps)).toThrow(/duplicate step id/);
  });

  it('throws on unknown dependency reference', () => {
    const steps: AssemblyStep[] = [{ id: 'A', label: 'A', dependsOn: ['Z'], duration: 1 }];
    expect(() => resolveAssemblyDeps(steps)).toThrow(/unknown step "Z"/);
  });

  it('throws on circular dependency', () => {
    const steps: AssemblyStep[] = [
      { id: 'A', label: 'A', dependsOn: ['B'], duration: 1 },
      { id: 'B', label: 'B', dependsOn: ['A'], duration: 1 },
    ];
    expect(() => resolveAssemblyDeps(steps)).toThrow(/circular dependency/);
  });

  it('resolves a single step with no dependencies', () => {
    const steps: AssemblyStep[] = [{ id: 'solo', label: 'Solo', dependsOn: [], duration: 15 }];
    const result = resolveAssemblyDeps(steps);
    expect(result.sorted).toHaveLength(1);
    expect(result.waves).toHaveLength(1);
    expect(result.totalDuration).toBe(15);
    expect(result.criticalPath).toEqual(['solo']);
  });

  it('produces correct topological order for linear chain', () => {
    const result = resolveAssemblyDeps(linearChain());
    const ids = result.sorted.map((s) => s.id);
    expect(ids.indexOf('A')).toBeLessThan(ids.indexOf('B'));
    expect(ids.indexOf('B')).toBeLessThan(ids.indexOf('C'));
  });

  it('computes correct total duration for linear chain', () => {
    const result = resolveAssemblyDeps(linearChain());
    // A=10 + B=5 + C=8 = 23
    expect(result.totalDuration).toBe(23);
  });

  it('identifies full chain as critical path for linear chain', () => {
    const result = resolveAssemblyDeps(linearChain());
    expect(result.criticalPath).toEqual(['A', 'B', 'C']);
  });

  it('groups parallel steps into waves for diamond graph', () => {
    const result = resolveAssemblyDeps(diamondGraph());
    // Wave 0: A, Wave 1: B and C (parallel), Wave 2: D
    expect(result.waves).toHaveLength(3);
    expect(result.waves[0].map((s) => s.id)).toEqual(['A']);
    expect(result.waves[1].map((s) => s.id).sort()).toEqual(['B', 'C']);
    expect(result.waves[2].map((s) => s.id)).toEqual(['D']);
  });

  it('computes critical path through longest branch of diamond', () => {
    const result = resolveAssemblyDeps(diamondGraph());
    // A(3) → B(7) → D(2) = 12 vs A(3) → C(4) → D(2) = 9
    expect(result.totalDuration).toBe(12);
    expect(result.criticalPath).toContain('A');
    expect(result.criticalPath).toContain('B');
    expect(result.criticalPath).toContain('D');
    expect(result.criticalPath).not.toContain('C');
  });

  it('computes correct slack for non-critical steps', () => {
    const result = resolveAssemblyDeps(diamondGraph());
    const cSchedule = result.schedule.find((s) => s.step.id === 'C')!;
    // C slack = 12 - (3 + 4 + 2) = 3
    expect(cSchedule.slack).toBe(3);
    expect(cSchedule.isCritical).toBe(false);
  });

  it('handles multiple independent roots', () => {
    const steps: AssemblyStep[] = [
      { id: 'X', label: 'X', dependsOn: [], duration: 5 },
      { id: 'Y', label: 'Y', dependsOn: [], duration: 10 },
      { id: 'Z', label: 'Z', dependsOn: ['X', 'Y'], duration: 3 },
    ];
    const result = resolveAssemblyDeps(steps);
    expect(result.waves[0].map((s) => s.id).sort()).toEqual(['X', 'Y']);
    expect(result.totalDuration).toBe(13); // Y(10) + Z(3)
  });
});

describe('hasCycle', () => {
  it('throws on empty array', () => {
    expect(() => hasCycle([])).toThrow(RangeError);
  });

  it('returns false for acyclic graph', () => {
    expect(hasCycle(linearChain())).toBe(false);
  });

  it('returns true for cyclic graph', () => {
    const steps: AssemblyStep[] = [
      { id: 'A', label: 'A', dependsOn: ['C'], duration: 1 },
      { id: 'B', label: 'B', dependsOn: ['A'], duration: 1 },
      { id: 'C', label: 'C', dependsOn: ['B'], duration: 1 },
    ];
    expect(hasCycle(steps)).toBe(true);
  });
});

describe('maxParallelism', () => {
  it('returns 1 for linear chain', () => {
    expect(maxParallelism(linearChain())).toBe(1);
  });

  it('returns 2 for diamond graph', () => {
    expect(maxParallelism(diamondGraph())).toBe(2);
  });

  it('returns correct value for wide parallel graph', () => {
    const steps: AssemblyStep[] = [
      { id: 'root', label: 'Root', dependsOn: [], duration: 1 },
      { id: 'a', label: 'A', dependsOn: ['root'], duration: 2 },
      { id: 'b', label: 'B', dependsOn: ['root'], duration: 3 },
      { id: 'c', label: 'C', dependsOn: ['root'], duration: 4 },
      { id: 'd', label: 'D', dependsOn: ['root'], duration: 5 },
    ];
    expect(maxParallelism(steps)).toBe(4);
  });
});
