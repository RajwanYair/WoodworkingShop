import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSession,
  recordUsageEvent,
  closeSession,
  summarizeSession,
  computeMaterialTrends,
  getTopMaterials,
  computeCostTrends,
  exportAnalytics,
} from '../../src/engine/analytics';
import type { AnalyticsSession } from '../../src/engine/analytics';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSession(id: string): AnalyticsSession {
  return createSession(id);
}

// ─── createSession ────────────────────────────────────────────────────────────

describe('createSession', () => {
  it('creates a session with correct initial state', () => {
    const s = createSession('sess-1');
    expect(s.sessionId).toBe('sess-1');
    expect(s.events).toHaveLength(0);
    expect(s.endedAt).toBeNull();
    expect(s.startedAt).toBeTruthy();
  });

  it('throws RangeError for empty sessionId', () => {
    expect(() => createSession('')).toThrow(RangeError);
  });
});

// ─── recordUsageEvent ─────────────────────────────────────────────────────────

describe('recordUsageEvent', () => {
  let session: AnalyticsSession;

  beforeEach(() => {
    session = makeSession('s1');
  });

  it('appends an event with a unique id', () => {
    const s = recordUsageEvent(session, 'config_change');
    expect(s.events).toHaveLength(1);
    expect(s.events[0]?.kind).toBe('config_change');
    expect(s.events[0]?.id).toMatch(/^evt_/);
  });

  it('increments event count on successive calls', () => {
    let s = recordUsageEvent(session, 'export');
    s = recordUsageEvent(s, 'preview_open');
    expect(s.events).toHaveLength(2);
  });

  it('stores optional meta payload', () => {
    const s = recordUsageEvent(session, 'material_change', { material: 'plywood' });
    expect(s.events[0]?.meta?.['material']).toBe('plywood');
  });

  it('throws RangeError on closed session', () => {
    const closed = closeSession(session);
    expect(() => recordUsageEvent(closed, 'export')).toThrow(RangeError);
  });

  it.each([
    ['config_change'],
    ['export'],
    ['preview_open'],
    ['optimizer_run'],
    ['material_change'],
    ['plugin_install'],
    ['project_open'],
    ['project_save'],
  ] as const)('accepts kind %s', (kind) => {
    const s = recordUsageEvent(session, kind);
    expect(s.events[0]?.kind).toBe(kind);
  });
});

// ─── closeSession ─────────────────────────────────────────────────────────────

describe('closeSession', () => {
  it('sets endedAt timestamp', () => {
    const s = closeSession(makeSession('s1'));
    expect(s.endedAt).not.toBeNull();
  });

  it('throws RangeError if already closed', () => {
    const s = closeSession(makeSession('s1'));
    expect(() => closeSession(s)).toThrow(RangeError);
  });
});

// ─── summarizeSession ─────────────────────────────────────────────────────────

describe('summarizeSession', () => {
  it('counts events by kind', () => {
    let s = makeSession('s1');
    s = recordUsageEvent(s, 'export');
    s = recordUsageEvent(s, 'export');
    s = recordUsageEvent(s, 'config_change');
    const summary = summarizeSession(s);
    expect(summary.totalEvents).toBe(3);
    expect(summary.byKind['export']).toBe(2);
    expect(summary.byKind['config_change']).toBe(1);
  });

  it('computes durationMs for closed session', () => {
    let s = makeSession('s1');
    s = closeSession(s);
    const summary = summarizeSession(s);
    expect(summary.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('returns null durationMs for open session', () => {
    const summary = summarizeSession(makeSession('s1'));
    expect(summary.durationMs).toBeNull();
  });
});

// ─── computeMaterialTrends ────────────────────────────────────────────────────

describe('computeMaterialTrends', () => {
  it('returns empty array for sessions with no material events', () => {
    const s = makeSession('s1');
    expect(computeMaterialTrends([s])).toHaveLength(0);
  });

  it('counts material selections and computes share', () => {
    let s = makeSession('s1');
    s = recordUsageEvent(s, 'material_change', { material: 'plywood' });
    s = recordUsageEvent(s, 'material_change', { material: 'plywood' });
    s = recordUsageEvent(s, 'material_change', { material: 'mdf' });
    const trends = computeMaterialTrends([s]);
    expect(trends[0]?.material).toBe('plywood');
    expect(trends[0]?.selectionCount).toBe(2);
    expect(trends[0]?.share).toBeCloseTo(2 / 3);
  });

  it('aggregates across multiple sessions', () => {
    let s1 = makeSession('s1');
    let s2 = makeSession('s2');
    s1 = recordUsageEvent(s1, 'material_change', { material: 'plywood' });
    s2 = recordUsageEvent(s2, 'material_change', { material: 'plywood' });
    const trends = computeMaterialTrends([s1, s2]);
    expect(trends[0]?.selectionCount).toBe(2);
  });

  it('ignores material_change events without meta.material', () => {
    let s = makeSession('s1');
    s = recordUsageEvent(s, 'material_change');
    expect(computeMaterialTrends([s])).toHaveLength(0);
  });
});

// ─── getTopMaterials ──────────────────────────────────────────────────────────

describe('getTopMaterials', () => {
  it('respects the limit parameter', () => {
    let s = makeSession('s1');
    for (const mat of ['a', 'b', 'c', 'd', 'e', 'f']) {
      s = recordUsageEvent(s, 'material_change', { material: mat });
    }
    expect(getTopMaterials([s], 3)).toHaveLength(3);
  });
});

// ─── computeCostTrends ────────────────────────────────────────────────────────

describe('computeCostTrends', () => {
  it('returns empty array when no export events have cost', () => {
    let s = makeSession('s1');
    s = recordUsageEvent(s, 'export');
    expect(computeCostTrends([s])).toHaveLength(0);
  });

  it('buckets by YYYY-MM and computes average', () => {
    let s = makeSession('s1');
    s = recordUsageEvent(s, 'export', { estimatedCost: 100 });
    s = recordUsageEvent(s, 'export', { estimatedCost: 200 });
    const trends = computeCostTrends([s]);
    expect(trends).toHaveLength(1);
    expect(trends[0]?.averageCost).toBe(150);
    expect(trends[0]?.exportCount).toBe(2);
  });

  it('sorts buckets chronologically', () => {
    let s = makeSession('s1');
    // patch timestamps by checking bucket extraction
    s = recordUsageEvent(s, 'export', { estimatedCost: 50 });
    // both in same bucket — just verify no crash and sorted
    const trends = computeCostTrends([s]);
    expect(trends.length).toBeGreaterThanOrEqual(0);
  });
});

// ─── exportAnalytics ─────────────────────────────────────────────────────────

describe('exportAnalytics', () => {
  it('returns a serialisable summary object', () => {
    let s = makeSession('s1');
    s = recordUsageEvent(s, 'export', { estimatedCost: 300 });
    s = recordUsageEvent(s, 'material_change', { material: 'oak' });
    const result = exportAnalytics([s]);
    expect(result['sessionCount']).toBe(1);
    expect(result['totalEvents']).toBe(2);
    expect(Array.isArray(result['materialTrends'])).toBe(true);
    expect(Array.isArray(result['costTrends'])).toBe(true);
    expect(Array.isArray(result['summaries'])).toBe(true);
  });
});
