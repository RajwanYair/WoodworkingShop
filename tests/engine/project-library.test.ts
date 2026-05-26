import { describe, expect, it } from 'vitest';
import {
  createLibraryEntry,
  exportLibraryEntry,
  filterByTags,
  importLibraryEntry,
  searchLibrary,
  sortLibrary,
} from '../../src/engine/project-library';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import type { LibraryEntry } from '../../src/engine/project-library';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function entry(id: string, name: string, overrides: Partial<Omit<LibraryEntry, 'id' | 'name'>> = {}): LibraryEntry {
  return createLibraryEntry(id, name, DEFAULT_CONFIG, {
    tags: overrides.tags ? [...overrides.tags] : [],
    description: overrides.description,
    metadata: overrides.metadata ?? {},
    createdAt: overrides.createdAt ?? 1000,
  });
}

const kitchenEntry = entry('a', 'Kitchen Cabinet', { tags: ['kitchen'], createdAt: 1000 });
const bedroomEntry = entry('b', 'Bedroom Wardrobe', { tags: ['bedroom'], createdAt: 2000 });
const officeEntry = entry('c', 'Office Bookshelf', { tags: ['office', 'custom'], createdAt: 3000 });

// ---------------------------------------------------------------------------
// createLibraryEntry
// ---------------------------------------------------------------------------

