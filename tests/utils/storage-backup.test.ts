import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/engine/materials';

const storage = vi.hoisted(() => ({
  projects: [] as unknown[],
  configs: [] as unknown[],
  snapshots: [] as unknown[],
  offcuts: [] as unknown[],
}));

vi.mock('../../src/utils/indexed-db-storage', () => ({
  idbLoadSnapshots: vi.fn(async () => [...storage.snapshots]),
  idbSaveProjects: vi.fn(async (projects: unknown[]) => {
    storage.projects = [...projects];
  }),
  idbSaveConfigs: vi.fn(async (configs: unknown[]) => {
    storage.configs = [...configs];
  }),
  idbSaveSnapshots: vi.fn(async (snapshots: unknown[]) => {
    storage.snapshots = [...snapshots];
  }),
  idbLoadOffcuts: vi.fn(async () => [...storage.offcuts]),
  idbSaveOffcuts: vi.fn(async (offcuts: unknown[]) => {
    storage.offcuts = [...offcuts];
  }),
}));

vi.mock('../../src/utils/local-storage', () => ({
  loadSavedConfigs: vi.fn(async () => [...storage.configs]),
}));

vi.mock('../../src/utils/project-storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils/project-storage')>();
  return {
    ...actual,
    listProjects: vi.fn(async () => [...storage.projects]),
  };
});

const project = {
  id: 'project-1',
  name: 'Workshop',
  savedAt: '2026-10-10T00:00:00.000Z',
  schemaVersion: '1.0',
  cabinets: [{ name: 'Cabinet', config: { ...DEFAULT_CONFIG } }],
};
const config = {
  id: 'config-1',
  name: 'Saved cabinet',
  savedAt: '2026-10-10T00:00:00.000Z',
  config: { ...DEFAULT_CONFIG },
};
const snapshot = {
  id: 'snapshot-1',
  name: 'Before changes',
  timestamp: '2026-10-09T00:00:00.000Z',
  cabinets: [{ name: 'Cabinet', config: { ...DEFAULT_CONFIG } }],
};
const offcut = {
  id: 'offcut-1',
  material: 'plywood-17',
  thickness: 17,
  width: 400,
  length: 800,
  addedAt: 1_791_609_600_000,
};

function backupFile(overrides: Record<string, unknown> = {}): File {
  return new File(
    [
      JSON.stringify({
        format: 'woodworkingshop-core-backup',
        version: 1,
        exportedAt: '2026-10-10T00:00:00.000Z',
        projects: [project],
        configs: [config],
        snapshots: [snapshot],
        offcuts: [offcut],
        ...overrides,
      }),
    ],
    'backup.json',
    { type: 'application/json' },
  );
}

describe('storage backup', () => {
  beforeEach(() => {
    storage.projects = [];
    storage.configs = [];
    storage.snapshots = [];
    storage.offcuts = [];
    vi.clearAllMocks();
  });

  it('exports all core saved data collections', async () => {
    storage.projects = [project];
    storage.configs = [config];
    storage.snapshots = [snapshot];
    storage.offcuts = [offcut];
    const { createStorageBackup } = await import('../../src/utils/storage-backup');

    await expect(createStorageBackup()).resolves.toMatchObject({
      format: 'woodworkingshop-core-backup',
      version: 1,
      projects: [project],
      configs: [config],
      snapshots: [snapshot],
      offcuts: [offcut],
    });
  });

  it('replaces all core collections after validating a backup', async () => {
    storage.projects = [{ ...project, id: 'existing' }];
    storage.configs = [{ ...config, id: 'existing' }];
    storage.snapshots = [{ ...snapshot, id: 'existing' }];
    storage.offcuts = [{ ...offcut, id: 'existing' }];
    const { restoreStorageBackup } = await import('../../src/utils/storage-backup');

    await restoreStorageBackup(backupFile());

    expect(storage).toEqual({ projects: [project], configs: [config], snapshots: [snapshot], offcuts: [offcut] });
  });

  it.each([
    { version: 2 },
    { snapshots: [null] },
    { configs: [{ ...config, config: {} }] },
    { offcuts: [{ ...offcut, width: Number.NaN }] },
  ])('rejects invalid backup data before changing storage', async (override) => {
    const original = {
      projects: [{ ...project, id: 'existing' }],
      configs: [{ ...config, id: 'existing' }],
      snapshots: [{ ...snapshot, id: 'existing' }],
      offcuts: [{ ...offcut, id: 'existing' }],
    };
    Object.assign(storage, original);
    const { idbSaveProjects, restoreStorageBackup } = await import('../../src/utils/storage-backup').then(
      async (backupModule) => ({
        ...backupModule,
        ...(await import('../../src/utils/indexed-db-storage')),
      }),
    );

    await expect(restoreStorageBackup(backupFile(override))).rejects.toThrow(/invalid|unsupported/i);

    expect(storage).toEqual(original);
    expect(idbSaveProjects).not.toHaveBeenCalled();
  });

  it('rolls back every collection when a restore write fails', async () => {
    const original = {
      projects: [{ ...project, id: 'existing' }],
      configs: [{ ...config, id: 'existing' }],
      snapshots: [{ ...snapshot, id: 'existing' }],
      offcuts: [{ ...offcut, id: 'existing' }],
    };
    Object.assign(storage, original);
    const { idbSaveSnapshots } = await import('../../src/utils/indexed-db-storage');
    vi.mocked(idbSaveSnapshots).mockRejectedValueOnce(new Error('Snapshot storage unavailable'));
    const { restoreStorageBackup } = await import('../../src/utils/storage-backup');

    await expect(restoreStorageBackup(backupFile())).rejects.toThrow(/previous data was restored/i);

    expect(storage).toEqual(original);
  });
});
