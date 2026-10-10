import type { OffcutEntry } from '../engine/types';
import type { CabinetEntry, ProjectSnapshot } from '../store/cabinet-store';
import {
  idbLoadOffcuts,
  idbLoadSnapshots,
  idbSaveConfigs,
  idbSaveOffcuts,
  idbSaveProjects,
  idbSaveSnapshots,
} from './indexed-db-storage';
import { loadSavedConfigs, type SavedConfig } from './local-storage';
import { listProjects, migrateProject, type SavedProject } from './project-storage';

export const STORAGE_BACKUP_FORMAT = 'woodworkingshop-core-backup' as const;
export const STORAGE_BACKUP_VERSION = 1 as const;
const SNAPSHOTS_KEY = 'woodworkingshop:snapshots';

export interface StorageBackup {
  format: typeof STORAGE_BACKUP_FORMAT;
  version: typeof STORAGE_BACKUP_VERSION;
  exportedAt: string;
  projects: SavedProject[];
  configs: SavedConfig[];
  snapshots: ProjectSnapshot[];
  offcuts: OffcutEntry[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateProject(value: unknown): SavedProject {
  if (!isRecord(value) || typeof value['id'] !== 'string' || typeof value['name'] !== 'string') {
    throw new Error('Invalid backup: project record is missing its id or name');
  }
  return migrateProject(value);
}

function validateCabinets(cabinets: unknown): cabinets is CabinetEntry[] {
  try {
    migrateProject({ name: 'Backup validation', cabinets });
    return true;
  } catch {
    return false;
  }
}

function validateConfig(value: unknown): value is SavedConfig {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['name'] === 'string' &&
    typeof value['savedAt'] === 'string' &&
    isRecord(value['config']) &&
    validateCabinets([{ name: 'Saved configuration', config: value['config'] }])
  );
}

function validateSnapshot(value: unknown): value is ProjectSnapshot {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['name'] === 'string' &&
    typeof value['timestamp'] === 'string' &&
    validateCabinets(value['cabinets'])
  );
}

function validateOffcut(value: unknown): value is OffcutEntry {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['material'] === 'string' &&
    typeof value['thickness'] === 'number' &&
    Number.isFinite(value['thickness']) &&
    typeof value['width'] === 'number' &&
    Number.isFinite(value['width']) &&
    typeof value['length'] === 'number' &&
    Number.isFinite(value['length']) &&
    typeof value['addedAt'] === 'number' &&
    Number.isFinite(value['addedAt']) &&
    (value['label'] === undefined || typeof value['label'] === 'string')
  );
}

function validateStorageBackup(value: unknown): StorageBackup {
  if (
    !isRecord(value) ||
    value['format'] !== STORAGE_BACKUP_FORMAT ||
    value['version'] !== STORAGE_BACKUP_VERSION ||
    typeof value['exportedAt'] !== 'string'
  ) {
    throw new Error('Invalid or unsupported storage backup');
  }
  if (!Array.isArray(value['projects']) || !Array.isArray(value['configs'])) {
    throw new TypeError('Invalid backup: projects and saved configurations must be arrays');
  }
  if (!Array.isArray(value['snapshots']) || !Array.isArray(value['offcuts'])) {
    throw new TypeError('Invalid backup: snapshots and offcuts must be arrays');
  }

  const projects = value['projects'].map(validateProject);
  if (!value['configs'].every(validateConfig)) throw new Error('Invalid backup: saved configuration record is invalid');
  if (!value['snapshots'].every(validateSnapshot)) throw new Error('Invalid backup: snapshot record is invalid');
  if (!value['offcuts'].every(validateOffcut)) throw new Error('Invalid backup: offcut record is invalid');

  return {
    format: STORAGE_BACKUP_FORMAT,
    version: STORAGE_BACKUP_VERSION,
    exportedAt: value['exportedAt'],
    projects,
    configs: value['configs'],
    snapshots: value['snapshots'],
    offcuts: value['offcuts'],
  };
}

export async function createStorageBackup(): Promise<StorageBackup> {
  const [projects, configs, snapshots, offcuts] = await Promise.all([
    listProjects(),
    loadSavedConfigs(),
    idbLoadSnapshots<ProjectSnapshot>(),
    idbLoadOffcuts(),
  ]);
  return validateStorageBackup({
    format: STORAGE_BACKUP_FORMAT,
    version: STORAGE_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    projects,
    configs,
    snapshots,
    offcuts,
  });
}

export function downloadStorageBackup(backup: StorageBackup): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `woodworkingshop-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function restoreStorageBackup(file: File): Promise<StorageBackup> {
  const parsed: unknown = JSON.parse(await file.text());
  const backup = validateStorageBackup(parsed);
  const previousSnapshotMirror = typeof window === 'undefined' ? null : window.localStorage.getItem(SNAPSHOTS_KEY);
  const [previousProjects, previousConfigs, previousSnapshots, previousOffcuts] = await Promise.all([
    listProjects(),
    loadSavedConfigs(),
    idbLoadSnapshots<ProjectSnapshot>(),
    idbLoadOffcuts(),
  ]);

  try {
    await idbSaveProjects(backup.projects);
    await idbSaveConfigs(backup.configs);
    await idbSaveSnapshots(backup.snapshots);
    await idbSaveOffcuts(backup.offcuts);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(backup.snapshots));
    }
  } catch (error) {
    const rollbackResults = await Promise.allSettled([
      idbSaveProjects(previousProjects),
      idbSaveConfigs(previousConfigs),
      idbSaveSnapshots(previousSnapshots),
      idbSaveOffcuts(previousOffcuts),
      Promise.resolve().then(() => {
        if (typeof window === 'undefined') return;
        if (previousSnapshotMirror === null) window.localStorage.removeItem(SNAPSHOTS_KEY);
        else window.localStorage.setItem(SNAPSHOTS_KEY, previousSnapshotMirror);
      }),
    ]);
    const rollbackErrors = rollbackResults.flatMap((result) => (result.status === 'rejected' ? [result.reason] : []));
    if (rollbackErrors.length > 0) {
      throw new AggregateError(
        [error, ...rollbackErrors],
        'Storage backup restore failed and rollback was incomplete',
        {
          cause: error,
        },
      );
    }
    throw new Error('Storage backup restore failed; the previous data was restored', { cause: error });
  }

  return backup;
}