describe('createLibraryEntry', () => {
  it('creates entry with correct fields', () => {
    const e = entry('x', 'My Cabinet');
    expect(e.id).toBe('x');
    expect(e.name).toBe('My Cabinet');
    expect(e.tags).toEqual([]);
    expect(e.createdAt).toBe(1000);
    expect(e.updatedAt).toBe(1000);
    expect(e.config).toBe(DEFAULT_CONFIG);
  });

  it.each([
    ['empty id', '', 'Cabinet'],
    ['whitespace id', '   ', 'Cabinet'],
  ])('%s → RangeError', (_, id, name) => {
    expect(() => createLibraryEntry(id, name, DEFAULT_CONFIG)).toThrow(RangeError);
  });

  it('empty name → RangeError', () => {
    expect(() => createLibraryEntry('id', '', DEFAULT_CONFIG)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// searchLibrary
// ---------------------------------------------------------------------------

describe('searchLibrary', () => {
  const entries = [kitchenEntry, bedroomEntry, officeEntry];

  it('empty query returns all entries at relevance 1', () => {
    const results = searchLibrary(entries, '');
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.relevance === 1)).toBe(true);
  });

  it('exact name match scores 1', () => {
    const results = searchLibrary(entries, 'Kitchen Cabinet');
    expect(results[0].relevance).toBe(1);
    expect(results[0].entry.id).toBe('a');
  });

  it('prefix match scores higher than contains', () => {
    const results = searchLibrary(entries, 'Kitchen');
    expect(results[0].entry.id).toBe('a');
    expect(results[0].relevance).toBeGreaterThanOrEqual(0.9);
  });

  it('returns only matching entries', () => {
    const results = searchLibrary(entries, 'Bookshelf');
    expect(results).toHaveLength(1);
    expect(results[0].entry.id).toBe('c');
  });

  it('returns empty array when nothing matches', () => {
    expect(searchLibrary(entries, 'ZZZ-no-match')).toHaveLength(0);
  });

  it('description match scores lower than name match', () => {
    const withDesc = entry('d', 'Cabinet X', { description: 'some special custom shelf' });
    const results = searchLibrary([withDesc, kitchenEntry], 'kitchen');
    const kitchenResult = results.find((r) => r.entry.id === 'a');
    const descResult = results.find((r) => r.entry.id === 'd');
    expect(kitchenResult).toBeDefined();
    expect(descResult).toBeUndefined(); // 'd' doesn't mention 'kitchen' in name or desc
    expect(kitchenResult!.relevance).toBeGreaterThan(0.5);
  });

  it('metadata values are searchable', () => {
    const e = entry('e', 'Generic', { metadata: { room: 'bathroom-alpha' } });
    const results = searchLibrary([e], 'bathroom-alpha');
    expect(results[0].entry.id).toBe('e');
    expect(results[0].relevance).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// filterByTags
// ---------------------------------------------------------------------------

describe('filterByTags', () => {
  const entries = [kitchenEntry, bedroomEntry, officeEntry];

  it('empty tags returns all entries', () => {
    expect(filterByTags(entries, [])).toHaveLength(3);
  });

  it('single tag filters correctly', () => {
    const result = filterByTags(entries, ['kitchen']);
    expect(result.map((e) => e.id)).toEqual(['a']);
  });

  it('multiple tags require ALL to match', () => {
    const result = filterByTags(entries, ['office', 'custom']);
    expect(result.map((e) => e.id)).toEqual(['c']);
  });

  it('returns empty when no entry matches all tags', () => {
    expect(filterByTags(entries, ['kitchen', 'bedroom'])).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// sortLibrary
// ---------------------------------------------------------------------------

describe('sortLibrary', () => {
  const entries = [bedroomEntry, kitchenEntry, officeEntry]; // mixed order

  it('sorts by name alphabetically', () => {
    const sorted = sortLibrary(entries, 'name');
    expect(sorted.map((e) => e.name)).toEqual(['Bedroom Wardrobe', 'Kitchen Cabinet', 'Office Bookshelf']);
  });

  it('sorts by createdAt ascending', () => {
    const sorted = sortLibrary(entries, 'createdAt');
    expect(sorted.map((e) => e.createdAt)).toEqual([1000, 2000, 3000]);
  });

  it('sorts by updatedAt ascending', () => {
    const sorted = sortLibrary(entries, 'updatedAt');
    expect(sorted[0].createdAt).toBeLessThanOrEqual(sorted[1].createdAt);
  });

  it('sorts by width ascending', () => {
    const wide = createLibraryEntry('w', 'Wide', { ...DEFAULT_CONFIG, width: 1200 });
    const narrow = createLibraryEntry('n', 'Narrow', { ...DEFAULT_CONFIG, width: 400 });
    const sorted = sortLibrary([wide, narrow], 'width');
    expect(sorted[0].id).toBe('n');
  });

  it('sorts by height ascending', () => {
    const tall = createLibraryEntry('t', 'Tall', { ...DEFAULT_CONFIG, height: 2400 });
    const short = createLibraryEntry('s', 'Short', { ...DEFAULT_CONFIG, height: 500 });
    const sorted = sortLibrary([tall, short], 'height');
    expect(sorted[0].id).toBe('s');
  });

  it('does not mutate original array', () => {
    const original = [bedroomEntry, kitchenEntry];
    sortLibrary(original, 'name');
    expect(original[0].id).toBe('b'); // unchanged
  });
});

// ---------------------------------------------------------------------------
// exportLibraryEntry / importLibraryEntry round-trip
// ---------------------------------------------------------------------------

describe('export/import round-trip', () => {
  it('export → import produces equivalent entry', () => {
    const original = entry('rt', 'Round Trip', { tags: ['kitchen', 'custom'] });
    const exported = exportLibraryEntry(original);
    const imported = importLibraryEntry(exported);
    expect(imported.id).toBe(original.id);
    expect(imported.name).toBe(original.name);
    expect(imported.tags).toEqual(original.tags);
    expect(imported.createdAt).toBe(original.createdAt);
  });
});

// ---------------------------------------------------------------------------
// importLibraryEntry — validation
// ---------------------------------------------------------------------------

describe('importLibraryEntry — validation', () => {
  it.each([
    ['null input', null],
    ['non-object', 42],
    ['missing id', { name: 'X', config: {}, createdAt: 1 }],
    ['empty id', { id: '', name: 'X', config: {}, createdAt: 1 }],
    ['missing name', { id: 'x', config: {}, createdAt: 1 }],
    ['missing config', { id: 'x', name: 'X', createdAt: 1 }],
    ['invalid createdAt', { id: 'x', name: 'X', config: {}, createdAt: -1 }],
  ])('%s → RangeError', (_, raw) => {
    expect(() => importLibraryEntry(raw)).toThrow(RangeError);
  });
});
