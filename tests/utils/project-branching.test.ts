/**
 * Project Branching — Phase 14 / Sprint 10
 *
 * Tests for src/utils/project-branching.ts
 * Uses fake-indexeddb (already in setup.ts) for IDB operations.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  forkProject,
  listBranchesOf,
  isBranch,
  diffProjects,
  diffCabinetLists,
  mergeBranch,
} from '../../src/utils/project-branching';
import { idbSaveProjects } from '../../src/utils/indexed-db-storage';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import type { SavedProject } from '../../src/utils/project-storage';
import type { CabinetEntry } from '../../src/store/cabinet-store';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCabinet(name: string, widthMm = 600): CabinetEntry {
  return { name, config: { ...DEFAULT_CONFIG, width: widthMm as never } };
}

function makeProject(id: string, name: string, cabinets: CabinetEntry[] = []): SavedProject {
  return { id, name, savedAt: new Date().toISOString(), cabinets };
}

async function seed(...projects: SavedProject[]): Promise<void> {
  await idbSaveProjects(projects);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('forkProject', () => {
  beforeEach(() => idbSaveProjects([]));

  it('creates a branch with a new ID', async () => {
    const parent = makeProject('proj-001', 'My Cabinet', [makeCabinet('Kitchen')]);
    await seed(parent);
    const branch = await forkProject('proj-001', 'wider-doors');
    expect(branch.id).not.toBe('proj-001');
    expect(branch.parentId).toBe('proj-001');
    expect(branch.branchName).toBe('wider-doors');
  });

  it('deep-copies cabinet list', async () => {
    const parent = makeProject('proj-002', 'Wardrobe', [makeCabinet('Main', 900)]);
    await seed(parent);
    const branch = await forkProject('proj-002');
    // Mutating branch cabinets should not affect parent
    branch.cabinets[0].config.width = 1200 as never;
    const { cabinets } = makeProject('proj-002', 'Wardrobe', [makeCabinet('Main', 900)]);
    expect(cabinets[0].config.width).toBe(900 as never);
  });

  it('uses default branch name when none given', async () => {
    await seed(makeProject('proj-003', 'Bathroom'));
    const branch = await forkProject('proj-003');
    expect(branch.branchName).toContain('Bathroom');
  });

  it('throws when parent project not found', async () => {
    await expect(forkProject('proj-missing')).rejects.toThrow('not found');
  });

  it('persists branch to IDB (listBranchesOf returns it)', async () => {
    await seed(makeProject('proj-004', 'Office', [makeCabinet('Desk')]));
    await forkProject('proj-004', 'glass-doors');
    const branches = await listBranchesOf('proj-004');
    expect(branches).toHaveLength(1);
    expect(branches[0].branchName).toBe('glass-doors');
  });

  it('branch id starts with branch- prefix', async () => {
    await seed(makeProject('proj-005', 'Studio'));
    const branch = await forkProject('proj-005');
    expect(branch.id).toMatch(/^branch-/);
  });
});

describe('listBranchesOf', () => {
  beforeEach(() => idbSaveProjects([]));

  it('returns empty array when no branches exist', async () => {
    await seed(makeProject('proj-010', 'Orphan'));
    expect(await listBranchesOf('proj-010')).toHaveLength(0);
  });

  it('returns only branches for the given parent', async () => {
    await seed(makeProject('proj-011', 'A'), makeProject('proj-012', 'B'));
    await forkProject('proj-011', 'fork-a1');
    await forkProject('proj-011', 'fork-a2');
    await forkProject('proj-012', 'fork-b1');
    const branchesOfA = await listBranchesOf('proj-011');
    expect(branchesOfA).toHaveLength(2);
    expect(branchesOfA.every((b) => b.parentId === 'proj-011')).toBe(true);
  });
});

describe('isBranch', () => {
  it('returns false for a plain project', () => {
    expect(isBranch(makeProject('p1', 'Plain'))).toBe(false);
  });

  it('returns true for a branched project', async () => {
    await idbSaveProjects([makeProject('p2', 'Base')]);
    const b = await forkProject('p2', 'test');
    expect(isBranch(b)).toBe(true);
  });
});

describe('diffCabinetLists', () => {
  it('unchanged when lists are identical', () => {
    const cabs = [makeCabinet('Kitchen'), makeCabinet('Pantry')];
    const result = diffCabinetLists(cabs, [...cabs]);
    expect(result.every((d) => d.type === 'unchanged')).toBe(true);
  });

  it('detects added cabinet', () => {
    const base = [makeCabinet('A')];
    const branch = [makeCabinet('A'), makeCabinet('B')];
    const result = diffCabinetLists(base, branch);
    const added = result.find((d) => d.type === 'added');
    expect(added?.cabinetId).toBe('B');
  });

  it('detects removed cabinet', () => {
    const base = [makeCabinet('A'), makeCabinet('B')];
    const branch = [makeCabinet('A')];
    const result = diffCabinetLists(base, branch);
    const removed = result.find((d) => d.type === 'removed');
    expect(removed?.cabinetId).toBe('B');
  });

  it('detects modified cabinet config', () => {
    const base = [makeCabinet('A', 600)];
    const branch = [makeCabinet('A', 900)];
    const result = diffCabinetLists(base, branch);
    const modified = result.find((d) => d.type === 'modified');
    expect(modified).toBeDefined();
    expect(modified!.changedFields.some((f) => f.includes('width'))).toBe(true);
  });

  it('handles empty lists without error', () => {
    expect(diffCabinetLists([], [])).toHaveLength(0);
  });
});

describe('diffProjects', () => {
  beforeEach(() => idbSaveProjects([]));

  it('reports totalChanges = 0 for identical projects', async () => {
    const cabs = [makeCabinet('K')];
    await seed(makeProject('pA', 'Same', cabs), makeProject('pB', 'Same', [...cabs]));
    const diff = await diffProjects('pA', 'pB');
    expect(diff.totalChanges).toBe(0);
  });

  it('nameDiffers is true when names differ', async () => {
    await seed(makeProject('pC', 'Alpha', []), makeProject('pD', 'Beta', []));
    const diff = await diffProjects('pC', 'pD');
    expect(diff.nameDiffers).toBe(true);
  });

  it('throws on unknown base ID', async () => {
    await seed(makeProject('pE', 'Exists'));
    await expect(diffProjects('ghost', 'pE')).rejects.toThrow('not found');
  });

  it('throws on unknown branch ID', async () => {
    await seed(makeProject('pF', 'Exists'));
    await expect(diffProjects('pF', 'ghost')).rejects.toThrow('not found');
  });
});

describe('mergeBranch', () => {
  beforeEach(() => idbSaveProjects([]));

  it('replaces target cabinets with branch cabinets', async () => {
    const base = makeProject('base-01', 'Base', [makeCabinet('Old', 600)]);
    await seed(base);
    const branch = await forkProject('base-01', 'new-style');
    branch.cabinets[0] = makeCabinet('New', 900);
    // Persist the modified branch
    const { idbLoadProjects, idbSaveProjects: saveAll } = await import('../../src/utils/indexed-db-storage');
    const all = await idbLoadProjects<SavedProject>();
    const idx = all.findIndex((p) => p.id === branch.id);
    all[idx] = branch;
    await saveAll(all);

    const merged = await mergeBranch(branch.id, 'base-01');
    expect(merged.cabinets[0].name).toBe('New');
    expect(merged.cabinets[0].config.width).toBe(900 as never);
  });

  it('throws when merging a project into itself', async () => {
    await seed(makeProject('self-01', 'Self'));
    await expect(mergeBranch('self-01', 'self-01')).rejects.toThrow('itself');
  });

  it('throws when branch not found', async () => {
    await seed(makeProject('target-01', 'Target'));
    await expect(mergeBranch('ghost-branch', 'target-01')).rejects.toThrow('not found');
  });

  it('throws when target not found', async () => {
    await seed(makeProject('branch-src', 'BranchSrc'));
    const b = await forkProject('branch-src');
    await expect(mergeBranch(b.id, 'ghost-target')).rejects.toThrow('not found');
  });
});
