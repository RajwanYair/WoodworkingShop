/**
 * CRDT sync layer — Phase 14 / Sprint 21
 *
 * A lightweight operational-transform / last-write-wins CRDT implementation
 * for `CabinetConfig` maps.  Designed to be compatible with Yjs mental models
 * without importing Yjs itself (which is not in the dependency tree).
 *
 * When VITE_SUPABASE_URL is configured, a higher-level transport can subscribe
 * to `CrdtDocument` changes and broadcast `CrdtOp` over a WebSocket channel.
 * Two clients merging independent `CrdtOp` sequences always converge to the
 * same state (idempotent + commutative).
 *
 * Merge semantics:
 *   - Each field is versioned with a [clientId, clock] vector clock entry.
 *   - On conflict the op with the higher clock wins; ties go to the
 *     lexicographically larger clientId (deterministic).
 *   - Deletes are modelled as tombstones so merging a delete never loses the
 *     clock entry.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

/** Monotonically increasing logical clock per client. */
/** Globally unique client identifier (e.g. crypto.randomUUID()). */
/** A single field-level operation. */
export interface CrdtOp {
  clientId: string;
  clock: number;
  /** JSON pointer path, e.g. "/width" or "/doors/0/material" */
  path: string;
  /** Serialised field value.  `null` signals a tombstone (delete). */
  value: unknown;
}

/** Per-field metadata stored alongside the current value. */
interface FieldEntry {
  value: unknown;
  clientId: string;
  clock: number;
  deleted: boolean;
}

/** An in-memory CRDT document (map of arbitrary JSON paths). */
export interface CrdtDocument {
  /** Current logical clock for this client. */
  clock: number;
  /** Stable client identifier. */
  clientId: string;
  /** Internal field registry — do not modify directly. */
  readonly _fields: Map<string, FieldEntry>;
}

// ── Factory ───────────────────────────────────────────────────────────────────

/** Create an empty CRDT document for the given client. */
export function createCrdtDocument(clientId: string): CrdtDocument {
  return {
    clock: 0,
    clientId,
    _fields: new Map(),
  };
}

// ── Mutation ──────────────────────────────────────────────────────────────────

/**
 * Set a field value, advancing the local clock.
 * Returns the generated `CrdtOp` for broadcasting to peers.
 */
export function crdtSet(doc: CrdtDocument, path: string, value: unknown): CrdtOp {
  const clock = ++doc.clock;
  const op: CrdtOp = { clientId: doc.clientId, clock, path, value };
  doc._fields.set(path, {
    value,
    clientId: doc.clientId,
    clock,
    deleted: false,
  });
  return op;
}

/**
 * Delete a field (tombstone).
 * Returns the generated `CrdtOp` for broadcasting.
 */
export function crdtDelete(doc: CrdtDocument, path: string): CrdtOp {
  const clock = ++doc.clock;
  const op: CrdtOp = { clientId: doc.clientId, clock, path, value: null };
  doc._fields.set(path, {
    value: null,
    clientId: doc.clientId,
    clock,
    deleted: true,
  });
  return op;
}

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Get the current value of a field, or `undefined` if absent / tombstoned.
 */
export function crdtGet(doc: CrdtDocument, path: string): unknown {
  const entry = doc._fields.get(path);
  if (!entry || entry.deleted) return undefined;
  return entry.value;
}

/**
 * Returns all live (non-deleted) field paths.
 */
export function crdtKeys(doc: CrdtDocument): string[] {
  const keys: string[] = [];
  for (const [path, entry] of doc._fields) {
    if (!entry.deleted) keys.push(path);
  }
  return keys.sort();
}

/**
 * Materialise the document as a plain `Record<string, unknown>`.
 * Deleted fields are omitted.
 */
export function crdtToObject(doc: CrdtDocument): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [path, entry] of doc._fields) {
    if (!entry.deleted) obj[path] = entry.value;
  }
  return obj;
}

// ── Merge ─────────────────────────────────────────────────────────────────────

/**
 * Apply a remote `CrdtOp` to a local document.
 * Advances the local clock to `max(local, op.clock)` to maintain causality.
 *
 * Conflict resolution: higher clock wins; tie-break by lexicographic clientId.
 * Returns `true` when the op changed the document state.
 */
export function applyOp(doc: CrdtDocument, op: CrdtOp): boolean {
  // Advance local clock
  if (op.clock > doc.clock) doc.clock = op.clock;

  const existing = doc._fields.get(op.path);
  if (existing) {
    // Conflict resolution: higher clock wins
    if (op.clock < existing.clock) return false;
    if (op.clock === existing.clock && op.clientId <= existing.clientId) return false;
  }

  doc._fields.set(op.path, {
    value: op.value,
    clientId: op.clientId,
    clock: op.clock,
    deleted: op.value === null,
  });
  return true;
}

/**
 * Merge a sequence of remote ops into a local document.
 * Ops are applied in order; each may or may not change the document.
 * Returns the number of ops that actually changed the document state.
 */
export function mergeOps(doc: CrdtDocument, ops: CrdtOp[]): number {
  let changed = 0;
  for (const op of ops) {
    if (applyOp(doc, op)) changed++;
  }
  return changed;
}

// ── Serialisation ─────────────────────────────────────────────────────────────

/** Serialise ops to a JSON string for network transport. */
export function serializeOps(ops: CrdtOp[]): string {
  return JSON.stringify(ops);
}

/** Deserialise ops from a JSON string. Throws on invalid input. */
export function deserializeOps(json: string): CrdtOp[] {
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) throw new TypeError('Expected an array of ops');
  return parsed.map((item, i) => {
    if (
      typeof item !== 'object' ||
      item === null ||
      typeof (item as Record<string, unknown>)['clientId'] !== 'string' ||
      typeof (item as Record<string, unknown>)['clock'] !== 'number' ||
      typeof (item as Record<string, unknown>)['path'] !== 'string'
    ) {
      throw new TypeError(`Invalid op at index ${i}`);
    }
    const op = item as Record<string, unknown>;
    return {
      clientId: op['clientId'] as string,
      clock: op['clock'] as number,
      path: op['path'] as string,
      value: op['value'] ?? null,
    } satisfies CrdtOp;
  });
}

// ── Snapshot export for IDB persistence ───────────────────────────────────────

export interface CrdtSnapshot {
  clientId: string;
  clock: number;
  fields: { path: string; value: unknown; clientId: string; clock: number; deleted: boolean }[];
}

/** Export the document to a plain object suitable for IDB storage. */
export function exportSnapshot(doc: CrdtDocument): CrdtSnapshot {
  return {
    clientId: doc.clientId,
    clock: doc.clock,
    fields: [...doc._fields.entries()].map(([path, e]) => ({
      path,
      value: e.value,
      clientId: e.clientId,
      clock: e.clock,
      deleted: e.deleted,
    })),
  };
}

/** Reconstruct a `CrdtDocument` from a previously exported snapshot. */
export function importSnapshot(snapshot: CrdtSnapshot): CrdtDocument {
  const doc = createCrdtDocument(snapshot.clientId);
  doc.clock = snapshot.clock;
  for (const f of snapshot.fields) {
    doc._fields.set(f.path, {
      value: f.value,
      clientId: f.clientId,
      clock: f.clock,
      deleted: f.deleted,
    });
  }
  return doc;
}
