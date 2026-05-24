/**
 * Optional Supabase Backend Stub — Sprint 20
 *
 * A thin feature-flagged adapter for an optional Supabase back-end.
 * When VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not set (the
 * default) the service falls back to local IndexedDB storage and behaves
 * identically to the offline-only build.
 *
 * This module purposely does NOT import @supabase/supabase-js.  Instead it
 * defines the interface contract and a local-only implementation so the rest
 * of the app can reference `BackendService` without incurring the Supabase
 * bundle cost.  When a team actually configures Supabase credentials the
 * adapter can be swapped in at the call-site without changing any consumer.
 *
 * SECURITY NOTE: The anon key is only usable through Supabase Row Level
 * Security policies.  Never expose a service-role key here.
 */

// ── Feature flag detection ────────────────────────────────────────────────────

/** True when VITE_SUPABASE_URL is present and non-empty at build time. */
export const SUPABASE_ENABLED: boolean =
  typeof import.meta.env.VITE_SUPABASE_URL === 'string' &&
  import.meta.env.VITE_SUPABASE_URL.length > 0;

/** Supabase project URL (empty string when not configured). */
export const SUPABASE_URL: string = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';

/** Supabase anon key (empty string when not configured). */
export const SUPABASE_ANON_KEY: string = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';

// ── Service contract ──────────────────────────────────────────────────────────

export interface SavedProjectRecord {
  id: string;
  name: string;
  data: string;  // JSON payload
  createdAt: string;
  updatedAt: string;
}

/**
 * Minimal backend service interface.
 * Both the local (IDB) implementation and the Supabase adapter implement this.
 */
export interface BackendService {
  /** Whether this service is backed by a remote server. */
  readonly isRemote: boolean;
  /** Save or update a project record.  Returns the stored record. */
  saveProject(id: string, name: string, data: string): Promise<SavedProjectRecord>;
  /** Load a project by ID.  Returns null when not found. */
  loadProject(id: string): Promise<SavedProjectRecord | null>;
  /** List all saved project records (newest first). */
  listProjects(): Promise<SavedProjectRecord[]>;
  /** Delete a project by ID. */
  deleteProject(id: string): Promise<void>;
}

// ── Local (IDB) implementation ────────────────────────────────────────────────

import { get, set, del, entries, createStore } from 'idb-keyval';

const projectStore = createStore('cabinet-planner-backend', 'projects');

/** Local-only backend service backed by IndexedDB. */
export const localBackendService: BackendService = {
  isRemote: false,

  async saveProject(id, name, data) {
    const now = new Date().toISOString();
    const existing = await get<SavedProjectRecord>(id, projectStore);
    const record: SavedProjectRecord = {
      id,
      name,
      data,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await set(id, record, projectStore);
    return record;
  },

  async loadProject(id) {
    const record = await get<SavedProjectRecord>(id, projectStore);
    return record ?? null;
  },

  async listProjects() {
    const all = (await entries<string, SavedProjectRecord>(projectStore)) as [string, SavedProjectRecord][];
    return all
      .map(([, v]) => v)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async deleteProject(id) {
    await del(id, projectStore);
  },
};

// ── Service resolver ──────────────────────────────────────────────────────────

/**
 * Return the active backend service.
 * Currently always returns `localBackendService` (the Supabase adapter
 * is not included in this build to avoid the bundle weight).
 * When SUPABASE_ENABLED is true in a future integration, swap this
 * return value for a proper Supabase-backed implementation.
 */
export function getBackendService(): BackendService {
  return localBackendService;
}
