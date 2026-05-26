/**
 * Sprint 124 — Multi-project workspace engine (Phase 28)
 *
 * Pure engine module — no React, no DOM, no side effects.
 * Manages multiple cabinet projects grouped in a workspace,
 * supporting tabs, cross-project material sharing, import/export.
 */

import type { CabinetConfig } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

/** A single named project within a workspace. */
export interface WorkspaceProject {
  /** Stable unique identifier (UUID-style slug). */
  id: string;
  /** Human-readable project name. */
  name: string;
  /** The cabinet configuration for this project. */
  config: CabinetConfig;
  /** ISO 8601 timestamp of last modification. */
  updatedAt: string;
  /** Optional free-form notes attached to this project. */
  notes?: string;
}

/** A tab reference pointing to a project by id. */
export interface WorkspaceTab {
  /** Project id this tab is linked to. */
  projectId: string;
  /** Display label for the tab (defaults to project name). */
  label: string;
}

/** Shared material override applied across projects. */
export interface SharedMaterial {
  /** Material key, e.g. `'melamine-18'`. */
  materialKey: string;
  /** Projects that have opted into this shared material. */
  projectIds: string[];
}

/** Top-level workspace container. */
export interface Workspace {
  /** Workspace-level unique identifier. */
  id: string;
  /** Workspace display name. */
  name: string;
  /** All projects in this workspace (ordered). */
  projects: WorkspaceProject[];
  /** Tab bar order (subset of project ids). */
  tabs: WorkspaceTab[];
  /** Currently active project id (or empty string if none). */
  activeProjectId: string;
  /** Shared material definitions. */
  sharedMaterials: SharedMaterial[];
  /** ISO 8601 timestamp of workspace creation. */
  createdAt: string;
  /** ISO 8601 timestamp of last modification. */
  updatedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString();
}

function requireProject(workspace: Workspace, projectId: string): WorkspaceProject {
  const project = workspace.projects.find((p) => p.id === projectId);
  if (!project) throw new RangeError(`Project not found: ${projectId}`);
  return project;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Create a new empty workspace.
 *
 * @param id    Unique workspace identifier.
 * @param name  Display name.
 */
export function createWorkspace(id: string, name: string): Workspace {
  if (!id.trim()) throw new RangeError('Workspace id must not be empty');
  if (!name.trim()) throw new RangeError('Workspace name must not be empty');
  const ts = now();
  return {
    id,
    name,
    projects: [],
    tabs: [],
    activeProjectId: '',
    sharedMaterials: [],
    createdAt: ts,
    updatedAt: ts,
  };
}

/**
 * Add a project to the workspace.
 * Also opens a new tab and activates it.
 *
 * @returns A new Workspace with the project added.
 */
export function addProject(workspace: Workspace, project: WorkspaceProject): Workspace {
  if (workspace.projects.some((p) => p.id === project.id)) {
    throw new RangeError(`Duplicate project id: ${project.id}`);
  }
  const tab: WorkspaceTab = { projectId: project.id, label: project.name };
  return {
    ...workspace,
    projects: [...workspace.projects, project],
    tabs: [...workspace.tabs, tab],
    activeProjectId: project.id,
    updatedAt: now(),
  };
}

/**
 * Remove a project (and its tab) from the workspace.
 * Active project shifts to the previous tab, or empty string if none remain.
 *
 * @returns A new Workspace with the project removed.
 */
export function removeProject(workspace: Workspace, projectId: string): Workspace {
  requireProject(workspace, projectId);
  const projects = workspace.projects.filter((p) => p.id !== projectId);
  const tabs = workspace.tabs.filter((t) => t.projectId !== projectId);
  const sharedMaterials = workspace.sharedMaterials.map((sm) => ({
    ...sm,
    projectIds: sm.projectIds.filter((id) => id !== projectId),
  }));
  let activeProjectId = workspace.activeProjectId;
  if (activeProjectId === projectId) {
    activeProjectId = tabs.length > 0 ? (tabs[tabs.length - 1]?.projectId ?? '') : '';
  }
  return {
    ...workspace,
    projects,
    tabs,
    sharedMaterials,
    activeProjectId,
    updatedAt: now(),
  };
}

/**
 * Set the active project by id.
 *
 * @throws RangeError if the project does not exist.
 */
export function activateTab(workspace: Workspace, projectId: string): Workspace {
  requireProject(workspace, projectId);
  return { ...workspace, activeProjectId: projectId, updatedAt: now() };
}

/**
 * Return the currently active project, or `undefined` if none.
 */
export function getActiveProject(workspace: Workspace): WorkspaceProject | undefined {
  return workspace.projects.find((p) => p.id === workspace.activeProjectId);
}

/**
 * Register a material as shared across the given project ids.
 * Merges with any existing SharedMaterial entry for the same key.
 */
export function shareWorkspaceMaterial(workspace: Workspace, materialKey: string, projectIds: string[]): Workspace {
  if (!materialKey.trim()) throw new RangeError('materialKey must not be empty');
  for (const id of projectIds) requireProject(workspace, id);

  const existing = workspace.sharedMaterials.find((sm) => sm.materialKey === materialKey);
  let sharedMaterials: SharedMaterial[];
  if (existing) {
    const merged = Array.from(new Set([...existing.projectIds, ...projectIds]));
    sharedMaterials = workspace.sharedMaterials.map((sm) =>
      sm.materialKey === materialKey ? { ...sm, projectIds: merged } : sm,
    );
  } else {
    sharedMaterials = [...workspace.sharedMaterials, { materialKey, projectIds }];
  }
  return { ...workspace, sharedMaterials, updatedAt: now() };
}

/**
 * For each project in the workspace, return the effective material key:
 * use the shared material if the project participates, otherwise use
 * the project's own `config.material`.
 *
 * @returns Record mapping projectId → resolved materialKey.
 */
export function resolveSharedMaterials(workspace: Workspace): Record<string, string> {
  const result: Record<string, string> = {};
  for (const project of workspace.projects) {
    const shared = workspace.sharedMaterials.find((sm) => sm.projectIds.includes(project.id));
    result[project.id] = shared ? shared.materialKey : project.config.carcassMaterial;
  }
  return result;
}

/**
 * Serialise a workspace to a JSON string for persistence or export.
 */
export function exportWorkspace(workspace: Workspace): string {
  return JSON.stringify(workspace);
}

/**
 * Deserialise a workspace from a previously exported JSON string.
 *
 * @throws RangeError if the JSON is malformed or missing required fields.
 */
export function importWorkspace(json: string): Workspace {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new RangeError('Invalid workspace JSON');
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new RangeError('Workspace JSON must be an object');
  }
  const w = parsed as Record<string, unknown>;
  if (typeof w['id'] !== 'string' || !w['id'].trim()) throw new RangeError('Workspace missing id');
  if (typeof w['name'] !== 'string' || !w['name'].trim()) throw new RangeError('Workspace missing name');
  if (!Array.isArray(w['projects'])) throw new RangeError('Workspace missing projects array');
  if (!Array.isArray(w['tabs'])) throw new RangeError('Workspace missing tabs array');
  return parsed as Workspace;
}

/**
 * Update a project's config in-place and bump updatedAt timestamps.
 *
 * @returns A new Workspace with the updated project.
 */
export function updateProjectConfig(workspace: Workspace, projectId: string, config: CabinetConfig): Workspace {
  requireProject(workspace, projectId);
  const ts = now();
  const projects = workspace.projects.map((p) => (p.id === projectId ? { ...p, config, updatedAt: ts } : p));
  return { ...workspace, projects, updatedAt: ts };
}
