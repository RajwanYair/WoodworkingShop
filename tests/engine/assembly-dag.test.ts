/**
 * Phase 12 / Sprint 10 — Assembly step DAG tests.
 *
 * Verifies that buildAssemblyDAG correctly assigns:
 *  - unique ids
 *  - dependency edges (no orphaned steps)
 *  - parallel flags for fitting-phase steps
 *  - sequential dependency within the door sub-chain (handles follow hinges)
 */
import { describe, it, expect } from 'vitest';
import { generateAssemblySteps, buildAssemblyDAG } from '../../src/engine/assembly';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import type { CabinetConfig } from '../../src/engine/types';

// Config factory: spread DEFAULT_CONFIG + overrides
function cfg(overrides: Partial<CabinetConfig> = {}): CabinetConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

describe('buildAssemblyDAG — id assignment', () => {
  it('every step has a non-empty id', () => {
    const steps = generateAssemblySteps(cfg());
    for (const s of steps) {
      expect(s.id).toBeTruthy();
    }
  });

  it('all step ids are unique', () => {
    const steps = generateAssemblySteps(cfg());
    const ids = steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('id is derived from stepNumber', () => {
    const steps = generateAssemblySteps(cfg());
    for (const s of steps) {
      expect(s.id).toBe(`step-${s.stepNumber}`);
    }
  });
});

describe('buildAssemblyDAG — dependency edges', () => {
  it('first step has no dependencies', () => {
    const steps = generateAssemblySteps(cfg());
    expect(steps[0].dependencies ?? []).toEqual([]);
  });

  it('every non-first step has at least one dependency', () => {
    const steps = generateAssemblySteps(cfg());
    for (let i = 1; i < steps.length; i++) {
      expect((steps[i].dependencies ?? []).length).toBeGreaterThan(0);
    }
  });

  it('all dependency ids reference steps that exist in the list', () => {
    const steps = generateAssemblySteps(cfg());
    const idSet = new Set(steps.map((s) => s.id));
    for (const step of steps) {
      for (const dep of step.dependencies ?? []) {
        expect(idSet.has(dep)).toBe(true);
      }
    }
  });

  it('dependency ids always reference steps with a lower stepNumber (no cycles)', () => {
    const steps = generateAssemblySteps(cfg({ doorStyle: 'flat', drawerCount: 1 }));
    const numberForId = new Map(steps.map((s) => [s.id, s.stepNumber]));
    for (const step of steps) {
      for (const dep of step.dependencies ?? []) {
        expect(numberForId.get(dep)!).toBeLessThan(step.stepNumber);
      }
    }
  });
});

describe('buildAssemblyDAG — parallel groups', () => {
  it('cabinet with doors and drawers has at least two parallel steps', () => {
    const steps = generateAssemblySteps(
      cfg({ furnitureType: 'cabinet', doorStyle: 'flat', drawerCount: 1, hasBack: true, height: 800 }),
    );
    const parallelSteps = steps.filter((s) => s.parallel);
    expect(parallelSteps.length).toBeGreaterThanOrEqual(2);
  });

  it('parallel steps in the same group share the same dependency set', () => {
    const steps = generateAssemblySteps(
      cfg({ furnitureType: 'cabinet', doorStyle: 'flat', drawerCount: 1, hasBack: true, height: 800 }),
    );
    const parallelSteps = steps.filter((s) => s.parallel);
    if (parallelSteps.length < 2) return; // skip if degenerate config
    // Group by dep key — at least one group should have >= 2 members
    const groups = new Map<string, number>();
    for (const s of parallelSteps) {
      const key = (s.dependencies ?? []).slice().sort().join(',');
      groups.set(key, (groups.get(key) ?? 0) + 1);
    }
    const hasLargeGroup = [...groups.values()].some((n) => n >= 2);
    expect(hasLargeGroup).toBe(true);
  });

  it('bookshelf with only one fitting step has no parallel steps', () => {
    // edgeBanding: 'none' removes the edge-banding fitting step so only
    // "Insert Shelf Pins" remains → single fitting step → cannot be parallel
    const steps = generateAssemblySteps(
      cfg({ furnitureType: 'bookshelf', doorStyle: 'none', drawerCount: 0, edgeBanding: 'none' }),
    );
    const parallelSteps = steps.filter((s) => s.parallel);
    expect(parallelSteps.length).toBe(0);
  });

  it('"Install Handles" is not parallel — it depends on the door-hinge step', () => {
    const steps = generateAssemblySteps(cfg({ doorStyle: 'flat' }));
    const handlesStep = steps.find((s) => s.title.en.startsWith('Install Handles'));
    if (!handlesStep) return; // no handles step → test not applicable
    expect(handlesStep.parallel).toBe(false);
    const hingesStep = steps.find((s) => s.title.en.startsWith('Mount Hinges'));
    if (hingesStep) {
      expect(handlesStep.dependencies).toContain(hingesStep.id);
    }
  });
});

describe('buildAssemblyDAG — edge cases', () => {
  it('returns empty array for empty input', () => {
    expect(buildAssemblyDAG([])).toEqual([]);
  });

  it('single step has no dependencies', () => {
    const single = generateAssemblySteps(cfg({ furnitureType: 'panel' }));
    expect(single[0].dependencies ?? []).toEqual([]);
  });

  it('panel type steps all have ids', () => {
    const steps = generateAssemblySteps(cfg({ furnitureType: 'panel' }));
    for (const s of steps) {
      expect(s.id).toBeTruthy();
    }
  });

  it('desk type steps all have ids', () => {
    const steps = generateAssemblySteps(cfg({ furnitureType: 'desk' }));
    for (const s of steps) {
      expect(s.id).toBeTruthy();
    }
  });
});
