import { describe, it, expect } from 'vitest';
import {
  createWorkspace,
  addProject,
  removeProject,
  activateTab,
  getActiveProject,
  shareWorkspaceMaterial,
  resolveSharedMaterials,
  exportWorkspace,
  importWorkspace,
  updateProjectConfig,
} from '../../src/engine/workspace';
import type { WorkspaceProject } from '../../src/engine/workspace';
import { cfg } from '../helpers';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeProject(id: string, name = `Project ${id}`): WorkspaceProject {
  return { id, name, config: cfg({ width: 600 }), updatedAt: '2024-01-01T00:00:00.000Z' };
}

// ─── createWorkspace ──────────────────────────────────────────────────────────

describe('createWorkspace', () => {
  it('returns a workspace with correct id, name and empty collections', () => {
    const ws = createWorkspace('ws1', 'My Workshop');
    expect(ws.id).toBe('ws1');
    expect(ws.name).toBe('My Workshop');
    expect(ws.projects).toHaveLength(0);
    expect(ws.tabs).toHaveLength(0);
    expect(ws.activeProjectId).toBe('');
  });

  it.each([
    ['empty id', '', 'Workshop'],
    ['empty name', 'ws1', ''],
    ['whitespace id', '   ', 'Workshop'],
    ['whitespace name', 'ws1', '   '],
  ])('throws RangeError for %s', (_label, id, name) => {
    expect(() => createWorkspace(id, name)).toThrow(RangeError);
  });
});

// ─── addProject ───────────────────────────────────────────────────────────────

describe('addProject', () => {
  it('adds a project and sets it as active tab', () => {
    const ws = createWorkspace('ws1', 'Workshop');
    const ws2 = addProject(ws, makeProject('p1'));
    expect(ws2.projects).toHaveLength(1);
    expect(ws2.activeProjectId).toBe('p1');
    expect(ws2.tabs).toHaveLength(1);
    expect(ws2.tabs[0]?.label).toBe('Project p1');
  });

  it('activates the last added project', () => {
    let ws = createWorkspace('ws1', 'Workshop');
    ws = addProject(ws, makeProject('p1'));
    ws = addProject(ws, makeProject('p2'));
    expect(ws.activeProjectId).toBe('p2');
    expect(ws.projects).toHaveLength(2);
  });

  it('throws RangeError for duplicate project id', () => {
    let ws = createWorkspace('ws1', 'Workshop');
    ws = addProject(ws, makeProject('p1'));
    expect(() => addProject(ws, makeProject('p1'))).toThrow(RangeError);
  });
});

// ─── removeProject ────────────────────────────────────────────────────────────

describe('removeProject', () => {
  it('removes the project and its tab', () => {
    let ws = createWorkspace('ws1', 'Workshop');
    ws = addProject(ws, makeProject('p1'));
    ws = addProject(ws, makeProject('p2'));
    ws = removeProject(ws, 'p1');
    expect(ws.projects.some((p) => p.id === 'p1')).toBe(false);
    expect(ws.tabs.some((t) => t.projectId === 'p1')).toBe(false);
  });

  it('shifts activeProjectId to last remaining tab when active is removed', () => {
    let ws = createWorkspace('ws1', 'Workshop');
    ws = addProject(ws, makeProject('p1'));
    ws = addProject(ws, makeProject('p2'));
    ws = removeProject(ws, 'p2');
    expect(ws.activeProjectId).toBe('p1');
  });

  it('sets activeProjectId to empty string when last project is removed', () => {
    let ws = createWorkspace('ws1', 'Workshop');
    ws = addProject(ws, makeProject('p1'));
    ws = removeProject(ws, 'p1');
    expect(ws.activeProjectId).toBe('');
  });

  it('throws RangeError for unknown project id', () => {
    const ws = createWorkspace('ws1', 'Workshop');
    expect(() => removeProject(ws, 'ghost')).toThrow(RangeError);
  });
});

// ─── activateTab ─────────────────────────────────────────────────────────────

describe('activateTab', () => {
  it('sets the active project', () => {
    let ws = createWorkspace('ws1', 'Workshop');
    ws = addProject(ws, makeProject('p1'));
    ws = addProject(ws, makeProject('p2'));
    ws = activateTab(ws, 'p1');
    expect(ws.activeProjectId).toBe('p1');
  });

  it('throws RangeError for unknown project', () => {
    const ws = createWorkspace('ws1', 'Workshop');
    expect(() => activateTab(ws, 'ghost')).toThrow(RangeError);
  });
});

// ─── getActiveProject ─────────────────────────────────────────────────────────

describe('getActiveProject', () => {
  it('returns the active project', () => {
    let ws = createWorkspace('ws1', 'Workshop');
    ws = addProject(ws, makeProject('p1', 'Kitchen'));
    expect(getActiveProject(ws)?.name).toBe('Kitchen');
  });

  it('returns undefined when no active project', () => {
    const ws = createWorkspace('ws1', 'Workshop');
    expect(getActiveProject(ws)).toBeUndefined();
  });
});

// ─── shareWorkspaceMaterial ───────────────────────────────────────────────────

