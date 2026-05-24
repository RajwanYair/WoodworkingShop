/**
 * Optional Supabase Backend Stub — Sprint 20
 *
 * Tests for src/services/supabase.ts
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  SUPABASE_ENABLED,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  localBackendService,
  getBackendService,
} from '../../src/services/supabase';

async function resetStore() {
  const { keys, del, createStore } = await import('idb-keyval');
  const store = createStore('cabinet-planner-backend', 'projects');
  const all = await keys(store);
  await Promise.all(all.map((k) => del(k as string, store)));
}

// ── Feature flags ─────────────────────────────────────────────────────────────

describe('feature flags', () => {
  it('SUPABASE_ENABLED is a boolean', () => {
    expect(typeof SUPABASE_ENABLED).toBe('boolean');
  });

  it('SUPABASE_URL is a string', () => {
    expect(typeof SUPABASE_URL).toBe('string');
  });

  it('SUPABASE_ANON_KEY is a string', () => {
    expect(typeof SUPABASE_ANON_KEY).toBe('string');
  });

  it('SUPABASE_ENABLED is false in test environment (no env vars)', () => {
    // In test builds VITE_SUPABASE_URL is not set
    expect(SUPABASE_ENABLED).toBe(false);
  });
});

// ── getBackendService ─────────────────────────────────────────────────────────

describe('getBackendService', () => {
  it('returns a BackendService', () => {
    const svc = getBackendService();
    expect(typeof svc.saveProject).toBe('function');
    expect(typeof svc.loadProject).toBe('function');
    expect(typeof svc.listProjects).toBe('function');
    expect(typeof svc.deleteProject).toBe('function');
  });

  it('returns local service (isRemote = false) by default', () => {
    expect(getBackendService().isRemote).toBe(false);
  });
});

// ── localBackendService.saveProject ──────────────────────────────────────────

describe('localBackendService.saveProject', () => {
  beforeEach(resetStore);

  it('saves and returns a record', async () => {
    const record = await localBackendService.saveProject('p1', 'My Kitchen', '{"cabinets":[]}');
    expect(record.id).toBe('p1');
    expect(record.name).toBe('My Kitchen');
    expect(record.data).toBe('{"cabinets":[]}');
  });

  it('sets createdAt and updatedAt', async () => {
    const record = await localBackendService.saveProject('p2', 'Bathroom', '{}');
    expect(() => new Date(record.createdAt).toISOString()).not.toThrow();
    expect(() => new Date(record.updatedAt).toISOString()).not.toThrow();
  });

  it('preserves createdAt on update', async () => {
    const first = await localBackendService.saveProject('p3', 'Room', '{}');
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await localBackendService.saveProject('p3', 'Room Updated', '{"v":2}');
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.name).toBe('Room Updated');
  });
});

// ── localBackendService.loadProject ──────────────────────────────────────────

describe('localBackendService.loadProject', () => {
  beforeEach(resetStore);

  it('returns null for unknown id', async () => {
    expect(await localBackendService.loadProject('ghost')).toBeNull();
  });

  it('returns saved project by id', async () => {
    await localBackendService.saveProject('load-me', 'Load Test', '{"x":1}');
    const record = await localBackendService.loadProject('load-me');
    expect(record).not.toBeNull();
    expect(record!.data).toBe('{"x":1}');
  });
});

// ── localBackendService.listProjects ─────────────────────────────────────────

describe('localBackendService.listProjects', () => {
  beforeEach(resetStore);

  it('returns empty list when no projects saved', async () => {
    expect(await localBackendService.listProjects()).toHaveLength(0);
  });

  it('returns all projects sorted by updatedAt descending', async () => {
    await localBackendService.saveProject('old', 'Old', '{}');
    await new Promise((resolve) => setTimeout(resolve, 5));
    await localBackendService.saveProject('new', 'New', '{}');
    const list = await localBackendService.listProjects();
    expect(list[0].id).toBe('new');
    expect(list[1].id).toBe('old');
  });
});

// ── localBackendService.deleteProject ────────────────────────────────────────

describe('localBackendService.deleteProject', () => {
  beforeEach(resetStore);

  it('deletes a project', async () => {
    await localBackendService.saveProject('del-me', 'Delete', '{}');
    await localBackendService.deleteProject('del-me');
    expect(await localBackendService.loadProject('del-me')).toBeNull();
  });

  it('silently ignores deletion of unknown id', async () => {
    await expect(localBackendService.deleteProject('ghost')).resolves.toBeUndefined();
  });
});
