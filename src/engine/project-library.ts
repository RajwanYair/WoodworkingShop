/**
 * Shared project library & catalog — Sprint 120 (Phase 27)
 *
 * Pure TypeScript: no DOM, no React, no I/O.
 * Manages a typed collection of saved cabinet configurations
 * with search, filtering, sorting, and import/export helpers.
 */
import type { CabinetConfig } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Taxonomic tag for a library entry. */
export type LibraryTag = 'kitchen' | 'bedroom' | 'bathroom' | 'office' | 'livingroom' | 'custom' | 'template';

/** Sort key for ordering library results. */
export type LibrarySortKey = 'name' | 'createdAt' | 'updatedAt' | 'width' | 'height';

/** A saved project entry in the shared library. */
export interface LibraryEntry {
  /** Unique identifier (UUIDv4-style). */
  readonly id: string;
  /** Human-readable display name. */
  name: string;
  /** Optional longer description. */
  description?: string;
  /** Taxonomic tags for filtering. */
  tags: ReadonlyArray<LibraryTag>;
  /** Saved cabinet configuration. */
  config: CabinetConfig;
  /** Wall-clock creation time (ms since epoch). */
  readonly createdAt: number;
  /** Wall-clock last-update time (ms since epoch). */
  updatedAt: number;
  /** Arbitrary key→value metadata (e.g. room name, project id). */
  metadata: Readonly<Record<string, string>>;
}

/** A single search result with a relevance rank in [0, 1]. */
export interface LibrarySearchResult {
  readonly entry: LibraryEntry;
  /** Relevance score: 1 = exact match, lower = partial. */
  readonly relevance: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function assertNonEmptyId(id: string): void {
  if (!id || id.trim().length === 0) {
    throw new RangeError('LibraryEntry id must be a non-empty string');
  }
}

function assertNonEmptyName(name: string): void {
  if (!name || name.trim().length === 0) {
    throw new RangeError('LibraryEntry name must be a non-empty string');
  }
}

// ---------------------------------------------------------------------------
// createLibraryEntry
// ---------------------------------------------------------------------------

/**
 * Creates a new {@link LibraryEntry} from a config and optional metadata.
 *
 * @throws {RangeError} if id or name is empty.
 */
export function createLibraryEntry(
  id: string,
  name: string,
  config: CabinetConfig,
  options: {
    description?: string;
    tags?: LibraryTag[];
    metadata?: Record<string, string>;
    createdAt?: number;
  } = {},
): LibraryEntry {
  assertNonEmptyId(id);
  assertNonEmptyName(name);
  const now = options.createdAt ?? Date.now();
  return {
    id,
    name,
    description: options.description,
    tags: options.tags ?? [],
    config,
    createdAt: now,
    updatedAt: now,
    metadata: options.metadata ?? {},
  };
}

// ---------------------------------------------------------------------------
// searchLibrary
// ---------------------------------------------------------------------------

/**
 * Searches library entries by a free-text query against name, description,
 * and metadata values. Returns results ordered by relevance descending.
 *
 * An empty query returns all entries at relevance 1.
 */
export function searchLibrary(entries: ReadonlyArray<LibraryEntry>, query: string): LibrarySearchResult[] {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length === 0) {
    return entries.map((entry) => ({ entry, relevance: 1 }));
  }

  const results: LibrarySearchResult[] = [];

  for (const entry of entries) {
    const nameLower = entry.name.toLowerCase();
    const descLower = (entry.description ?? '').toLowerCase();
    const metaValues = Object.values(entry.metadata).join(' ').toLowerCase();

    let relevance = 0;

    if (nameLower === trimmed) {
      relevance = 1; // exact name match
    } else if (nameLower.startsWith(trimmed)) {
      relevance = 0.9;
    } else if (nameLower.includes(trimmed)) {
      relevance = 0.7;
    } else if (descLower.includes(trimmed)) {
      relevance = 0.5;
    } else if (metaValues.includes(trimmed)) {
      relevance = 0.3;
    }

    if (relevance > 0) {
      results.push({ entry, relevance });
    }
  }

