import type { CabinetEntry } from '../store/cabinet-store';

const STORAGE_KEY = 'cabinet-planner-projects-v1';

export interface SavedProject {
  id: string;
  name: string;
  savedAt: string; // ISO timestamp
  cabinets: CabinetEntry[];
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

export function exportProjectJson(project: SavedProject): void {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
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
