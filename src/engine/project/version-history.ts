/**
 * Sprint 165 — Version History & Branching.
 *
 * Git-like version branching for design exploration. Allows users to create
 * snapshots of their cabinet designs, branch off to explore alternatives,
 * and merge changes back.
 *
 * Features:
 *   - Immutable version snapshots with metadata
 *   - Branch creation from any version
 *   - Linear history traversal (parent chain)
 *   - Branch listing and switching
 *   - Three-way merge (common ancestor detection)
 *   - Conflict detection on merge
 *   - Version diff between any two snapshots
 *   - Tag support for marking important versions
 *
 * Pure TypeScript — no React, no DOM, no side effects.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** A version snapshot of a design. */
export interface VersionSnapshot {
  /** Unique version ID. */
  id: string;
  /** Branch this version belongs to. */
  branchId: string;
  /** Parent version ID (null for root). */
  parentId: string | null;
  /** ISO 8601 timestamp. */
  createdAt: string;
  /** User-supplied commit message. */
  message: string;
  /** Serialised design state (opaque JSON string). */
  data: string;
  /** Optional tags. */
  tags: string[];
}

/** A branch in the version tree. */
export interface VersionBranch {
  /** Unique branch ID. */
  id: string;
  /** Human-readable branch name. */
  name: string;
  /** ID of the version this branch was created from. */
  forkPointId: string | null;
  /** Head version ID (latest on this branch). */
  headId: string;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
}

/** The full version history tree. */
export interface VersionHistory {
  /** All versions indexed by ID. */
  versions: Map<string, VersionSnapshot>;
  /** All branches indexed by ID. */
  branches: Map<string, VersionBranch>;
  /** Currently active branch ID. */
  activeBranchId: string;
}

/** Result of comparing two versions. */
export interface VersionDiff {
  /** Source version ID. */
  fromId: string;
  /** Target version ID. */
  toId: string;
  /** Number of fields changed. */
  changedFields: number;
  /** Changed field paths. */
  changes: DiffEntry[];
}

/** A single diff entry. */
export interface DiffEntry {
  /** JSON path of the changed field. */
  path: string;
  /** Type of change. */
  type: 'added' | 'removed' | 'modified';
  /** Old value (undefined for added). */
  oldValue?: unknown;
  /** New value (undefined for removed). */
  newValue?: unknown;
}

/** Merge result. */
export interface MergeResult {
  /** Whether the merge succeeded without conflicts. */
  success: boolean;
  /** Merged data (null if conflicts). */
  mergedData: string | null;
  /** Conflicts that need manual resolution. */
  conflicts: MergeConflict[];
}

/** A merge conflict. */
export interface MergeConflict {
  /** JSON path of the conflicting field. */
  path: string;
  /** Value in the base (common ancestor). */
  baseValue: unknown;
  /** Value in the source branch. */
  sourceValue: unknown;
  /** Value in the target branch. */
  targetValue: unknown;
}

/** ID generator function type. */
export type IdGenerator = () => string;

// ─── Constants ────────────────────────────────────────────────────────────────

/** Default branch name. */
export const DEFAULT_BRANCH_NAME = 'main';

/** Maximum branches per history. */
export const MAX_BRANCHES = 50;

/** Maximum versions per history. */
export const MAX_VERSIONS = 1000;

// ─── Core functions ───────────────────────────────────────────────────────────

/**
 * Create a new empty version history with an initial commit.
 *
 * @param initialData  Serialised initial design state.
 * @param message      Initial commit message.
 * @param idGen        ID generator.
 * @returns New version history.
 */
export function createHistory(initialData: string, message: string, idGen: IdGenerator = defaultIdGen): VersionHistory {
  if (!initialData) {
    throw new RangeError('createHistory: initialData must not be empty');
  }
  const versionId = idGen();
  const branchId = idGen();

  const version: VersionSnapshot = {
    id: versionId,
    branchId,
    parentId: null,
    createdAt: new Date().toISOString(),
    message: message || 'Initial version',
    data: initialData,
    tags: [],
  };

  const branch: VersionBranch = {
    id: branchId,
    name: DEFAULT_BRANCH_NAME,
    forkPointId: null,
    headId: versionId,
    createdAt: new Date().toISOString(),
  };

  const versions = new Map<string, VersionSnapshot>();
  versions.set(versionId, version);
  const branches = new Map<string, VersionBranch>();
  branches.set(branchId, branch);

  return { versions, branches, activeBranchId: branchId };
}

/**
 * Commit a new version to the active branch.
 *
 * @param history  Current history.
 * @param data     Serialised design state.
 * @param message  Commit message.
 * @param idGen    ID generator.
 * @returns Updated history.
 * @throws RangeError if max versions exceeded.
 */
