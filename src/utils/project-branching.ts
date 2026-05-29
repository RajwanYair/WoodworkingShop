/**
 * Project Branching — Phase 14 / Sprint 10
 *
 * Fork a saved project to an independent branch (separate IDB entry).
 * Branches remember their parent via `parentId`.  A visual diff shows what
 * changed between base and branch.  A simple merge replaces the target
 * project's cabinet list with the branch's.
 *
 * Mental model: Git branching, adapted for non-technical cabinet makers.
 *   fork   → branch off from a saved project
 *   diff   → see what changed
 *   merge  → accept all branch changes into the base (no conflict resolution)
 */

import type { CabinetEntry } from '../store/cabinet-store';
import { cloneJson } from './browser-compat';
import { listProjects } from './project-storage';
import { idbLoadProjects, idbSaveProjects } from './indexed-db-storage';
import type { SavedProject } from './project-storage';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BranchedProject extends SavedProject {
  /** ID of the project this branch was forked from. */
  parentId: string;
  /** User-visible branch label, e.g. 'wider-doors'. */
  branchName: string;
}

/** Per-cabinet change record in a project diff. */
export interface CabinetDiff {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  cabinetId: string;
  cabinetLabel: string;
  /** Field paths that differ (populated for 'modified'). */
  changedFields: string[];
}

