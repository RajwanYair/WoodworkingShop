/**
 * Sprint 40 — Snapshot version tags engine.
 *
 * Tags project snapshots (named checkpoints) with user-defined labels and
 * provides diff-summary helpers so the user can see what changed between
 * two tagged snapshots.
 *
 * A "snapshot" in this context is a lightweight metadata record that stores
 * the project version number, a user tag, and an ISO-8601 timestamp.
 * Actual deep-copy project data is NOT stored here — callers store the
 * project JSON separately and reference it by snapshotId.
 *
 * Pure function — no React, no side effects.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SnapshotTag {
  id: string;
  /** Short user-defined label, max 80 chars. */
  label: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
  /** Semantic version string at the time the snapshot was taken, e.g. "3.66.1". */
  projectVersion: string;
  /** Optional longer description. */
  description?: string;
}

export interface SnapshotStore {
  tags: SnapshotTag[];
}

export type SnapshotError =
  | { code: 'LABEL_TOO_LONG'; message: string }
  | { code: 'SNAPSHOT_NOT_FOUND'; message: string }
  | { code: 'DUPLICATE_LABEL'; message: string };

/** Max label length in characters. */
export const MAX_SNAPSHOT_LABEL_LENGTH = 80;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ─── Core ─────────────────────────────────────────────────────────────────────
/** Create an empty, immutable-style snapshot store. */ export function createSnapshotStore(): SnapshotStore {
  return { tags: [] };
}

/**
 * Add a new snapshot tag.
 * Returns the updated store + new tag, or an error.
 */
export function addSnapshot(
  store: SnapshotStore,
  label: string,
  projectVersion: string,
  description?: string,
): { store: SnapshotStore; tag: SnapshotTag } | { error: SnapshotError } {
  if (label.length > MAX_SNAPSHOT_LABEL_LENGTH) {
    return {
      error: { code: 'LABEL_TOO_LONG', message: `Label exceeds ${MAX_SNAPSHOT_LABEL_LENGTH} character limit.` },
    };
  }
  if (store.tags.some((t) => t.label === label)) {
    return { error: { code: 'DUPLICATE_LABEL', message: `A snapshot with label "${label}" already exists.` } };
  }
  const tag: SnapshotTag = {
    id: generateId(),
    label,
    createdAt: new Date().toISOString(),
    projectVersion,
    description,
  };
  return { store: { tags: [...store.tags, tag] }, tag };
}

/**
 * Remove a snapshot tag by id.
 * Returns the updated store, or SNAPSHOT_NOT_FOUND.
 */
export function removeSnapshot(
  store: SnapshotStore,
  snapshotId: string,
): { store: SnapshotStore } | { error: SnapshotError } {
  const idx = store.tags.findIndex((t) => t.id === snapshotId);
  if (idx === -1) {
    return { error: { code: 'SNAPSHOT_NOT_FOUND', message: `Snapshot ${snapshotId} not found.` } };
  }
  return { store: { tags: store.tags.filter((t) => t.id !== snapshotId) } };
}

/**
 * Rename a snapshot label.
 * Returns the updated store or an error.
 */
export function renameSnapshot(
  store: SnapshotStore,
  snapshotId: string,
  newLabel: string,
): { store: SnapshotStore } | { error: SnapshotError } {
  if (newLabel.length > MAX_SNAPSHOT_LABEL_LENGTH) {
    return {
      error: { code: 'LABEL_TOO_LONG', message: `Label exceeds ${MAX_SNAPSHOT_LABEL_LENGTH} character limit.` },
    };
  }
  if (store.tags.some((t) => t.label === newLabel && t.id !== snapshotId)) {
    return { error: { code: 'DUPLICATE_LABEL', message: `A snapshot with label "${newLabel}" already exists.` } };
  }
  const idx = store.tags.findIndex((t) => t.id === snapshotId);
  if (idx === -1) {
    return { error: { code: 'SNAPSHOT_NOT_FOUND', message: `Snapshot ${snapshotId} not found.` } };
  }
  const updated = [...store.tags];
  updated[idx] = { ...updated[idx], label: newLabel };
  return { store: { tags: updated } };
}

/** Find a snapshot tag by label (case-insensitive). */
export function findSnapshotByLabel(store: SnapshotStore, label: string): SnapshotTag | undefined {
  return store.tags.find((t) => t.label.toLowerCase() === label.toLowerCase());
}

/** Return tags sorted by creation date (newest first). */
export function getSnapshotsSorted(store: SnapshotStore): SnapshotTag[] {
  return [...store.tags].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Produce a brief textual diff summary between two snapshots.
 * Compares labels, versions, and timestamps.
 */
export function snapshotDiffSummary(from: SnapshotTag, to: SnapshotTag): string {
  const lines: string[] = [`Snapshot diff: "${from.label}" → "${to.label}"`];
  if (from.projectVersion !== to.projectVersion) {
    lines.push(`  Version: ${from.projectVersion} → ${to.projectVersion}`);
  }
  lines.push(`  From: ${from.createdAt}`);
  lines.push(`  To:   ${to.createdAt}`);
  return lines.join('\n');
}
