import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveProject,
  listProjects,
  deleteProject,
  migrateProject,
  exportProjectJson,
  importProjectJson,
  importProjectsBundle,
  CURRENT_SCHEMA_VERSION,
  PROJECT_SCHEMA_REGISTRY,
  type SavedProject,
} from '../../src/utils/project-storage';
import type { ProjectSnapshot } from '../../src/store/cabinet-store';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import { idbSaveProjects, idbSaveSnapshots } from '../../src/utils/indexed-db-storage';

// In-memory IndexedDB mock — keeps projects and snapshots separately
const memProjects: unknown[] = [];
const memSnapshots: ProjectSnapshot[] = [];

vi.mock('../../src/utils/indexed-db-storage', () => ({
  idbLoadProjects: vi.fn(async () => [...memProjects]),
  idbSaveProjects: vi.fn(async (data: unknown[]) => {
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

  it('preserves the project and recovers when deletion persistence fails', async () => {
    const project = await saveProject('Retry deletion', sampleCabinets);
    vi.mocked(idbSaveProjects).mockRejectedValueOnce(new Error('Project store unavailable'));

    await expect(deleteProject(project.id)).rejects.toThrow(/project store unavailable/i);
    expect(memProjects).toEqual([project]);
    expect(await listProjects()).toMatchObject([{ id: project.id, name: project.name }]);

    await expect(deleteProject(project.id)).resolves.toBeUndefined();
    expect(await listProjects()).toEqual([]);
  });

  it('preserves saved projects and recovers when storage quota is exceeded', async () => {
    const existing = await saveProject('Existing project', sampleCabinets);
    vi.mocked(idbSaveProjects).mockRejectedValueOnce(
      new DOMException('The storage quota has been exceeded', 'QuotaExceededError'),
    );

    await expect(saveProject('New project', sampleCabinets)).rejects.toThrow(/quota has been exceeded/i);
    expect(memProjects).toEqual([existing]);

    await expect(saveProject('New project', sampleCabinets)).resolves.toMatchObject({ name: 'New project' });
    expect((await listProjects()).map((project) => project.name)).toEqual(['Existing project', 'New project']);
  });

  it('rejects corrupt persisted projects without overwriting stored data', async () => {
    const corruptRecord = { id: 'broken', name: 'Broken', cabinets: [null] };
    memProjects.push(corruptRecord);

    await expect(listProjects()).rejects.toThrow(/saved project storage/i);
    await expect(saveProject('Replacement', sampleCabinets)).rejects.toThrow(/saved project storage/i);
    expect(memProjects).toEqual([corruptRecord]);
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

    await importProjectJson(file);

    // snap-1 should appear exactly once
    expect(memSnapshots.filter((s) => s.id === 'snap-1')).toHaveLength(1);
    expect(memSnapshots.some((s) => s.id === 'snap-2')).toBe(true);
  });

  it('restores imported snapshots when project persistence fails', async () => {
    await saveProject('Existing project', sampleCabinets);
    const projectsBeforeImport = [...memProjects];
    vi.mocked(idbSaveProjects).mockRejectedValueOnce(new Error('Project store unavailable'));
    const project: SavedProject = {
      id: 'partial-import',
      name: 'Partial import',
      savedAt: new Date().toISOString(),
      cabinets: sampleCabinets,
      snapshots: sampleSnapshots,
    };
    const file = new File([JSON.stringify(project)], 'partial-import.json', { type: 'application/json' });

    await expect(importProjectJson(file)).rejects.toThrow(/snapshot history was restored/i);
    expect(memProjects).toEqual(projectsBeforeImport);
    expect(memSnapshots).toEqual([]);
  });

  it('reports both failures when snapshot rollback also fails', async () => {
    vi.mocked(idbSaveSnapshots)
      .mockImplementationOnce(async () => {})
      .mockRejectedValueOnce(new Error('Snapshot rollback unavailable'));
    vi.mocked(idbSaveProjects).mockRejectedValueOnce(new Error('Project store unavailable'));
    const project: SavedProject = {
      id: 'failed-rollback',
      name: 'Failed rollback',
      savedAt: new Date().toISOString(),
      cabinets: sampleCabinets,
      snapshots: sampleSnapshots,
    };
    const file = new File([JSON.stringify(project)], 'failed-rollback.json', { type: 'application/json' });

    await expect(importProjectJson(file)).rejects.toThrow(/snapshot history rollback also failed/i);
  });

  it.each([null, {}, { id: 'bad', name: 'Bad', cabinets: [null], timestamp: '2025-01-01T00:00:00.000Z' }])(
    'rejects malformed snapshot records without persisting the import',
    async (snapshot) => {
      const file = new File(
        [JSON.stringify({ name: 'Corrupt snapshots', cabinets: sampleCabinets, snapshots: [snapshot] })],
        'corrupt-snapshots.cabinet-project.json',
        { type: 'application/json' },
      );

      await expect(importProjectJson(file)).rejects.toThrow(/snapshot/i);
      expect(memSnapshots).toEqual([]);
      expect(memProjects).toEqual([]);
    },
  );

  it.each([null, {}, { name: 'Missing config' }, { name: 'Malformed config', config: {} }])(
    'rejects malformed cabinet entries without persisting a project',
    async (cabinet) => {
      const file = new File(
        [JSON.stringify({ name: 'Corrupt import', cabinets: [cabinet] })],
        'corrupt.cabinet-project.json',
        { type: 'application/json' },
      );

      await expect(importProjectJson(file)).rejects.toThrow(/cabinet/i);
      expect(memProjects).toEqual([]);
    },
  );

  it('saveProject replaces a project with the same name, preserving its id', async () => {
    const first = await saveProject('Same Name', sampleCabinets);
    const second = await saveProject('Same Name', sampleCabinets);
    const projects = await listProjects();
    expect(projects).toHaveLength(1);
    // id is preserved from the first save
    expect(projects[0].id).toBe(first.id);
    expect(second.name).toBe('Same Name');
  });

  it('generates unique ids for distinct projects saved in the same millisecond', async () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    try {
      const first = await saveProject('First Project', sampleCabinets);
      const second = await saveProject('Second Project', sampleCabinets);

      expect(second.id).not.toBe(first.id);
      expect(new Set((await listProjects()).map((project) => project.id)).size).toBe(2);
    } finally {
      clock.mockRestore();
    }
  });

  it('preserves distinct projects saved concurrently', async () => {
    await Promise.all([
      saveProject('Concurrent Project A', sampleCabinets),
      saveProject('Concurrent Project B', sampleCabinets),
    ]);

    expect((await listProjects()).map((project) => project.name).sort()).toEqual([
      'Concurrent Project A',
      'Concurrent Project B',
    ]);
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
    expect(new Set(added.map((project) => project.id)).size).toBe(2);
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

  it('migrates legacy 0.9 payload using projectName → name mapping', () => {
    const raw = {
      schemaVersion: '0.9',
      projectName: 'Legacy Project',
      savedAt: '2025-01-01T00:00:00.000Z',
      cabinets: sampleCabinets,
    };
    const result = migrateProject(raw);
    expect(result.name).toBe('Legacy Project');
    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it.each([
    { schemaVersion: '9.9', expected: /unsupported project schema version/i },
    { schemaVersion: '2.0', expected: /unsupported project schema version/i },
  ])('rejects unsupported schema versions ($schemaVersion)', ({ schemaVersion, expected }) => {
    const raw = { schemaVersion, cabinets: sampleCabinets };
    expect(() => migrateProject(raw)).toThrow(expected);
  });

  it('exposes registry metadata for supported versions and migrations', () => {
    expect(PROJECT_SCHEMA_REGISTRY.latest).toBe(CURRENT_SCHEMA_VERSION);
    expect(PROJECT_SCHEMA_REGISTRY.supportedImportVersions).toContain('0.9');
    expect(PROJECT_SCHEMA_REGISTRY.migrations).toContainEqual({ from: '0.9', to: '1.0' });
  });
});

describe('importProjectsBundle schema versioning', () => {
  it('accepts missing bundle version as current version', async () => {
    const bundle = {
      projects: [{ id: 'ok', name: 'No Version', savedAt: new Date().toISOString(), cabinets: sampleCabinets }],
    };
    const file = new File([JSON.stringify(bundle)], 'bundle.json', { type: 'application/json' });
    await expect(importProjectsBundle(file)).resolves.toHaveLength(1);
  });

  it.each([
    { version: 2, expected: /unsupported bundle version/i },
    { version: 0, expected: /version must be a positive integer/i },
  ])('rejects unsupported/invalid bundle version $version', async ({ version, expected }) => {
    const bundle = {
      version,
      projects: [{ id: 'x', name: 'X', savedAt: new Date().toISOString(), cabinets: sampleCabinets }],
    };
    const file = new File([JSON.stringify(bundle)], 'bundle.json', { type: 'application/json' });
    await expect(importProjectsBundle(file)).rejects.toThrow(expected);
  });
});
