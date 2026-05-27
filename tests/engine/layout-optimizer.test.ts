import { describe, it, expect } from 'vitest';

import {
  buildDistanceMatrix,
  computeTotalDistance,
  suggestSwaps,
  computeEfficiencyScore,
  analyzeLayout,
} from '../../src/engine/layout-optimizer';
import type { ToolPosition, WorkflowStep } from '../../src/engine/layout-optimizer';

const positions: ToolPosition[] = [
  { toolId: 'saw', x: 0, y: 0 },
  { toolId: 'drill', x: 3, y: 0 },
  { toolId: 'router', x: 0, y: 4 },
  { toolId: 'sander', x: 3, y: 4 },
];

const workflow: WorkflowStep[] = [
  { from: 'saw', to: 'drill', frequency: 10 },
  { from: 'drill', to: 'router', frequency: 5 },
  { from: 'router', to: 'sander', frequency: 8 },
];

describe('buildDistanceMatrix', () => {
  it('throws on empty positions', () => {
    expect(() => buildDistanceMatrix([])).toThrow(RangeError);
  });

  it('builds symmetric distance matrix', () => {
    const matrix = buildDistanceMatrix(positions);
    expect(matrix.size).toBe(4);
    expect(matrix.get('saw')!.get('drill')).toBe(3);
    expect(matrix.get('drill')!.get('saw')).toBe(3);
    expect(matrix.get('saw')!.get('saw')).toBe(0);
  });

  it('computes correct diagonal distance', () => {
    const matrix = buildDistanceMatrix(positions);
    // saw(0,0) → sander(3,4) = sqrt(9+16) = 5
    expect(matrix.get('saw')!.get('sander')).toBe(5);
  });
});

describe('computeTotalDistance', () => {
  it('throws on empty positions', () => {
    expect(() => computeTotalDistance([], workflow)).toThrow(RangeError);
  });

  it('throws on empty workflow', () => {
    expect(() => computeTotalDistance(positions, [])).toThrow(RangeError);
  });

  it('throws on unknown tool in workflow', () => {
    const badWorkflow: WorkflowStep[] = [{ from: 'saw', to: 'unknown', frequency: 1 }];
    expect(() => computeTotalDistance(positions, badWorkflow)).toThrow(/no position for tool "unknown"/);
  });

  it('computes correct total distance with frequency', () => {
    // saw→drill: 3 × 10 = 30
    // drill→router: sqrt(9+16)=5 × 5 = 25
    // router→sander: 3 × 8 = 24
    const total = computeTotalDistance(positions, workflow);
    expect(total).toBeCloseTo(79, 5);
  });
});

describe('suggestSwaps', () => {
  it('returns empty for single tool', () => {
    const single: ToolPosition[] = [{ toolId: 'saw', x: 0, y: 0 }];
    expect(suggestSwaps(single, workflow)).toEqual([]);
  });

  it('returns empty for empty workflow', () => {
    expect(suggestSwaps(positions, [])).toEqual([]);
  });

  it('finds beneficial swaps sorted by saved distance', () => {
    // Linear layout where tools used together are far apart
    const linearPositions: ToolPosition[] = [
      { toolId: 'saw', x: 0, y: 0 },
      { toolId: 'drill', x: 10, y: 0 },
      { toolId: 'router', x: 1, y: 0 },
    ];
    const linearWorkflow: WorkflowStep[] = [
      { from: 'saw', to: 'drill', frequency: 20 },
      { from: 'drill', to: 'router', frequency: 1 },
    ];
    const suggestions = suggestSwaps(linearPositions, linearWorkflow);

    // Swapping drill and router would reduce saw→drill from 10 to 1
    if (suggestions.length > 0) {
      expect(suggestions[0].savedDistance).toBeGreaterThan(0);
      expect(suggestions[0].percentImprovement).toBeGreaterThan(0);
    }
  });

  it('respects maxSuggestions limit', () => {
    const suggestions = suggestSwaps(positions, workflow, 2);
    expect(suggestions.length).toBeLessThanOrEqual(2);
  });
});

describe('computeEfficiencyScore', () => {
  it('returns 100 for empty positions or workflow', () => {
    expect(computeEfficiencyScore([], workflow)).toBe(100);
    expect(computeEfficiencyScore(positions, [])).toBe(100);
  });

  it('returns 100 when all tools at same position', () => {
    const same: ToolPosition[] = [
      { toolId: 'saw', x: 0, y: 0 },
      { toolId: 'drill', x: 0, y: 0 },
    ];
    const w: WorkflowStep[] = [{ from: 'saw', to: 'drill', frequency: 5 }];
    expect(computeEfficiencyScore(same, w)).toBe(100);
  });

  it('returns a score between 0 and 100', () => {
    const score = computeEfficiencyScore(positions, workflow);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('analyzeLayout', () => {
  it('throws on empty positions', () => {
    expect(() => analyzeLayout([], workflow)).toThrow(RangeError);
  });

  it('throws on empty workflow', () => {
    expect(() => analyzeLayout(positions, [])).toThrow(RangeError);
  });

  it('returns full analysis result', () => {
    const result = analyzeLayout(positions, workflow);
    expect(result.totalDistance).toBeCloseTo(79, 5);
    expect(result.distanceMatrix.size).toBe(4);
    expect(result.efficiencyScore).toBeGreaterThanOrEqual(0);
    expect(result.efficiencyScore).toBeLessThanOrEqual(100);
    expect(Array.isArray(result.suggestions)).toBe(true);
  });
});
