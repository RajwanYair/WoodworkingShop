/**
 * Sprint 125 — Audit trail and version diffing engine (Phase 28)
 *
 * Pure engine module — no React, no DOM, no side effects.
 * Records discrete mutation events on a project config and produces
 * structured diffs between two configurations.
 */

import type { CabinetConfig } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Discriminated category of an audit event. */
export type AuditEventKind =
  | 'config-change'
  | 'project-created'
  | 'project-renamed'
  | 'project-deleted'
  | 'material-changed'
  | 'export'
  | 'note-added';

/** A single recorded audit event. */
export interface AuditEvent {
  /** Stable monotonically-increasing sequence number (1-based). */
  sequence: number;
  /** ISO 8601 timestamp. */
  timestamp: string;
  /** Category of the mutation. */
  kind: AuditEventKind;
  /** Human-readable description (1 line). */
  description: string;
  /** Optional snapshot of the config at this point in time. */
  configSnapshot?: CabinetConfig;
  /** Arbitrary key-value metadata (serialisable). */
  meta?: Record<string, string | number | boolean>;
}

/** Immutable ordered list of audit events for one project. */
export interface AuditTrail {
  /** Project id this trail belongs to. */
  projectId: string;
  /** All recorded events, oldest first. */
  events: AuditEvent[];
}

/** A single changed field between two configs. */
export interface DiffEntry {
  /** Name of the changed field. */
  field: string;
  /** Value in the 'before' config (stringified). */
  before: string;
  /** Value in the 'after' config (stringified). */
  after: string;
}

/** Result of diffing two CabinetConfig objects. */
export interface ConfigDiff {
  /** Whether the two configs are identical. */
  identical: boolean;
  /** Changed fields. */
  changes: DiffEntry[];
  /** Number of fields that differ. */
  changeCount: number;
}

// ─── AuditTrail CRUD ──────────────────────────────────────────────────────────

/**
 * Create a new empty AuditTrail for a project.
 *
 * @throws RangeError if projectId is empty.
 */
export function createAuditTrail(projectId: string): AuditTrail {
  if (!projectId.trim()) throw new RangeError('projectId must not be empty');
  return { projectId, events: [] };
}

/**
 * Append a new event to the trail (immutable — returns a new trail).
 *
 * @param trail  Current audit trail.
 * @param kind   Event kind.
 * @param description  Human-readable description.
 * @param options      Optional configSnapshot and meta.
 */
export function recordEvent(
  trail: AuditTrail,
  kind: AuditEventKind,
  description: string,
  options?: { configSnapshot?: CabinetConfig; meta?: Record<string, string | number | boolean> },
): AuditTrail {
  if (!description.trim()) throw new RangeError('description must not be empty');
  const event: AuditEvent = {
    sequence: trail.events.length + 1,
    timestamp: new Date().toISOString(),
    kind,
    description,
    ...(options?.configSnapshot !== undefined ? { configSnapshot: options.configSnapshot } : {}),
    ...(options?.meta !== undefined ? { meta: options.meta } : {}),
  };
  return { ...trail, events: [...trail.events, event] };
}

/**
 * Return all events for the given project, newest first.
 *
 * @param trail  The audit trail.
 * @param limit  Optional maximum number of results.
 */
export function getAuditHistory(trail: AuditTrail, limit?: number): AuditEvent[] {
  const reversed = [...trail.events].reverse();
  return limit !== undefined ? reversed.slice(0, limit) : reversed;
}

/**
 * Return a one-line plain-text rendering of a single audit event.
 *
 * Format: `[seq] YYYY-MM-DDTHH:MM:SSZ  kind  description`
 */
export function formatAuditEntry(event: AuditEvent): string {
  const ts = event.timestamp.slice(0, 19) + 'Z';
  return `[${event.sequence}] ${ts}  ${event.kind}  ${event.description}`;
}

/**
 * Produce a human-readable summary of the entire audit trail.
 *
 * Returns `"No audit events recorded."` if the trail is empty.
 */
export function summarizeAudit(trail: AuditTrail): string {
  if (trail.events.length === 0) return 'No audit events recorded.';
  const count = trail.events.length;
  const first = trail.events[0];
  const last = trail.events[trail.events.length - 1];
  return `${count} event${count === 1 ? '' : 's'} recorded from ${first?.timestamp.slice(0, 10)} to ${last?.timestamp.slice(0, 10)}.`;
}

// ─── Config diffing ───────────────────────────────────────────────────────────

/**
 * Compute the diff between two CabinetConfig objects.
 *
 * Only own enumerable string keys are compared; values are compared by
 * their JSON-stringified representation to handle arrays correctly.
 */
export function diffConfigs(before: CabinetConfig, after: CabinetConfig): ConfigDiff {
  const beforeRecord = Object.fromEntries(Object.entries(before));
  const afterRecord = Object.fromEntries(Object.entries(after));
  const allKeys = new Set([...Object.keys(beforeRecord), ...Object.keys(afterRecord)]);
  const changes: DiffEntry[] = [];

  for (const field of allKeys) {
    const bVal = JSON.stringify(beforeRecord[field]);
    const aVal = JSON.stringify(afterRecord[field]);
    if (bVal !== aVal) {
      changes.push({ field, before: bVal ?? 'undefined', after: aVal ?? 'undefined' });
    }
  }

  return { identical: changes.length === 0, changes, changeCount: changes.length };
}
