import { describe, expect, it } from 'vitest';

import {
  bestForCriterion,
  compareProjects,
  DEFAULT_WEIGHTS,
  percentDifference,
} from '../../src/engine/project-comparison';

import type { ComparisonWeights, ProjectMetrics } from '../../src/engine/project-comparison';

const projectA: ProjectMetrics = {
  projectId: 'a',
  name: 'Budget Kitchen',
  cost: 150,
  wastePercent: 25,
  buildTimeMinutes: 480,
  materialCount: 3,
  partCount: 20,
  sheetCount: 4,
};

const projectB: ProjectMetrics = {
  projectId: 'b',
  name: 'Premium Kitchen',
  cost: 350,
  wastePercent: 12,
  buildTimeMinutes: 720,
  materialCount: 5,
  partCount: 35,
  sheetCount: 8,
};

const projectC: ProjectMetrics = {
  projectId: 'c',
  name: 'Mid-Range Kitchen',
  cost: 220,
  wastePercent: 18,
  buildTimeMinutes: 560,
  materialCount: 4,
  partCount: 28,
  sheetCount: 6,
};

describe('compareProjects', () => {
  it('ranks projects by weighted score', () => {
    const result = compareProjects([projectA, projectB, projectC]);

    expect(result.projects).toHaveLength(3);
    expect(result.projects[0].rank).toBe(1);
    expect(result.projects[1].rank).toBe(2);
    expect(result.projects[2].rank).toBe(3);
    expect(result.projects[0].totalScore).toBeGreaterThanOrEqual(result.projects[1].totalScore);
  });

  it('identifies best and worst projects', () => {
    const result = compareProjects([projectA, projectB, projectC]);

    expect(result.bestProjectId).toBe(result.projects[0].projectId);
    expect(result.worstProjectId).toBe(result.projects[2].projectId);
  });

  it('uses default weights when none provided', () => {
    const result = compareProjects([projectA, projectB]);

    expect(result.weights).toEqual(DEFAULT_WEIGHTS);
  });

  it('applies custom weights', () => {
    const costOnly: ComparisonWeights = {
      cost: 100,
      waste: 0,
      buildTime: 0,
      materialCount: 0,
      partCount: 0,
      sheetCount: 0,
    };
    const result = compareProjects([projectA, projectB], costOnly);

    // ProjectA has lower cost, should win
    expect(result.bestProjectId).toBe('a');
  });

  it('waste-focused weights favour low-waste project', () => {
    const wasteOnly: ComparisonWeights = {
      cost: 0,
      waste: 100,
      buildTime: 0,
      materialCount: 0,
      partCount: 0,
      sheetCount: 0,
    };
    const result = compareProjects([projectA, projectB], wasteOnly);

    // ProjectB has 12% waste vs A's 25%
    expect(result.bestProjectId).toBe('b');
  });

  it('normalises scores to 0-100 range', () => {
    const result = compareProjects([projectA, projectB]);

    for (const p of result.projects) {
      expect(p.totalScore).toBeGreaterThanOrEqual(0);
      expect(p.totalScore).toBeLessThanOrEqual(100);
      expect(p.scores.cost).toBeGreaterThanOrEqual(0);
      expect(p.scores.cost).toBeLessThanOrEqual(100);
    }
  });

  it('gives 100 to best and 0 to worst for each criterion (2 projects)', () => {
    const result = compareProjects([projectA, projectB]);

    // A has lower cost → cost score = 100
    const a = result.projects.find((p) => p.projectId === 'a')!;
    const b = result.projects.find((p) => p.projectId === 'b')!;
    expect(a.scores.cost).toBe(100);
    expect(b.scores.cost).toBe(0);
    // B has lower waste → waste score = 100
    expect(b.scores.waste).toBe(100);
    expect(a.scores.waste).toBe(0);
  });

  it('handles identical metrics (all score 100)', () => {
    const dup = { ...projectA, projectId: 'dup', name: 'Clone' };
    const result = compareProjects([projectA, dup]);

    expect(result.projects[0].totalScore).toBe(100);
    expect(result.projects[1].totalScore).toBe(100);
  });

  it('throws RangeError for fewer than 2 projects', () => {
    expect(() => compareProjects([projectA])).toThrow(RangeError);
    expect(() => compareProjects([])).toThrow(RangeError);
  });

  it('throws RangeError for negative weights', () => {
    const bad: ComparisonWeights = {
      cost: -1,
      waste: 10,
      buildTime: 10,
      materialCount: 10,
      partCount: 10,
      sheetCount: 10,
    };
    expect(() => compareProjects([projectA, projectB], bad)).toThrow(RangeError);
  });

  it('throws RangeError for all-zero weights', () => {
    const zero: ComparisonWeights = { cost: 0, waste: 0, buildTime: 0, materialCount: 0, partCount: 0, sheetCount: 0 };
    expect(() => compareProjects([projectA, projectB], zero)).toThrow(RangeError);
  });
});

describe('bestForCriterion', () => {
  it('finds cheapest project', () => {
    expect(bestForCriterion([projectA, projectB, projectC], 'cost')?.projectId).toBe('a');
  });

  it('finds least wasteful project', () => {
    expect(bestForCriterion([projectA, projectB, projectC], 'waste')?.projectId).toBe('b');
  });

  it('finds fastest project', () => {
    expect(bestForCriterion([projectA, projectB, projectC], 'buildTime')?.projectId).toBe('a');
  });

  it('returns undefined for empty array', () => {
    expect(bestForCriterion([], 'cost')).toBeUndefined();
  });
});

describe('percentDifference', () => {
  it.each([
    { a: 100, b: 200, expected: 50 },
    { a: 200, b: 100, expected: 100 },
    { a: 100, b: 100, expected: 0 },
    { a: 50, b: 0, expected: 100 },
    { a: 0, b: 0, expected: 0 },
  ])('percentDifference($a, $b) = $expected', ({ a, b, expected }) => {
    expect(percentDifference(a, b)).toBe(expected);
  });
});
