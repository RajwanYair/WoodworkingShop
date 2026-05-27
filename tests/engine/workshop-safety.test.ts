import { describe, it, expect } from 'vitest';

import {
  checkWorkshopSafety,
  getToolClearance,
  getNoiseLevel,
  recommendPpe,
  computeSafetyScore,
} from '../../src/engine/workshop-safety';
import type { WorkshopTool, SafetyViolation } from '../../src/engine/workshop-safety';

/** Helper: creates a tool with defaults. */
function tool(overrides: Partial<WorkshopTool> & { id: string }): WorkshopTool {
  return {
    type: 'hand-tool',
    label: overrides.id,
    x: 0,
    y: 0,
    width: 600,
    depth: 600,
    ...overrides,
  };
}

describe('getToolClearance', () => {
  it.each([
    ['table-saw', 2400],
    ['drill-press', 900],
    ['hand-tool', 600],
  ] as const)('returns %i mm for %s', (type, expected) => {
    expect(getToolClearance(type)).toBe(expected);
  });
});

describe('getNoiseLevel', () => {
  it.each([
    ['miter-saw', 105],
    ['hand-tool', 60],
    ['planer', 100],
  ] as const)('returns %i dB for %s', (type, expected) => {
    expect(getNoiseLevel(type)).toBe(expected);
  });
});

describe('recommendPpe', () => {
  it('returns safety-glasses for hand-tool', () => {
    const tools: WorkshopTool[] = [tool({ id: 'ht1', type: 'hand-tool' })];
    const recs = recommendPpe(tools);
    expect(recs).toHaveLength(1);
    expect(recs[0].required).toContain('safety-glasses');
  });

  it('returns push-stick for table-saw', () => {
    const tools: WorkshopTool[] = [tool({ id: 'ts1', type: 'table-saw' })];
    const recs = recommendPpe(tools);
    expect(recs[0].required).toContain('push-stick');
    expect(recs[0].required).toContain('anti-kickback');
  });

  it('returns recommendations for all tools', () => {
    const tools: WorkshopTool[] = [tool({ id: 'a', type: 'table-saw' }), tool({ id: 'b', type: 'sander', x: 5000 })];
    expect(recommendPpe(tools)).toHaveLength(2);
  });
});

describe('computeSafetyScore', () => {
  it('returns 100 when no violations', () => {
    expect(computeSafetyScore([], 5)).toBe(100);
  });

  it('returns 100 when toolCount is 0', () => {
    expect(computeSafetyScore([], 0)).toBe(100);
  });

  it('deducts 25 per critical violation', () => {
    const violations: SafetyViolation[] = [{ severity: 'critical', toolIds: ['a', 'b'], message: '', rule: 'overlap' }];
    expect(computeSafetyScore(violations, 2)).toBe(75);
  });

  it('deducts 10 per warning', () => {
    const violations: SafetyViolation[] = [
      { severity: 'warning', toolIds: ['a'], message: '', rule: 'clearance-zone' },
      { severity: 'warning', toolIds: ['b'], message: '', rule: 'noise-accumulation' },
    ];
    expect(computeSafetyScore(violations, 3)).toBe(80);
  });

  it('clamps score to 0 minimum', () => {
    const violations: SafetyViolation[] = Array.from({ length: 10 }, (_, i) => ({
      severity: 'critical' as const,
      toolIds: [`t${i}`],
      message: '',
      rule: 'overlap',
    }));
    expect(computeSafetyScore(violations, 5)).toBe(0);
  });
});

describe('checkWorkshopSafety', () => {
  it('throws on empty tools array', () => {
    expect(() => checkWorkshopSafety([])).toThrow(RangeError);
  });

  it('passes with single well-placed tool', () => {
    const tools: WorkshopTool[] = [tool({ id: 'saw', type: 'table-saw', x: 3000, y: 3000 })];
    const result = checkWorkshopSafety(tools);
    expect(result.passes).toBe(true);
    expect(result.score).toBe(100);
    expect(result.violations).toHaveLength(0);
  });

  it('detects overlapping tool footprints as critical', () => {
    const tools: WorkshopTool[] = [
      tool({ id: 'a', type: 'table-saw', x: 0, y: 0, width: 1000, depth: 800 }),
      tool({ id: 'b', type: 'band-saw', x: 500, y: 400, width: 600, depth: 600 }),
    ];
    const result = checkWorkshopSafety(tools);
    const overlap = result.violations.find((v) => v.rule === 'overlap');
    expect(overlap).toBeDefined();
    expect(overlap!.severity).toBe('critical');
  });

  it('detects clearance violations between nearby tools', () => {
    const tools: WorkshopTool[] = [
      tool({ id: 'a', type: 'table-saw', x: 0, y: 0, width: 800, depth: 600 }),
      tool({ id: 'b', type: 'jointer', x: 900, y: 0, width: 1200, depth: 400 }),
    ];
    const result = checkWorkshopSafety(tools);
    const clearance = result.violations.find((v) => v.rule === 'clearance-zone');
    expect(clearance).toBeDefined();
  });

  it('no clearance violation when tools are far apart', () => {
    const tools: WorkshopTool[] = [
      tool({ id: 'a', type: 'table-saw', x: 0, y: 0, width: 800, depth: 600 }),
      tool({ id: 'b', type: 'hand-tool', x: 5000, y: 5000, width: 300, depth: 300 }),
    ];
    const result = checkWorkshopSafety(tools);
    expect(result.violations.filter((v) => v.rule === 'clearance-zone')).toHaveLength(0);
  });

  it('detects noise accumulation with 3+ loud tools', () => {
    const tools: WorkshopTool[] = [
      tool({ id: 'a', type: 'table-saw', x: 0, y: 0 }),
      tool({ id: 'b', type: 'miter-saw', x: 5000, y: 0 }),
      tool({ id: 'c', type: 'router-table', x: 10000, y: 0 }),
    ];
    const result = checkWorkshopSafety(tools);
    const noise = result.violations.find((v) => v.rule === 'noise-accumulation');
    expect(noise).toBeDefined();
    expect(noise!.severity).toBe('warning');
  });

  it('includes PPE recommendations in result', () => {
    const tools: WorkshopTool[] = [tool({ id: 'lathe1', type: 'lathe', x: 2000, y: 2000 })];
    const result = checkWorkshopSafety(tools);
    expect(result.ppeRecommendations).toHaveLength(1);
    expect(result.ppeRecommendations[0].required).toContain('face-shield');
  });

  it('fails safety check with many critical violations', () => {
    const tools: WorkshopTool[] = [
      tool({ id: 'a', type: 'table-saw', x: 0, y: 0, width: 800, depth: 600 }),
      tool({ id: 'b', type: 'jointer', x: 100, y: 100, width: 1200, depth: 400 }),
      tool({ id: 'c', type: 'planer', x: 200, y: 200, width: 1000, depth: 600 }),
    ];
    const result = checkWorkshopSafety(tools);
    expect(result.passes).toBe(false);
    expect(result.score).toBeLessThan(70);
  });
});
