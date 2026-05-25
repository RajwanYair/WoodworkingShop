import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveProject,
  listProjects,
  deleteProject,
  migrateProject,
  exportProjectJson,
  importProjectsBundle,
  CURRENT_SCHEMA_VERSION,
  type SavedProject,
} from '../../src/utils/project-storage';
import type { ProjectSnapshot } from '../../src/store/cabinet-store';
import { DEFAULT_CONFIG } from '../../src/engine/materials';

// In-memory IndexedDB mock — keeps projects and snapshots separately
const memProjects: SavedProject[] = [];
const memSnapshots: ProjectSnapshot[] = [];

vi.mock('../../src/utils/indexed-db-storage', () => ({
  idbLoadProjects: vi.fn(async () => [...memProjects]),
  idbSaveProjects: vi.fn(async (data: SavedProject[]) => {
    memProjects.length = 0;
    memProjects.push(...data);
  }),
  idbLoadSnapshots: vi.fn(async () => [...memSnapshots]),
  idbSaveSnapshots: vi.fn(async (data: ProjectSnapshot[]) => {
    memSnapshots.length = 0;
    memSnapshots.push(...data);
  }),
  idbLoadConfigs: vi.fn(async () => []),
  idbSaveConfigs: vi.fn(async () => {}),
  idbDeleteSnapshot: vi.fn(async () => {}),
  getStorageEstimate: vi.fn(async () => ({
    usedBytes: 0,
    quotaBytes: 0,
    usedKb: 0,
    quotaMb: 0,
    percentUsed: 0,
    nearLimit: false,
  })),
}));

const sampleCabinets = [{ id: 'cab-1', name: 'Test Cabinet', config: DEFAULT_CONFIG, notes: '' }];

const sampleSnapshots: ProjectSnapshot[] = [
  { id: 'snap-1', name: 'Before changes', cabinets: sampleCabinets, timestamp: '2025-01-01T00:00:00.000Z' },
  { id: 'snap-2', name: 'After shelf update', cabinets: sampleCabinets, timestamp: '2025-01-02T00:00:00.000Z' },
];

