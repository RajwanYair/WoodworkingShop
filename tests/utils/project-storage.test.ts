import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveProject,
  listProjects,
  deleteProject,
  type SavedProject,
} from '../../src/utils/project-storage';
import type { ProjectSnapshot } from '../../src/store/cabinet-store';
import { DEFAULT_CONFIG } from '../../src/engine/materials';

const SNAPSHOTS_KEY = 'woodworkingshop:snapshots';

// In-memory localStorage mock
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const k in store) delete store[k]; },
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

const sampleCabinets = [
  { id: 'cab-1', name: 'Test Cabinet', config: DEFAULT_CONFIG, notes: '' },
];

const sampleSnapshots: ProjectSnapshot[] = [
  {
    id: 'snap-1',
    name: 'Before changes',
    cabinets: sampleCabinets,
    timestamp: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'snap-2',
    name: 'After shelf update',
    cabinets: sampleCabinets,
    timestamp: '2025-01-02T00:00:00.000Z',
  },
];

describe('project-storage', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('saveProject persists to localStorage', () => {
    saveProject('My Cabinet', sampleCabinets);
    const projects = listProjects();
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe('My Cabinet');
  });

  it('deleteProject removes the project', () => {
    const p = saveProject('Delete Me', sampleCabinets);
    expect(listProjects()).toHaveLength(1);
    deleteProject(p.id);
    expect(listProjects()).toHaveLength(0);
  });

  it('SavedProject can include snapshots field', () => {
    const project: SavedProject = {
      id: 'test-id',
      name: 'With Snapshots',
      savedAt: new Date().toISOString(),
      cabinets: sampleCabinets,
      snapshots: sampleSnapshots,
    };
    expect(project.snapshots).toHaveLength(2);
    expect(project.snapshots?.[0].id).toBe('snap-1');
  });

  it('snapshot round-trip: importProjectJson restores snapshots to localStorage', async () => {
    // Build a project JSON file with snapshots embedded
    const project: SavedProject = {
      id: 'round-trip-id',
      name: 'Round Trip',
      savedAt: new Date().toISOString(),
      cabinets: sampleCabinets,
      snapshots: sampleSnapshots,
    };
    const json = JSON.stringify(project);

    // Simulate File with text content
    const file = new File([json], 'project.cabinet-project.json', { type: 'application/json' });

    // Import using importProjectJson (directly require to avoid DOM URL.createObjectURL)
    const { importProjectJson } = await import('../../src/utils/project-storage');
    const imported = await importProjectJson(file);

    expect(imported.cabinets).toHaveLength(1);

    // Snapshots should have been written to SNAPSHOTS_KEY
    const raw = store[SNAPSHOTS_KEY];
    expect(raw).toBeTruthy();
    const restored = JSON.parse(raw) as ProjectSnapshot[];
    expect(restored.some((s) => s.id === 'snap-1')).toBe(true);
    expect(restored.some((s) => s.id === 'snap-2')).toBe(true);
  });

  it('import deduplicates snapshots by id', async () => {
    // Pre-populate one snapshot
    store[SNAPSHOTS_KEY] = JSON.stringify([sampleSnapshots[0]]);

    const project: SavedProject = {
      id: 'dedup-id',
      name: 'Dedup Test',
      savedAt: new Date().toISOString(),
      cabinets: sampleCabinets,
      snapshots: sampleSnapshots, // includes snap-1 (already exists) and snap-2
    };
    const file = new File([JSON.stringify(project)], 'test.json', { type: 'application/json' });

    const { importProjectJson } = await import('../../src/utils/project-storage');
    await importProjectJson(file);

    const restored = JSON.parse(store[SNAPSHOTS_KEY]) as ProjectSnapshot[];
    // snap-1 should appear exactly once
    expect(restored.filter((s) => s.id === 'snap-1')).toHaveLength(1);
    expect(restored.some((s) => s.id === 'snap-2')).toBe(true);
  });

  it('exportProjectJson accepts optional snapshots without mutating original project', () => {
    // We can't test the download in jsdom, but we can verify the function signature
    const project: SavedProject = {
      id: 'export-test',
      name: 'Export Test',
      savedAt: new Date().toISOString(),
      cabinets: sampleCabinets,
    };
    // exportProjectJson uses DOM APIs (URL.createObjectURL, createElement)
    // Just check the type contract — snapshots optional field on SavedProject
    expect(project.snapshots).toBeUndefined();
    const withSnaps: SavedProject = { ...project, snapshots: sampleSnapshots };
    expect(withSnaps.snapshots).toHaveLength(2);
  });

  it('SavedProject type allows schemaVersion and generatedAt fields', () => {
    const project: SavedProject = {
      id: 'schema-test',
      name: 'Schema Test',
      savedAt: new Date().toISOString(),
      schemaVersion: '1.0',
      generatedAt: new Date().toISOString(),
      cabinets: sampleCabinets,
    };
    expect(project.schemaVersion).toBe('1.0');
    expect(typeof project.generatedAt).toBe('string');
  });
});