export function commit(
  history: VersionHistory,
  data: string,
  message: string,
  idGen: IdGenerator = defaultIdGen,
): VersionHistory {
  if (history.versions.size >= MAX_VERSIONS) {
    throw new RangeError(`commit: versions exceed maximum of ${MAX_VERSIONS}`);
  }
  if (!message || message.trim().length === 0) {
    throw new RangeError('commit: message must not be empty');
  }

  const branch = history.branches.get(history.activeBranchId)!;
  const versionId = idGen();

  const version: VersionSnapshot = {
    id: versionId,
    branchId: branch.id,
    parentId: branch.headId,
    createdAt: new Date().toISOString(),
    message: message.trim(),
    data,
    tags: [],
  };

  const versions = new Map(history.versions);
  versions.set(versionId, version);

  const branches = new Map(history.branches);
  branches.set(branch.id, { ...branch, headId: versionId });

  return { ...history, versions, branches };
}

/**
 * Create a new branch from a given version.
 *
 * @param history    Current history.
 * @param name       Branch name.
 * @param fromId     Version ID to branch from.
 * @param idGen      ID generator.
 * @returns Updated history with new branch as active.
 * @throws RangeError if max branches exceeded or name empty.
 */
export function createBranch(
  history: VersionHistory,
  name: string,
  fromId: string,
  idGen: IdGenerator = defaultIdGen,
): VersionHistory {
  if (history.branches.size >= MAX_BRANCHES) {
    throw new RangeError(`createBranch: branches exceed maximum of ${MAX_BRANCHES}`);
  }
  if (!name || name.trim().length === 0) {
    throw new RangeError('createBranch: name must not be empty');
  }
  if (!history.versions.has(fromId)) {
    throw new RangeError(`createBranch: version "${fromId}" not found`);
  }
  // Check duplicate names
  for (const b of history.branches.values()) {
    if (b.name === name.trim()) {
      throw new RangeError(`createBranch: branch "${name}" already exists`);
    }
  }

  const branchId = idGen();
  const branch: VersionBranch = {
    id: branchId,
    name: name.trim(),
    forkPointId: fromId,
    headId: fromId,
    createdAt: new Date().toISOString(),
  };

  const branches = new Map(history.branches);
  branches.set(branchId, branch);

  return { ...history, branches, activeBranchId: branchId };
}

/**
 * Switch the active branch.
 *
 * @param history    Current history.
 * @param branchId   Branch ID to switch to.
 * @returns Updated history.
 */
export function switchBranch(history: VersionHistory, branchId: string): VersionHistory {
  if (!history.branches.has(branchId)) {
    throw new RangeError(`switchBranch: branch "${branchId}" not found`);
  }
  return { ...history, activeBranchId: branchId };
}

/**
 * Get the version history (parent chain) of the active branch head.
 *
 * @param history  Current history.
 * @returns Ordered list of versions from head to root.
 */
export function getLog(history: VersionHistory): VersionSnapshot[] {
  const branch = history.branches.get(history.activeBranchId)!;
  const log: VersionSnapshot[] = [];
  let currentId: string | null = branch.headId;

  while (currentId) {
    const version = history.versions.get(currentId);
    if (!version) break;
    log.push(version);
    currentId = version.parentId;
  }

  return log;
}

/**
 * Tag a version.
 *
 * @param history    Current history.
 * @param versionId  Version to tag.
 * @param tag        Tag string.
 * @returns Updated history.
 */
export function tagVersion(history: VersionHistory, versionId: string, tag: string): VersionHistory {
  if (!tag || tag.trim().length === 0) {
    throw new RangeError('tagVersion: tag must not be empty');
  }
  const version = history.versions.get(versionId);
  if (!version) {
    throw new RangeError(`tagVersion: version "${versionId}" not found`);
  }

  const updated = { ...version, tags: [...version.tags, tag.trim()] };
  const versions = new Map(history.versions);
  versions.set(versionId, updated);

  return { ...history, versions };
}

/**
 * Diff two versions by comparing their serialised data.
 *
 * @param history  Current history.
 * @param fromId   Source version ID.
 * @param toId     Target version ID.
 * @returns Diff result.
 */
export function diffVersions(history: VersionHistory, fromId: string, toId: string): VersionDiff {
  const from = history.versions.get(fromId);
  const to = history.versions.get(toId);
  if (!from) throw new RangeError(`diffVersions: version "${fromId}" not found`);
  if (!to) throw new RangeError(`diffVersions: version "${toId}" not found`);

  const fromObj = JSON.parse(from.data) as Record<string, unknown>;
  const toObj = JSON.parse(to.data) as Record<string, unknown>;

  const changes = computeDiff(fromObj, toObj, '');

  return { fromId, toId, changedFields: changes.length, changes };
}

/**
 * Attempt a three-way merge between source branch head and target branch head.
 *
 * @param history      Current history.
 * @param sourceBranchId  Branch to merge from.
 * @param targetBranchId  Branch to merge into.
 * @returns Merge result.
 */