describe('project-storage', () => {
  beforeEach(() => {
    memProjects.length = 0;
    memSnapshots.length = 0;
  });

  it('saveProject persists and deleteProject removes', async () => {
    const p = await saveProject('My Cabinet', sampleCabinets);
    expect((await listProjects())[0].name).toBe('My Cabinet');
    await deleteProject(p.id);
    expect(await listProjects()).toHaveLength(0);
  });

  it('snapshot round-trip: importProjectJson restores snapshots to IndexedDB', async () => {
    const project: SavedProject = {
      id: 'round-trip-id',
      name: 'Round Trip',
      savedAt: new Date().toISOString(),
      cabinets: sampleCabinets,
      snapshots: sampleSnapshots,
    };
    const file = new File([JSON.stringify(project)], 'project.cabinet-project.json', { type: 'application/json' });

    const { importProjectJson } = await import('../../src/utils/project-storage');
    const imported = await importProjectJson(file);

    expect(imported.cabinets).toHaveLength(1);
    // Snapshots should have been written to IDB snapshots store
    expect(memSnapshots.some((s) => s.id === 'snap-1')).toBe(true);
    expect(memSnapshots.some((s) => s.id === 'snap-2')).toBe(true);
  });

  it('import deduplicates snapshots by id', async () => {
    // Pre-populate one snapshot
    memSnapshots.push(sampleSnapshots[0]);

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

    // snap-1 should appear exactly once
    expect(memSnapshots.filter((s) => s.id === 'snap-1')).toHaveLength(1);
    expect(memSnapshots.some((s) => s.id === 'snap-2')).toBe(true);
  });

  it('saveProject replaces a project with the same name, preserving its id', async () => {
    const first = await saveProject('Same Name', sampleCabinets);
    const second = await saveProject('Same Name', sampleCabinets);
    const projects = await listProjects();
    expect(projects).toHaveLength(1);
    // id is preserved from the first save
    expect(projects[0].id).toBe(first.id);
    expect(second.name).toBe('Same Name');
  });

  it('exportProjectJson calls triggerDownload with serialised project', () => {
    const mockAnchor = document.createElement('a');
    const clickSpy = vi.spyOn(mockAnchor, 'click').mockImplementation(() => {});
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:export-test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const project: SavedProject = {
      id: 'export-id',
      name: 'Export Test',
      savedAt: new Date().toISOString(),
      cabinets: sampleCabinets,
    };

    exportProjectJson(project);

    expect(clickSpy).toHaveBeenCalled();
    expect(mockAnchor.download).toContain('Export_Test');

    vi.restoreAllMocks();
  });

  it('importProjectsBundle merges new projects from a bundle file', async () => {
    const bundle = {
      version: 1,
      exportedAt: new Date().toISOString(),
      projects: [
        { id: 'b1', name: 'Bundled A', savedAt: new Date().toISOString(), cabinets: sampleCabinets },
        { id: 'b2', name: 'Bundled B', savedAt: new Date().toISOString(), cabinets: sampleCabinets },
      ],
    };
    const file = new File([JSON.stringify(bundle)], 'bundle.cabinet-projects.json', { type: 'application/json' });
    const added = await importProjectsBundle(file);
    expect(added).toHaveLength(2);
    expect(added[0].name).toBe('Bundled A');
    expect(added[1].name).toBe('Bundled B');
  });

  it('importProjectsBundle renames duplicates with (imported) suffix', async () => {
    await saveProject('Clash', sampleCabinets);
    const bundle = {
      version: 1,
      exportedAt: new Date().toISOString(),
      projects: [{ id: 'clash-id', name: 'Clash', savedAt: new Date().toISOString(), cabinets: sampleCabinets }],
    };
    const file = new File([JSON.stringify(bundle)], 'bundle.json', { type: 'application/json' });
    const added = await importProjectsBundle(file);
    expect(added[0].name).toBe('Clash (imported)');
  });

  it('importProjectsBundle throws on missing projects array', async () => {
    const file = new File([JSON.stringify({ version: 1 })], 'bad.json', { type: 'application/json' });
    await expect(importProjectsBundle(file)).rejects.toThrow(/projects/i);
  });

  it('importProjectsBundle skips malformed project entries', async () => {
    const bundle = {
      version: 1,
      exportedAt: new Date().toISOString(),
      projects: [
        null, // malformed
        { id: 'ok', name: 'Valid', savedAt: new Date().toISOString(), cabinets: sampleCabinets },
      ],
    };
    const file = new File([JSON.stringify(bundle)], 'partial.json', { type: 'application/json' });
    const added = await importProjectsBundle(file);
    expect(added).toHaveLength(1);
    expect(added[0].name).toBe('Valid');
  });
});

describe('migrateProject', () => {
  it('accepts a valid v1.0 payload and stamps schemaVersion', () => {
    const raw = {
      id: 'abc',
      name: 'Valid',
      savedAt: '2025-01-01T00:00:00.000Z',
      cabinets: sampleCabinets,
    };
    const result = migrateProject(raw);
    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.name).toBe('Valid');
    expect(result.cabinets).toHaveLength(1);
  });

  it('throws on missing cabinets and non-object inputs', () => {
    expect(() => migrateProject({ id: 'x', name: 'Bad', savedAt: '' })).toThrow(/cabinets/i);
    expect(() => migrateProject(null)).toThrow();
    expect(() => migrateProject('string')).toThrow();
    expect(() => migrateProject(42)).toThrow();
  });

  it('fills in defaults when optional fields are missing', () => {
    const raw = { cabinets: sampleCabinets };
    const result = migrateProject(raw);
    expect(result.name).toBe('Untitled');
    expect(typeof result.savedAt).toBe('string');
    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('preserves optional fields when present', () => {
    const raw = {
      cabinets: sampleCabinets,
      generatedAt: '2025-06-01T00:00:00.000Z',
      snapshots: sampleSnapshots,
    };
    const result = migrateProject(raw);
    expect(result.generatedAt).toBe('2025-06-01T00:00:00.000Z');
    expect(result.snapshots).toHaveLength(2);
  });
});