describe('shareWorkspaceMaterial', () => {
  it('adds a shared material entry', () => {
    let ws = createWorkspace('ws1', 'Workshop');
    ws = addProject(ws, makeProject('p1'));
    ws = addProject(ws, makeProject('p2'));
    ws = shareWorkspaceMaterial(ws, 'plywood-18', ['p1', 'p2']);
    expect(ws.sharedMaterials).toHaveLength(1);
    expect(ws.sharedMaterials[0]?.materialKey).toBe('plywood-18');
  });

  it('merges project ids for an existing shared material', () => {
    let ws = createWorkspace('ws1', 'Workshop');
    ws = addProject(ws, makeProject('p1'));
    ws = addProject(ws, makeProject('p2'));
    ws = addProject(ws, makeProject('p3'));
    ws = shareWorkspaceMaterial(ws, 'plywood-18', ['p1']);
    ws = shareWorkspaceMaterial(ws, 'plywood-18', ['p2', 'p3']);
    expect(ws.sharedMaterials[0]?.projectIds).toEqual(['p1', 'p2', 'p3']);
  });

  it('throws RangeError for empty materialKey', () => {
    const ws = createWorkspace('ws1', 'Workshop');
    expect(() => shareWorkspaceMaterial(ws, '', [])).toThrow(RangeError);
  });

  it('throws RangeError for unknown project id', () => {
    const ws = createWorkspace('ws1', 'Workshop');
    expect(() => shareWorkspaceMaterial(ws, 'plywood-18', ['ghost'])).toThrow(RangeError);
  });
});

// ─── resolveSharedMaterials ───────────────────────────────────────────────────

describe('resolveSharedMaterials', () => {
  it('resolves shared material for participating project', () => {
    let ws = createWorkspace('ws1', 'Workshop');
    ws = addProject(ws, makeProject('p1'));
    ws = shareWorkspaceMaterial(ws, 'plywood-18', ['p1']);
    const resolved = resolveSharedMaterials(ws);
    expect(resolved['p1']).toBe('plywood-18');
  });

  it('falls back to project config.material for non-participating projects', () => {
    let ws = createWorkspace('ws1', 'Workshop');
    ws = addProject(ws, makeProject('p1'));
    ws = addProject(ws, makeProject('p2'));
    ws = shareWorkspaceMaterial(ws, 'plywood-18', ['p1']);
    const resolved = resolveSharedMaterials(ws);
    // p2 uses its own config.material (from DEFAULT_CONFIG via cfg())
    expect(resolved['p2']).toBeTruthy();
    expect(resolved['p2']).not.toBe('plywood-18');
  });

  it('returns empty record for workspace with no projects', () => {
    const ws = createWorkspace('ws1', 'Workshop');
    expect(resolveSharedMaterials(ws)).toEqual({});
  });
});

// ─── exportWorkspace / importWorkspace ───────────────────────────────────────

describe('exportWorkspace / importWorkspace', () => {
  it('round-trips a workspace', () => {
    let ws = createWorkspace('ws1', 'Workshop');
    ws = addProject(ws, makeProject('p1', 'Kitchen'));
    const json = exportWorkspace(ws);
    const restored = importWorkspace(json);
    expect(restored.id).toBe('ws1');
    expect(restored.projects[0]?.name).toBe('Kitchen');
  });

  it('throws RangeError for malformed JSON', () => {
    expect(() => importWorkspace('not json')).toThrow(RangeError);
  });

  it('throws RangeError for JSON without required id field', () => {
    expect(() => importWorkspace(JSON.stringify({ name: 'x', projects: [], tabs: [] }))).toThrow(RangeError);
  });

  it('throws RangeError for JSON without required name field', () => {
    expect(() => importWorkspace(JSON.stringify({ id: 'ws1', projects: [], tabs: [] }))).toThrow(RangeError);
  });

  it('throws RangeError for JSON without projects array', () => {
    expect(() => importWorkspace(JSON.stringify({ id: 'ws1', name: 'x', tabs: [] }))).toThrow(RangeError);
  });
});

// ─── updateProjectConfig ─────────────────────────────────────────────────────

describe('updateProjectConfig', () => {
  it('updates config for existing project', () => {
    let ws = createWorkspace('ws1', 'Workshop');
    ws = addProject(ws, makeProject('p1'));
    const newConfig = cfg({ width: 900 });
    ws = updateProjectConfig(ws, 'p1', newConfig);
    expect(ws.projects[0]?.config.width).toBe(900);
  });

  it('throws RangeError for unknown project id', () => {
    const ws = createWorkspace('ws1', 'Workshop');
    expect(() => updateProjectConfig(ws, 'ghost', cfg())).toThrow(RangeError);
  });
});

// ─── removeProject cleans up shared materials ─────────────────────────────────

describe('removeProject — shared material cleanup', () => {
  it('removes project id from sharedMaterials when project is deleted', () => {
    let ws = createWorkspace('ws1', 'Workshop');
    ws = addProject(ws, makeProject('p1'));
    ws = addProject(ws, makeProject('p2'));
    ws = shareWorkspaceMaterial(ws, 'plywood-18', ['p1', 'p2']);
    ws = removeProject(ws, 'p1');
    expect(ws.sharedMaterials[0]?.projectIds).toEqual(['p2']);
  });
});
