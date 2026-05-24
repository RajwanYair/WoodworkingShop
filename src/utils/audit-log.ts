/**
 * Audit log — Sprint 22
 *
 * An IDB-backed operation journal for collaborative / multi-session tracing.
 * Each mutation that the app applies to a project can be logged with
 * `logOperation()`. The audit trail is keyed by projectId so that each
 * project maintains its own independent history.
 *
 * Storage layout (idb-keyval with a dedicated store):
 *   key  : `<projectId>:<timestampMs>:<sequence>`   (lexicographic sort = chronological)
 *   value: AuditEntry
 *
 * Design goals:
 *   - Pure data layer — no React, no Zustand dependency.
 *   - Append-only by default; individual entries can be purged by project.
 *   - Optional payload hashing (SHA-256 hex) for tamper-evidence.
 *   - Offline-first: no remote dependency.
 */

import { get, set, del, entries, createStore } from 'idb-keyval';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Category of the recorded operation. */
export type AuditOperationType =
  | 'config.update'
  | 'cabinet.add'
  | 'cabinet.remove'
  | 'cabinet.update'
  | 'material.change'
  | 'export.gcode'
  | 'export.dxf'
  | 'export.bom'
  | 'export.pdf'
  | 'project.save'
  | 'project.load'
  | 'project.delete'
  | 'branch.fork'
  | 'branch.merge'
  | 'custom';

export interface AuditEntry {
  /** Composite IDB key: `<projectId>:<timestampMs>:<seq>` */
  key: string;
  projectId: string;
  type: AuditOperationType;
  /** ISO 8601 timestamp. */
  timestamp: string;
  /** Monotonic sequence number within the session (distinguishes same-ms ops). */
  seq: number;
  /** Arbitrary operation payload (serialised diff, export path, etc.) */
  payload?: unknown;
  /** Optional SHA-256 hex of `JSON.stringify(payload)` for tamper-evidence. */
  payloadHash?: string;
  /** User or session identifier, if known. */
  actor?: string;
}

export interface AuditLogOptions {
  actor?: string;
  /** If true, compute SHA-256 of the payload and store as payloadHash. */
  hashPayload?: boolean;
}

// ── IDB store ─────────────────────────────────────────────────────────────────

export const auditLogStore = createStore('cabinet-planner-audit', 'entries');

// ── Internal state ────────────────────────────────────────────────────────────

let _seq = 0;

/** Reset the in-memory sequence counter (for test isolation). */
export function _resetSeq(): void {
  _seq = 0;
}

/** Delete every entry in the audit store (for test isolation). */
export async function _clearAllAuditEntries(): Promise<void> {
  const all = (await entries<string, AuditEntry>(auditLogStore)) as [string, AuditEntry][];
  await Promise.all(all.map(([k]) => del(k, auditLogStore)));
}

// ── Core API ──────────────────────────────────────────────────────────────────

/**
 * Append an audit entry for the given project.
 * Returns the stored `AuditEntry`.
 */
export async function logOperation(
  projectId: string,
  type: AuditOperationType,
  payload?: unknown,
  options: AuditLogOptions = {},
): Promise<AuditEntry> {
  const now = Date.now();
  const seq = ++_seq;
  const timestamp = new Date(now).toISOString();
  const key = `${projectId}:${String(now).padStart(15, '0')}:${String(seq).padStart(8, '0')}`;

  let payloadHash: string | undefined;
  if (options.hashPayload && payload !== undefined) {
    payloadHash = await sha256Hex(JSON.stringify(payload));
  }

  const entry: AuditEntry = {
    key,
    projectId,
    type,
    timestamp,
    seq,
    ...(payload !== undefined ? { payload } : {}),
    ...(payloadHash ? { payloadHash } : {}),
    ...(options.actor ? { actor: options.actor } : {}),
  };

  await set(key, entry, auditLogStore);
  return entry;
}

/**
 * Retrieve all audit entries for a project, sorted chronologically (oldest first).
 */
export async function getAuditLog(projectId: string): Promise<AuditEntry[]> {
  const all = (await entries<string, AuditEntry>(auditLogStore)) as [string, AuditEntry][];
  return all
    .filter(([k]) => k.startsWith(`${projectId}:`))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}

/**
 * Get the most recent N entries for a project (newest first).
 */
export async function getRecentAuditEntries(
  projectId: string,
  limit = 50,
): Promise<AuditEntry[]> {
  const all = await getAuditLog(projectId);
  return all.slice(-limit).reverse();
}

/**
 * Delete all audit entries for a project.
 */
export async function clearAuditLog(projectId: string): Promise<void> {
  const all = (await entries<string, AuditEntry>(auditLogStore)) as [string, AuditEntry][];
  const keys = all.filter(([k]) => k.startsWith(`${projectId}:`)).map(([k]) => k);
  await Promise.all(keys.map((k) => del(k, auditLogStore)));
}

/**
 * Delete a single audit entry by its composite key.
 * Silently ignores unknown keys.
 */
export async function deleteAuditEntry(key: string): Promise<void> {
  await del(key, auditLogStore);
}

/**
 * Returns a list of all project IDs that have at least one audit entry.
 */
export async function listAuditedProjects(): Promise<string[]> {
  const all = (await entries<string, AuditEntry>(auditLogStore)) as [string, AuditEntry][];
  const ids = new Set<string>();
  for (const [k] of all) {
    const projectId = k.split(':')[0];
    if (projectId) ids.add(projectId);
  }
  return [...ids].sort();
}

/**
 * Count audit entries for a given project.
 */
export async function countAuditEntries(projectId: string): Promise<number> {
  const log = await getAuditLog(projectId);
  return log.length;
}

// ── Tamper-evidence helper ────────────────────────────────────────────────────

/**
 * Compute a SHA-256 hex digest of an arbitrary string.
 * Falls back to a deterministic length-based stub in environments that
 * don't expose `crypto.subtle` (e.g. some older jsdom versions).
 */
export async function sha256Hex(input: string): Promise<string> {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle?.digest === 'function'
  ) {
    const buf = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(input),
    );
    return [...new Uint8Array(buf)]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback: deterministic but not cryptographic — test environments only
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16).padStart(8, '0').repeat(8);
}
