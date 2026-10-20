import { afterEach, describe, expect, it, vi } from 'vitest';
import PROJECT_UNVERSIONED from '../fixtures/projects/project-unversioned.json';
import PROJECT_V09 from '../fixtures/projects/project-v0.9.json';
import PROJECT_V10 from '../fixtures/projects/project-v1.0.json';
import {
  CURRENT_SCHEMA_VERSION,
  exportProjectJson,
  migrateProject,
  type SavedProject,
} from '../../src/utils/project-storage';

const historicalProjects = [
  { format: 'unversioned', fixture: PROJECT_UNVERSIONED, expectedName: 'Unversioned Workshop' },
  { format: 'v0.9', fixture: PROJECT_V09, expectedName: 'Legacy Workshop' },
  { format: 'v1.0', fixture: PROJECT_V10, expectedName: 'Canonical Workshop' },
] as const;

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('historical project compatibility', () => {
  it.each(historicalProjects)('migrates $format fixtures idempotently', ({ fixture, expectedName }) => {
    const migrated = migrateProject(fixture);
    expect(migrateProject(migrated)).toEqual(migrated);
    expect(migrated).toMatchObject({ name: expectedName, schemaVersion: CURRENT_SCHEMA_VERSION });
  });

  it('serializes the canonical project envelope deterministically', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const anchor = document.createElement('a');
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    vi.spyOn(anchor, 'click').mockImplementation(() => {});
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const exportedBlobs: Blob[] = [];
    vi.spyOn(URL, 'createObjectURL').mockImplementation((value) => {
      if (value instanceof Blob) exportedBlobs.push(value);
      return 'blob:project-history-test';
    });

    const project: SavedProject & { activeTab: string } = {
      id: 'canonical-export',
      name: '東京 Workshop',
      savedAt: '2025-12-01T00:00:00.000Z',
      cabinets: [],
      activeTab: 'optimizer',
    };

    exportProjectJson(project);
    exportProjectJson(project);

    expect(exportedBlobs).toHaveLength(2);
    const [first, second] = await Promise.all(exportedBlobs.map((blob) => blob.text()));
    expect(first).toBe(second);
    expect(first).toContain('"schemaVersion": "1.0"');
    expect(first).toContain('"generatedAt": "2026-01-01T00:00:00.000Z"');
    expect(first).not.toContain('"activeTab"');
    expect(JSON.parse(first) as Record<string, unknown>).toMatchObject({
      id: project.id,
      name: project.name,
      schemaVersion: CURRENT_SCHEMA_VERSION,
    });
  });
});
