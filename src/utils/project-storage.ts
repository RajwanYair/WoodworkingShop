import type { CabinetEntry, ProjectSnapshot } from '../store/cabinet-store';

const STORAGE_KEY = 'cabinet-planner-projects-v1';
const SNAPSHOTS_KEY = 'woodworkingshop:snapshots';

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

function load(): SavedProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedProject[];
  } catch {
    return [];
  }
}

function save(projects: SavedProject[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch {
    // localStorage quota exceeded — silently drop
  }
}

export function listProjects(): SavedProject[] {
  return load();
}

export function saveProject(name: string, cabinets: CabinetEntry[]): SavedProject {
  const projects = load();
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
  save(projects);
  return project;
}

export function deleteProject(id: string): void {
  const projects = load().filter((p) => p.id !== id);
  save(projects);
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

export function importProjectJson(file: File): Promise<SavedProject> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const project = JSON.parse(e.target?.result as string) as SavedProject;
        if (!project.cabinets || !Array.isArray(project.cabinets)) {
          reject(new Error('Invalid project file'));
          return;
        }
        // Sprint 18 — restore snapshot history, merging by id to avoid duplicates
        if (Array.isArray(project.snapshots) && project.snapshots.length > 0) {
          try {
            const existing: ProjectSnapshot[] = JSON.parse(
              localStorage.getItem(SNAPSHOTS_KEY) ?? '[]',
            ) as ProjectSnapshot[];
            const existingIds = new Set(existing.map((s) => s.id));
            const merged = [
              ...existing,
              ...project.snapshots.filter((s) => !existingIds.has(s.id)),
            ];
            localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(merged));
          } catch {
            // Non-critical — silently skip snapshot restore
          }
        }
        // Re-save with a fresh id to avoid conflicts
        const projects = load();
        project.id = `proj-${Date.now()}`;
        project.savedAt = new Date().toISOString();
        projects.push(project);
        save(projects);
        resolve(project);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
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
export function importProjectsBundle(file: File): Promise<SavedProject[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string) as {
          version?: number;
          projects?: SavedProject[];
        };
        const incoming = parsed.projects;
        if (!Array.isArray(incoming)) {
          reject(new Error('Invalid bundle: missing projects array'));
          return;
        }
        const existing = load();
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
        save(existing);
        resolve(added);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