export function mergeBranches(history: VersionHistory, sourceBranchId: string, targetBranchId: string): MergeResult {
  const source = history.branches.get(sourceBranchId);
  const target = history.branches.get(targetBranchId);
  if (!source) throw new RangeError(`mergeBranches: source branch "${sourceBranchId}" not found`);
  if (!target) throw new RangeError(`mergeBranches: target branch "${targetBranchId}" not found`);

  const sourceVersion = history.versions.get(source.headId)!;
  const targetVersion = history.versions.get(target.headId)!;

  // Find common ancestor
  const baseId = findCommonAncestor(history, source.headId, target.headId);
  if (!baseId) {
    // No common ancestor — just use target as base (treat as diverged)
    return {
      success: true,
      mergedData: sourceVersion.data,
      conflicts: [],
    };
  }

  const baseVersion = history.versions.get(baseId)!;
  const baseObj = JSON.parse(baseVersion.data) as Record<string, unknown>;
  const sourceObj = JSON.parse(sourceVersion.data) as Record<string, unknown>;
  const targetObj = JSON.parse(targetVersion.data) as Record<string, unknown>;

  return threeWayMerge(baseObj, sourceObj, targetObj);
}

/**
 * List all branch names with their head version.
 *
 * @param history  Current history.
 * @returns Array of branch info.
 */
export function listBranches(
  history: VersionHistory,
): Array<{ id: string; name: string; headId: string; isActive: boolean }> {
  const result: Array<{ id: string; name: string; headId: string; isActive: boolean }> = [];
  for (const branch of history.branches.values()) {
    result.push({
      id: branch.id,
      name: branch.name,
      headId: branch.headId,
      isActive: branch.id === history.activeBranchId,
    });
  }
  return result;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

let idSeq = 0;
function defaultIdGen(): string {
  return `v-${Date.now()}-${++idSeq}`;
}

function computeDiff(from: Record<string, unknown>, to: Record<string, unknown>, prefix: string): DiffEntry[] {
  const changes: DiffEntry[] = [];
  const allKeys = new Set([...Object.keys(from), ...Object.keys(to)]);

  for (const key of allKeys) {
    const path = prefix ? `${prefix}.${key}` : key;
    const hasFrom = key in from;
    const hasTo = key in to;

    if (!hasFrom && hasTo) {
      changes.push({ path, type: 'added', newValue: to[key] });
    } else if (hasFrom && !hasTo) {
      changes.push({ path, type: 'removed', oldValue: from[key] });
    } else if (hasFrom && hasTo) {
      const fromVal = from[key];
      const toVal = to[key];
      if (isPlainObject(fromVal) && isPlainObject(toVal)) {
        changes.push(...computeDiff(fromVal as Record<string, unknown>, toVal as Record<string, unknown>, path));
      } else if (JSON.stringify(fromVal) !== JSON.stringify(toVal)) {
        changes.push({ path, type: 'modified', oldValue: fromVal, newValue: toVal });
      }
    }
  }

  return changes;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function findCommonAncestor(history: VersionHistory, aId: string, bId: string): string | null {
  const ancestorsA = new Set<string>();
  let current: string | null = aId;
  while (current) {
    ancestorsA.add(current);
    const v = history.versions.get(current);
    current = v?.parentId ?? null;
  }

  current = bId;
  while (current) {
    if (ancestorsA.has(current)) return current;
    const v = history.versions.get(current);
    current = v?.parentId ?? null;
  }

  return null;
}

function threeWayMerge(
  base: Record<string, unknown>,
  source: Record<string, unknown>,
  target: Record<string, unknown>,
): MergeResult {
  const conflicts: MergeConflict[] = [];
  const merged: Record<string, unknown> = { ...target };
  const allKeys = new Set([...Object.keys(base), ...Object.keys(source), ...Object.keys(target)]);

  for (const key of allKeys) {
    const baseVal = base[key];
    const sourceVal = source[key];
    const targetVal = target[key];

    const baseStr = JSON.stringify(baseVal);
    const sourceStr = JSON.stringify(sourceVal);
    const targetStr = JSON.stringify(targetVal);

    if (sourceStr === baseStr) {
      // Source unchanged — keep target
      continue;
    }
    if (targetStr === baseStr) {
      // Target unchanged — take source
      merged[key] = sourceVal;
    } else if (sourceStr === targetStr) {
      // Both changed same way — no conflict
      continue;
    } else {
      // True conflict
      conflicts.push({
        path: key,
        baseValue: baseVal,
        sourceValue: sourceVal,
        targetValue: targetVal,
      });
    }
  }

  if (conflicts.length > 0) {
    return { success: false, mergedData: null, conflicts };
  }

  return { success: true, mergedData: JSON.stringify(merged), conflicts: [] };
}