/** Top-level diff result between two projects. */
export interface ProjectDiff {
  baseId: string;
  branchId: string;
  baseName: string;
  branchName: string;
  nameDiffers: boolean;
  cabinets: CabinetDiff[];
  /** Total number of added + removed + modified cabinets. */
  totalChanges: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function newId(prefix: string): string {
  const arr = new Uint8Array(4);
  crypto.getRandomValues(arr);
  return `${prefix}-${Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

async function loadAll(): Promise<SavedProject[]> {
  return idbLoadProjects<SavedProject>();
}

async function saveAll(projects: SavedProject[]): Promise<void> {
  await idbSaveProjects(projects);
}

// ── Fork ──────────────────────────────────────────────────────────────────────

/**
 * Fork an existing project into a new independent branch stored in IDB.
 *
 * @param parentId   ID of the project to fork.
 * @param branchName Human-readable label for the branch (default: 'Branch of <name>').
 * @returns The newly created {@link BranchedProject}.
 * @throws When the parent project is not found.
 */
export async function forkProject(parentId: string, branchName?: string): Promise<BranchedProject> {
  const all = await loadAll();
  const parent = all.find((p) => p.id === parentId);
  if (!parent) throw new Error(`Project '${parentId}' not found`);

  const branch: BranchedProject = {
    ...cloneJson(parent),
    id: newId('branch'),
    parentId,
    branchName: branchName?.trim() || `Branch of ${parent.name}`,
    name: branchName?.trim() || `${parent.name} (branch)`,
    savedAt: new Date().toISOString(),
  };
  await saveAll([...all, branch]);
  return branch;
}

// ── Branch queries ────────────────────────────────────────────────────────────

/** Return all branches forked from a given parent project ID. */
export async function listBranchesOf(parentId: string): Promise<BranchedProject[]> {
  const all = await loadAll();
  return all.filter((p): p is BranchedProject => 'parentId' in p && (p as BranchedProject).parentId === parentId);
}

/** Check whether a project is a branch (has a `parentId` field). */
export function isBranch(project: SavedProject): project is BranchedProject {
  return 'parentId' in project && typeof (project as BranchedProject).parentId === 'string';
}

// ── Diff ──────────────────────────────────────────────────────────────────────

/**
 * Compare two projects and return a structured {@link ProjectDiff}.
 * Cabinet identity is determined by cabinet `id` field when present,
 * falling back to index-based comparison.
 *
 * @throws When either project ID is not found.
 */
export async function diffProjects(baseId: string, branchId: string): Promise<ProjectDiff> {
  const all = await loadAll();
  const base = all.find((p) => p.id === baseId);
  const branch = all.find((p) => p.id === branchId);
  if (!base) throw new Error(`Project '${baseId}' not found`);
  if (!branch) throw new Error(`Project '${branchId}' not found`);

  const cabDiffs: CabinetDiff[] = diffCabinetLists(base.cabinets, branch.cabinets);
  const totalChanges = cabDiffs.filter((d) => d.type !== 'unchanged').length;

  return {
    baseId,
    branchId,
    baseName: base.name,
    branchName: isBranch(branch) ? branch.branchName : branch.name,
    nameDiffers: base.name !== branch.name,
    cabinets: cabDiffs,
    totalChanges,
  };
}

/** Diff two cabinet lists, keyed by cabinet `name` (the unique identity field). */
export function diffCabinetLists(
  baseCabs: readonly CabinetEntry[],
  branchCabs: readonly CabinetEntry[],
): CabinetDiff[] {
  const results: CabinetDiff[] = [];

  const baseMap = new Map(baseCabs.map((c, i) => [c.name || `__idx_${i}`, c]));
  const branchMap = new Map(branchCabs.map((c, i) => [c.name || `__idx_${i}`, c]));

  // Cabinets in base
  for (const [key, baseCab] of baseMap) {
    const branchCab = branchMap.get(key);
    if (!branchCab) {
      results.push({ type: 'removed', cabinetId: key, cabinetLabel: _cabLabel(baseCab), changedFields: [] });
    } else {
      const changed = _diffCabinet(baseCab, branchCab);
      results.push({
        type: changed.length > 0 ? 'modified' : 'unchanged',
        cabinetId: key,
        cabinetLabel: _cabLabel(baseCab),
        changedFields: changed,
      });
    }
  }

  // Cabinets only in branch
  for (const [key, branchCab] of branchMap) {
    if (!baseMap.has(key)) {
      results.push({ type: 'added', cabinetId: key, cabinetLabel: _cabLabel(branchCab), changedFields: [] });
    }
  }

  return results;
}

// ── Merge ─────────────────────────────────────────────────────────────────────

/**
 * Merge a branch into a target project by replacing the target's cabinet list.
 * This is a "take all theirs" merge — no conflict resolution.
 *
 * @param branchId  The branch to merge from.
 * @param targetId  The project to merge into (typically the original parent).
 * @returns The updated target project.
 * @throws When either ID is not found, or branchId === targetId.
 */
export async function mergeBranch(branchId: string, targetId: string): Promise<SavedProject> {
  if (branchId === targetId) throw new Error('Cannot merge a project into itself');
  const all = await loadAll();
  const branch = all.find((p) => p.id === branchId);
  const targetIdx = all.findIndex((p) => p.id === targetId);
  if (!branch) throw new Error(`Branch '${branchId}' not found`);
  if (targetIdx < 0) throw new Error(`Target project '${targetId}' not found`);

  const updated: SavedProject = {
    ...all[targetIdx],
    cabinets: cloneJson(branch.cabinets),
    savedAt: new Date().toISOString(),
  };
  const newAll = [...all];
  newAll[targetIdx] = updated;
  await saveAll(newAll);
  return updated;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function _cabLabel(cab: CabinetEntry): string {
  return cab.name || cab.config?.furnitureType || 'Cabinet';
}

/** Return field paths that differ between two cabinet entries (shallow compare). */
function _diffCabinet(a: CabinetEntry, b: CabinetEntry): string[] {
  const changed: string[] = [];
  const configA = a.config ?? {};
  const configB = b.config ?? {};
  const allKeys = new Set([...Object.keys(configA), ...Object.keys(configB)]);
  for (const key of allKeys) {
    const va = (configA as unknown as Record<string, unknown>)[key];
    const vb = (configB as unknown as Record<string, unknown>)[key];
    if (JSON.stringify(va) !== JSON.stringify(vb)) {
      changed.push(`config.${key}`);
    }
  }
  return changed;
}

// Re-export listProjects for convenience (avoids extra import in consumers)
export { listProjects };
