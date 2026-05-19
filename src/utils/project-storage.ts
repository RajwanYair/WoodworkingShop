import type { CabinetEntry, ProjectSnapshot } from '../store/cabinet-store';
import { idbLoadProjects, idbSaveProjects, idbLoadSnapshots, idbSaveSnapshots } from './indexed-db-storage';

export interface SavedProject {
  id: string;
  name: string;
  savedAt: string; // ISO timestamp
  /** Schema version for forward-compatibility checks (added v3.48.9). */
  schemaVersion?: '1.0';
  /** ISO timestamp of when the file was exported (added v3.48.9). */
  generatedAt?: string;
  cabinets: CabinetEntry[];
  snapshots?: ProjectSnapshot[]; // Sprint 18 — snapshot history round-trip
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
    schemaVersion: '1.0',
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
  const project = JSON.parse(text) as SavedProject;
  if (!project.cabinets || !Array.isArray(project.cabinets)) {
    throw new Error('Invalid project file');
  }
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
  const parsed = JSON.parse(text) as { version?: number; projects?: SavedProject[] };
  const incoming = parsed.projects;
  if (!Array.isArray(incoming)) {
    throw new Error('Invalid bundle: missing projects array');
  }
  const existing = await load();
  const existingNames = new Set(existing.map((p) => p.name.toLowerCase()));
  const added: SavedProject[] = [];
  for (const proj of incoming) {
    if (!proj.cabinets || !Array.isArray(proj.cabinets)) continue;
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