  return results.sort((a, b) => b.relevance - a.relevance);
}

// ---------------------------------------------------------------------------
// filterByTags
// ---------------------------------------------------------------------------

/**
 * Returns entries that have ALL of the specified tags.
 * An empty tags array returns all entries.
 */
export function filterByTags(entries: ReadonlyArray<LibraryEntry>, tags: ReadonlyArray<LibraryTag>): LibraryEntry[] {
  if (tags.length === 0) return [...entries];
  return entries.filter((e) => tags.every((t) => e.tags.includes(t)));
}

// ---------------------------------------------------------------------------
// sortLibrary
// ---------------------------------------------------------------------------

/**
 * Returns a sorted copy of the entries array.
 * Numeric fields sort ascending; string fields sort alphabetically.
 *
 * @throws {RangeError} if an unsupported sort key is provided.
 */
export function sortLibrary(entries: ReadonlyArray<LibraryEntry>, key: LibrarySortKey): LibraryEntry[] {
  const sorted = [...entries];
  switch (key) {
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'createdAt':
      return sorted.sort((a, b) => a.createdAt - b.createdAt);
    case 'updatedAt':
      return sorted.sort((a, b) => a.updatedAt - b.updatedAt);
    case 'width':
      return sorted.sort((a, b) => a.config.width - b.config.width);
    case 'height':
      return sorted.sort((a, b) => a.config.height - b.config.height);
    default: {
      const _exhaustive: never = key;
      throw new RangeError(`Unsupported sort key: ${_exhaustive}`);
    }
  }
}

// ---------------------------------------------------------------------------
// exportLibraryEntry
// ---------------------------------------------------------------------------

/**
 * Serialises a {@link LibraryEntry} to a plain JSON-safe record.
 * Suitable for clipboard share, URL encoding, or file export.
 */
export function exportLibraryEntry(entry: LibraryEntry): Record<string, unknown> {
  return {
    id: entry.id,
    name: entry.name,
    description: entry.description ?? '',
    tags: [...entry.tags],
    config: { ...entry.config },
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    metadata: { ...entry.metadata },
  };
}

// ---------------------------------------------------------------------------
// importLibraryEntry
// ---------------------------------------------------------------------------

/**
 * Validates and deserialises a raw JSON object into a {@link LibraryEntry}.
 *
 * @throws {RangeError} if required fields are missing or malformed.
 */
export function importLibraryEntry(raw: unknown): LibraryEntry {
  if (typeof raw !== 'object' || raw === null) {
    throw new RangeError('importLibraryEntry: expected a non-null object');
  }
  const r = raw as Record<string, unknown>;

  if (typeof r['id'] !== 'string' || r['id'].trim().length === 0) {
    throw new RangeError('importLibraryEntry: missing or empty "id"');
  }
  if (typeof r['name'] !== 'string' || r['name'].trim().length === 0) {
    throw new RangeError('importLibraryEntry: missing or empty "name"');
  }
  if (typeof r['config'] !== 'object' || r['config'] === null) {
    throw new RangeError('importLibraryEntry: missing or invalid "config"');
  }
  if (typeof r['createdAt'] !== 'number' || r['createdAt'] < 0) {
    throw new RangeError('importLibraryEntry: missing or invalid "createdAt"');
  }

  return {
    id: r['id'] as string,
    name: r['name'] as string,
    description: typeof r['description'] === 'string' ? r['description'] : undefined,
    tags: Array.isArray(r['tags']) ? (r['tags'] as LibraryTag[]) : [],
    config: r['config'] as CabinetConfig,
    createdAt: r['createdAt'] as number,
    updatedAt: typeof r['updatedAt'] === 'number' ? r['updatedAt'] : (r['createdAt'] as number),
    metadata:
      typeof r['metadata'] === 'object' && r['metadata'] !== null ? (r['metadata'] as Record<string, string>) : {},
  };
}
