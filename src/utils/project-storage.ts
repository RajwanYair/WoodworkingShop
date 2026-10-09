import type { CabinetEntry, ProjectSnapshot } from '../store/cabinet-store';
import { utf8ArrayBuffer, utf8Encode } from './browser-compat';
import { idbLoadProjects, idbSaveProjects, idbLoadSnapshots, idbSaveSnapshots } from './indexed-db-storage';

/** Current schema version written on every export. */
export const CURRENT_SCHEMA_VERSION = '1.0' as const;

/**
 * Convert an object to JSON string with only ASCII characters (non-ASCII escaped as \uXXXX).
 * This ensures exported files are compatible across all systems and encodings.
 */
function toAsciiJson(value: unknown, indent?: number | string): string {
  const jsonStr = JSON.stringify(value, null, indent);
  return jsonStr.replace(/[\u007F-\uFFFF]/g, (char) => {
    const code = char.codePointAt(0) ?? 0;
    const hex = code.toString(16).padStart(4, '0');
    return ['\\', 'u', ...hex].join('');
  });
}
const LEGACY_SCHEMA_VERSION = '0.9' as const;
const CURRENT_BUNDLE_SCHEMA_VERSION = 1 as const;

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

function createProjectId(existingIds: ReadonlySet<string> = new Set()): string {
  let id: string;
  do {
    id = `proj-${crypto.randomUUID()}`;
  } while (existingIds.has(id));
  return id;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return values.some((candidate) => candidate === value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isCabinetEntry(value: unknown): value is CabinetEntry {
  if (!isRecord(value) || typeof value['name'] !== 'string') return false;
  if (value['notes'] !== undefined && typeof value['notes'] !== 'string') return false;

  const config = value['config'];
  if (!isRecord(config)) return false;

  return (
    isOneOf(config['furnitureType'], ['cabinet', 'bookshelf', 'desk', 'wardrobe', 'panel']) &&
    ['width', 'height', 'depth', 'shelfCount', 'doorReveal', 'drawerCount', 'kickHeight'].every((key) =>
      isFiniteNumber(config[key]),
    ) &&
    isOneOf(config['shelfSpacing'], ['equal', 'custom']) &&
    Array.isArray(config['customShelfPositions']) &&
    config['customShelfPositions'].every(isFiniteNumber) &&
    typeof config['carcassMaterial'] === 'string' &&
    typeof config['backPanelMaterial'] === 'string' &&
    (config['doorCount'] === 1 || config['doorCount'] === 2) &&
    isOneOf(config['doorStyle'], ['flat', 'shaker', 'glass', 'none']) &&
    isOneOf(config['handleStyle'], ['bar', 'knob', 'cup', 'none']) &&
    isOneOf(config['edgeBanding'], ['all-visible', 'doors-only', 'none']) &&
    isOneOf(config['lang'], ['en', 'he'])
  );
}

function isProjectSnapshot(value: unknown): value is ProjectSnapshot {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['name'] === 'string' &&
    typeof value['timestamp'] === 'string' &&
    Array.isArray(value['cabinets']) &&
    value['cabinets'].every(isCabinetEntry)
  );
}

function isSupportedSchemaVersion(version: string): boolean {
  return PROJECT_SCHEMA_REGISTRY.supportedImportVersions.includes(
    version as (typeof PROJECT_SCHEMA_REGISTRY.supportedImportVersions)[number],
  );
}

function detectProjectSchemaVersion(raw: Record<string, unknown>): string {
  if (typeof raw['schemaVersion'] === 'string' && raw['schemaVersion'].trim()) {
    return raw['schemaVersion'];
  }
  if (typeof raw['projectName'] === 'string' && !('name' in raw)) {
    return LEGACY_SCHEMA_VERSION;
  }
  return CURRENT_SCHEMA_VERSION;
}

function migrateLegacyProjectV09(raw: Record<string, unknown>): Record<string, unknown> {
  const nameValue =
    typeof raw['name'] === 'string'
      ? raw['name']
      : typeof raw['projectName'] === 'string'
        ? raw['projectName']
        : 'Untitled';
  return {
    ...raw,
    name: nameValue,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}

const PROJECT_MIGRATIONS = [
  { from: LEGACY_SCHEMA_VERSION, to: CURRENT_SCHEMA_VERSION, migrate: migrateLegacyProjectV09 },
] as const;

export const PROJECT_SCHEMA_REGISTRY = {
  latest: CURRENT_SCHEMA_VERSION,
  supportedImportVersions: [LEGACY_SCHEMA_VERSION, CURRENT_SCHEMA_VERSION],
  migrations: PROJECT_MIGRATIONS.map(({ from, to }) => ({ from, to })),
} as const;

function normaliseProjectRecord(raw: Record<string, unknown>): Record<string, unknown> {
  let version = detectProjectSchemaVersion(raw);
  if (!isSupportedSchemaVersion(version)) {
    throw new Error(`Unsupported project schema version: ${version}`);
  }

  let project: Record<string, unknown> = { ...raw, schemaVersion: version };
  while (version !== PROJECT_SCHEMA_REGISTRY.latest) {
    const migration = PROJECT_MIGRATIONS.find((candidate) => candidate.from === version);
    if (!migration) {
      throw new Error(`No migration path from project schema version: ${version}`);
    }

    project = migration.migrate(project);
    if (project['schemaVersion'] !== migration.to) {
      throw new Error(`Project migration from ${migration.from} did not produce schema version ${migration.to}`);
    }
    version = migration.to;
  }

  return project;
}

function parseBundleSchemaVersion(raw: Record<string, unknown>): number {
  const version = raw['version'];
  if (version === undefined) {
    return CURRENT_BUNDLE_SCHEMA_VERSION;
  }
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new Error('Invalid bundle: version must be a positive integer');
  }
  return version;
}

/**
 * Migrate an unknown imported payload to a valid SavedProject.
 * Throws a descriptive Error if the payload is structurally invalid.
 * Future schema versions add migration steps before the final return.
 */
export function migrateProject(raw: unknown): SavedProject {
  if (!isRecord(raw)) {
    throw new Error('Project file must be a JSON object');
  }
  const p = normaliseProjectRecord(raw);
  if (!Array.isArray(p['cabinets'])) {
    throw new TypeError('Invalid project file: missing cabinets array');
  }
  if (!p['cabinets'].every(isCabinetEntry)) {
    throw new TypeError('Invalid project file: cabinets must contain valid cabinet entries');
  }
  if (p['snapshots'] !== undefined && !Array.isArray(p['snapshots'])) {
    throw new TypeError('Invalid project file: snapshots must be an array');
  }
  if (Array.isArray(p['snapshots']) && !p['snapshots'].every(isProjectSnapshot)) {
    throw new TypeError('Invalid project file: snapshots must contain valid snapshot records');
  }
  // v1.0 — no structural migration needed; ensure required fields have defaults
  const migrated: SavedProject = {
    id: typeof p['id'] === 'string' ? p['id'] : createProjectId(),
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
  const records = await idbLoadProjects<unknown>();
  try {
    return records.map(migrateProject);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid saved project storage: ${detail}`, { cause: error });
  }
}

async function save(projects: SavedProject[]): Promise<void> {
  await idbSaveProjects(projects);
}

let projectWriteQueue: Promise<void> = Promise.resolve();

function withProjectWriteLock<T>(operation: () => Promise<T>): Promise<T> {
  const result = projectWriteQueue.then(operation);
  projectWriteQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export async function listProjects(): Promise<SavedProject[]> {
  return load();
}

export function saveProject(name: string, cabinets: CabinetEntry[]): Promise<SavedProject> {
  return withProjectWriteLock(async () => {
    const projects = await load();
    const id = createProjectId(new Set(projects.map((project) => project.id)));
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
  });
}

export function deleteProject(id: string): Promise<void> {
  return withProjectWriteLock(async () => {
    const projects = (await load()).filter((p) => p.id !== id);
    await save(projects);
  });
}

function createProjectExportRecord(project: SavedProject, snapshots = project.snapshots): SavedProject {
  const record: SavedProject = {
    id: project.id,
    name: project.name,
    savedAt: project.savedAt,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    cabinets: project.cabinets,
  };
  if (project.generatedAt !== undefined) record.generatedAt = project.generatedAt;
  if (snapshots !== undefined) record.snapshots = snapshots;
  return record;
}

export function exportProjectJson(project: SavedProject, snapshots?: ProjectSnapshot[]): void {
  const payload: SavedProject = {
    ...createProjectExportRecord(project, snapshots),
    generatedAt: new Date().toISOString(),
  };
  const blob = new Blob([toAsciiJson(payload, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name.replace(/[^\w-]/g, '_')}.cabinet-project.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function importProjectJson(file: File): Promise<SavedProject> {
  return withProjectWriteLock(async () => {
    const text = await file.text();
    const raw = JSON.parse(text) as unknown;
    const project = migrateProject(raw);
    const projects = await load();
    const snapshots = project.snapshots ?? [];
    const existingSnapshots = snapshots.length > 0 ? await idbLoadSnapshots<ProjectSnapshot>() : [];
    if (!existingSnapshots.every(isProjectSnapshot)) {
      throw new Error('Invalid saved snapshot storage: snapshots must contain valid snapshot records');
    }

    // Re-save with a fresh id to avoid conflicts
    project.id = createProjectId(new Set(projects.map((existingProject) => existingProject.id)));
    project.savedAt = new Date().toISOString();
    projects.push(project);

    if (snapshots.length > 0) {
      const existingIds = new Set(existingSnapshots.map((snapshot) => snapshot.id));
      const mergedSnapshots = [...existingSnapshots, ...snapshots.filter((snapshot) => !existingIds.has(snapshot.id))];
      await idbSaveSnapshots(mergedSnapshots);
      try {
        await save(projects);
      } catch (error) {
        try {
          await idbSaveSnapshots(existingSnapshots);
        } catch (rollbackError) {
          throw new AggregateError(
            [error, rollbackError],
            'Project import failed and snapshot history rollback also failed',
            { cause: rollbackError },
          );
        }
        throw new Error('Project import failed: saved projects could not be updated; snapshot history was restored', {
          cause: error,
        });
      }
    } else {
      await save(projects);
    }
    return project;
  });
}

/** Export multiple projects as a single `.cabinet-projects.json` bundle */
export async function exportProjectsBundle(projects: SavedProject[]): Promise<void> {
  // Sprint 10 — build individual file JSON strings and compute SHA-256 manifests
  const fileEntries = projects.map((p) => {
    const project = createProjectExportRecord(p);
    const content = toAsciiJson(project, 2);
    return { name: `${project.name.replace(/[^\w-]/g, '_')}.cabinet-project.json`, content, project };
  });

  const manifest = await Promise.all(
    fileEntries.map(async (f) => {
      const encoded = utf8Encode(f.content);
      const hashBuffer = await crypto.subtle.digest('SHA-256', utf8ArrayBuffer(f.content));
      const hashHex = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      return { name: f.name, size: encoded.byteLength, sha256: hashHex };
    }),
  );

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    manifest,
    projects: fileEntries.map((entry) => entry.project),
  };
  const blob = new Blob([toAsciiJson(payload, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cabinet-projects-bundle-${new Date().toISOString().slice(0, 10)}.cabinet-projects.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Import a `.cabinet-projects.json` bundle, merging all contained projects */
export function importProjectsBundle(file: File): Promise<SavedProject[]> {
  return withProjectWriteLock(async () => {
    const text = await file.text();
    const parsed = JSON.parse(text) as unknown;
    if (!isRecord(parsed)) {
      throw new Error('Invalid bundle: root must be an object');
    }
    const bundleVersion = parseBundleSchemaVersion(parsed);
    if (bundleVersion > CURRENT_BUNDLE_SCHEMA_VERSION) {
      throw new Error(`Unsupported bundle version: ${bundleVersion}`);
    }
    const incoming = parsed.projects;
    if (!Array.isArray(incoming)) {
      throw new TypeError('Invalid bundle: missing projects array');
    }
    const existing = await load();
    const existingNames = new Set(existing.map((p) => p.name.toLowerCase()));
    const existingIds = new Set(existing.map((p) => p.id));
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
        id: createProjectId(existingIds),
        savedAt: new Date().toISOString(),
        name: existingNames.has(proj.name.toLowerCase()) ? `${proj.name} (imported)` : proj.name,
      };
      existing.push(merged);
      existingNames.add(merged.name.toLowerCase());
      existingIds.add(merged.id);
      added.push(merged);
    }
    await save(existing);
    return added;
  });
}

// ── Project Settings export / import ─────────────────────────────────────────

/** Optimizer and cost settings that can be saved/restored independently of cabinet geometries. */
export interface ProjectSettings {
  sawKerf: number;
  materialPriceOverrides: Record<string, number>;
  edgeBandingRate: number;
  hardwarePriceOverrides: Record<string, number>;
  hardwareQtyOverrides: Record<string, number>;
  sheetSizeOverrides: Record<string, { width: number; length: number }>;
  labourRate: number;
  labourHours: number;
  finishCost: number;
}

/** Trigger a browser download of the current settings as a `.cabinet-settings.json` file. */
export function exportSettingsJson(settings: ProjectSettings, projectName: string): void {
  const blob = new Blob([toAsciiJson(settings, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName.replace(/[^\w\u05D0-\u05EA.-]/g, '_')}.cabinet-settings.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Validate and extract a `ProjectSettings` object from an already-parsed JSON value.
 * Missing or wrong-typed fields fall back to safe defaults.
 * Throws if the payload is not a plain object.
 */
export function importSettingsJson(raw: unknown): ProjectSettings {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Settings file must be a JSON object');
  }
  const p = raw as Record<string, unknown>;
  const isPlainObj = (v: unknown): v is Record<string, unknown> =>
    v !== null && typeof v === 'object' && !Array.isArray(v);
  return {
    sawKerf: typeof p['sawKerf'] === 'number' ? p['sawKerf'] : 4,
    materialPriceOverrides: isPlainObj(p['materialPriceOverrides'])
      ? (p['materialPriceOverrides'] as Record<string, number>)
      : {},
    edgeBandingRate: typeof p['edgeBandingRate'] === 'number' ? p['edgeBandingRate'] : 3,
    hardwarePriceOverrides: isPlainObj(p['hardwarePriceOverrides'])
      ? (p['hardwarePriceOverrides'] as Record<string, number>)
      : {},
    hardwareQtyOverrides: isPlainObj(p['hardwareQtyOverrides'])
      ? (p['hardwareQtyOverrides'] as Record<string, number>)
      : {},
    sheetSizeOverrides: isPlainObj(p['sheetSizeOverrides'])
      ? (p['sheetSizeOverrides'] as Record<string, { width: number; length: number }>)
      : {},
    labourRate: typeof p['labourRate'] === 'number' ? p['labourRate'] : 75,
    labourHours: typeof p['labourHours'] === 'number' ? p['labourHours'] : 0,
    finishCost: typeof p['finishCost'] === 'number' ? p['finishCost'] : 0,
  };
}
