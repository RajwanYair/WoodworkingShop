import type { CabinetEntry, ProjectSnapshot } from '../store/cabinet-store';
import { idbLoadProjects, idbSaveProjects, idbLoadSnapshots, idbSaveSnapshots } from './indexed-db-storage';

/** Current schema version written on every export. */
export const CURRENT_SCHEMA_VERSION = '1.0' as const;

export interface SavedProject {
  id: string;
  name: string;
  savedAt: string; // ISO timestamp
  /** Schema version for forward-compatibility checks. */
  schemaVersion?: '1.0';
  /** ISO timestamp of when the file was exported. */
  generatedAt?: string;
  cabinets: CabinetEntry[];
  snapshots?: ProjectSnapshot[]; // snapshot history round-trip
}

/**
 * Migrate an unknown imported payload to a valid SavedProject.
 * Throws a descriptive Error if the payload is structurally invalid.
 * Future schema versions add migration steps before the final return.
 */
export function migrateProject(raw: unknown): SavedProject {
  if (raw === null || typeof raw !== 'object') {
    throw new Error('Project file must be a JSON object');
  }
  const p = raw as Record<string, unknown>;
  if (!Array.isArray(p['cabinets'])) {
    throw new Error('Invalid project file: missing cabinets array');
  }
  // v1.0 — no structural migration needed; ensure required fields have defaults
  const migrated: SavedProject = {
    id: typeof p['id'] === 'string' ? p['id'] : `proj-${Date.now()}`,
    name: typeof p['name'] === 'string' && p['name'].trim() ? p['name'].trim() : 'Untitled',
    savedAt: typeof p['savedAt'] === 'string' ? p['savedAt'] : new Date().toISOString(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    cabinets: p['cabinets'] as CabinetEntry[],
  };
  if (typeof p['generatedAt'] === 'string') migrated.generatedAt = p['generatedAt'];
  if (Array.isArray(p['snapshots'])) migrated.snapshots = p['snapshots'] as ProjectSnapshot[];
  return migrated;
}

async function load(): Promise<SavedProject[]> {
  return idbLoadProjects<SavedProject>();
}

async function save(projects: SavedProject[]): Promise<void> {
  await idbSaveProjects(projects);
}

export async function listProjects(): Promise<SavedProject[]> {
  return load();
}

export async function saveProject(name: string, cabinets: CabinetEntry[]): Promise<SavedProject> {
  const projects = await load();
  const id = `proj-${Date.now()}`;
  const project: SavedProject = {
    id,
    name: name.trim() || 'Untitled',
    savedAt: new Date().toISOString(),
    cabinets,
  };
  // Replace existing project with the same name, or push new
  const idx = projects.findIndex((p) => p.name.toLowerCase() === project.name.toLowerCase());
  if (idx >= 0) {
    projects[idx] = { ...project, id: projects[idx].id };
  } else {
    projects.push(project);
  }
  await save(projects);
  return project;
}

export async function deleteProject(id: string): Promise<void> {
  const projects = (await load()).filter((p) => p.id !== id);
  await save(projects);
}

export function exportProjectJson(project: SavedProject, snapshots?: ProjectSnapshot[]): void {
  const payload: SavedProject = {
    ...(snapshots ? { ...project, snapshots } : project),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.cabinet-project.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importProjectJson(file: File): Promise<SavedProject> {
  const text = await file.text();
  const raw = JSON.parse(text) as unknown;
  const project = migrateProject(raw);
  // Restore snapshot history, merging by id to avoid duplicates
  if (Array.isArray(project.snapshots) && project.snapshots.length > 0) {
    const existing = await idbLoadSnapshots<ProjectSnapshot>();
    const existingIds = new Set(existing.map((s) => s.id));
    const merged = [...existing, ...project.snapshots.filter((s) => !existingIds.has(s.id))];
    await idbSaveSnapshots(merged);
  }
  // Re-save with a fresh id to avoid conflicts
  const projects = await load();
  project.id = `proj-${Date.now()}`;
  project.savedAt = new Date().toISOString();
  projects.push(project);
  await save(projects);
  return project;
}

/** Export multiple projects as a single `.cabinet-projects.json` bundle */
export function exportProjectsBundle(projects: SavedProject[]): void {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    projects,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cabinet-projects-bundle-${new Date().toISOString().slice(0, 10)}.cabinet-projects.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Import a `.cabinet-projects.json` bundle, merging all contained projects */
export async function importProjectsBundle(file: File): Promise<SavedProject[]> {
  const text = await file.text();
  const parsed = JSON.parse(text) as { version?: number; projects?: unknown[] };
  const incoming = parsed.projects;
  if (!Array.isArray(incoming)) {
    throw new Error('Invalid bundle: missing projects array');
  }
  const existing = await load();
  const existingNames = new Set(existing.map((p) => p.name.toLowerCase()));
  const added: SavedProject[] = [];
  for (const raw of incoming) {
    let proj: SavedProject;
    try {
      proj = migrateProject(raw);
    } catch {
      continue; // skip malformed entries
    }
    const merged: SavedProject = {
      ...proj,
      id: `proj-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      savedAt: new Date().toISOString(),
      name: existingNames.has(proj.name.toLowerCase()) ? `${proj.name} (imported)` : proj.name,
    };
    existing.push(merged);
    existingNames.add(merged.name.toLowerCase());
    added.push(merged);
  }
  await save(existing);
  return added;
}
