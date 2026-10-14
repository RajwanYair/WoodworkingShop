/**
 * Sprint 129 — Advanced analytics dashboard engine (Phase 29)
 *
 * Pure engine module — no React, no DOM, no side effects.
 * Tracks user interaction events and computes usage, material, and cost trends.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Category of tracked user event. */
export type UsageEventKind =
  | 'config_change'
  | 'export'
  | 'preview_open'
  | 'optimizer_run'
  | 'material_change'
  | 'plugin_install'
  | 'project_open'
  | 'project_save';

/** A single analytics event within a session. */
export interface UsageEvent {
  /** Unique event identifier. */
  id: string;
  /** Kind of event. */
  kind: UsageEventKind;
  /** ISO 8601 timestamp. */
  timestamp: string;
  /** Optional metadata payload. */
  meta?: Record<string, unknown>;
}

/** An analytics session representing one continuous usage period. */
export interface AnalyticsSession {
  /** Session identifier. */
  sessionId: string;
  /** ISO 8601 session start timestamp. */
  startedAt: string;
  /** ISO 8601 session end timestamp (null while in progress). */
  endedAt: string | null;
  /** Ordered list of events recorded in this session. */
  events: UsageEvent[];
}

/** Aggregated trend data for a material across sessions. */
export interface MaterialTrend {
  /** Material name or id. */
  material: string;
  /** Number of times this material was selected. */
  selectionCount: number;
  /** Fraction of all material selections this represents (0–1). */
  share: number;
}

/** Aggregated cost trend data for a single time bucket. */
export interface CostTrend {
  /** ISO 8601 date bucket (e.g. `'2026-01'` for month granularity). */
  bucket: string;
  /** Average estimated cost for exports in this bucket. */
  averageCost: number;
  /** Number of exports recorded in this bucket. */
  exportCount: number;
}

/** Summary of a completed analytics session. */
export interface UsageSummary {
  /** Session id. */
  sessionId: string;
  /** Total number of events. */
  totalEvents: number;
  /** Counts per event kind. */
  byKind: Record<UsageEventKind, number>;
  /** Session duration in milliseconds (null if not ended). */
  durationMs: number | null;
  /** ISO 8601 timestamps. */
  startedAt: string;
  endedAt: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

let _nextId = 1;

function generateId(): string {
  return `evt_${(_nextId++).toString().padStart(6, '0')}`;
}

function now(): string {
  return new Date().toISOString();
}

const ALL_KINDS: UsageEventKind[] = [
  'config_change',
  'export',
  'preview_open',
  'optimizer_run',
  'material_change',
  'plugin_install',
  'project_open',
  'project_save',
];

function emptyByKind(): Record<UsageEventKind, number> {
  return Object.fromEntries(ALL_KINDS.map((k) => [k, 0])) as Record<UsageEventKind, number>;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Create a new analytics session.
 */
export function createSession(sessionId: string): AnalyticsSession {
  if (!sessionId.trim()) throw new RangeError('sessionId must not be empty');
  return { sessionId, startedAt: now(), endedAt: null, events: [] };
}

/**
 * Record a usage event in the current session.
 */
export function recordUsageEvent(
  session: AnalyticsSession,
  kind: UsageEventKind,
  meta?: Record<string, unknown>,
): AnalyticsSession {
  if (session.endedAt !== null) throw new RangeError('Cannot record events on a closed session');
  const event: UsageEvent = { id: generateId(), kind, timestamp: now(), ...(meta ? { meta } : {}) };
  return { ...session, events: [...session.events, event] };
}

/**
 * Close the analytics session, recording an end timestamp.
 */
export function closeSession(session: AnalyticsSession): AnalyticsSession {
  if (session.endedAt !== null) throw new RangeError('Session already closed');
  return { ...session, endedAt: now() };
}

/**
 * Summarise a session into per-kind event counts and duration.
 */
export function summarizeSession(session: AnalyticsSession): UsageSummary {
  const byKind = emptyByKind();
  for (const event of session.events) {
    byKind[event.kind]++;
  }
  const durationMs =
    session.endedAt !== null ? new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime() : null;
  return {
    sessionId: session.sessionId,
    totalEvents: session.events.length,
    byKind,
    durationMs,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
  };
}

/**
 * Compute material selection trends across a set of sessions.
 * Looks for `meta.material` on `'material_change'` events.
 */
export function computeMaterialTrends(sessions: AnalyticsSession[]): MaterialTrend[] {
  const counts = new Map<string, number>();
  for (const session of sessions) {
    for (const event of session.events) {
      if (event.kind === 'material_change' && typeof event.meta?.['material'] === 'string') {
        const mat = event.meta['material'];
        counts.set(mat, (counts.get(mat) ?? 0) + 1);
      }
    }
  }
  const total = [...counts.values()].reduce((s, v) => s + v, 0);
  return [...counts.entries()]
    .map(([material, selectionCount]) => ({
      material,
      selectionCount,
      share: total > 0 ? selectionCount / total : 0,
    }))
    .sort((a, b) => b.selectionCount - a.selectionCount);
}

/**
 * Return the top N most frequently selected materials.
 */
export function getTopMaterials(sessions: AnalyticsSession[], limit = 5): MaterialTrend[] {
  return computeMaterialTrends(sessions).slice(0, limit);
}

/**
 * Compute monthly cost trends across sessions.
 * Looks for `meta.estimatedCost` (number) on `'export'` events.
 * Buckets are `'YYYY-MM'` strings derived from event timestamps.
 */
export function computeCostTrends(sessions: AnalyticsSession[]): CostTrend[] {
  const buckets = new Map<string, { total: number; count: number }>();
  for (const session of sessions) {
    for (const event of session.events) {
      if (event.kind === 'export' && typeof event.meta?.['estimatedCost'] === 'number') {
        const bucket = event.timestamp.slice(0, 7); // 'YYYY-MM'
        const existing = buckets.get(bucket) ?? { total: 0, count: 0 };
        buckets.set(bucket, {
          total: existing.total + (event.meta['estimatedCost'] as number),
          count: existing.count + 1,
        });
      }
    }
  }
  return [...buckets.entries()]
    .map(([bucket, { total, count }]) => ({
      bucket,
      averageCost: count > 0 ? total / count : 0,
      exportCount: count,
    }))
    .sort((a, b) => a.bucket.localeCompare(b.bucket));
}

/**
 * Export analytics data as a plain JSON-serialisable object.
 */
export function exportAnalytics(sessions: AnalyticsSession[]): Record<string, unknown> {
  return {
    exportedAt: now(),
    sessionCount: sessions.length,
    totalEvents: sessions.reduce((s, sess) => s + sess.events.length, 0),
    materialTrends: computeMaterialTrends(sessions),
    costTrends: computeCostTrends(sessions),
    summaries: sessions.map(summarizeSession),
  };
}
