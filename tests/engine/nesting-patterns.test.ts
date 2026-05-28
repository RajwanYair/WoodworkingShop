import { describe, it, expect } from 'vitest';
import {
  createLibrary,
  createPattern,
  addPattern,
  removePattern,
  findBySheet,
  findByCategory,
  findByTag,
  scorePatterns,
  getCategories,
  getTags,
  getLibraryStats,
  MAX_PATTERNS,
  MAX_PLACEMENTS,
} from '../../src/engine/nesting-patterns';
import type { PatternPlacement, DemandItem } from '../../src/engine/nesting-patterns';

// ─── Helpers ──────────────────────────────────────────────────────────────────

let idCounter = 0;
const testIdGen = () => `test-pat-${++idCounter}`;

function makePlacement(overrides: Partial<PatternPlacement> = {}): PatternPlacement {
  return {
    label: 'panel',
    x: 0,
    y: 0,
    width: 400,
    length: 600,
    rotated: false,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('nesting-patterns', () => {
  describe('createLibrary', () => {
    it('creates an empty library', () => {
      const lib = createLibrary();
      expect(lib.version).toBe(1);
      expect(lib.patterns).toHaveLength(0);
    });
  });

  describe('createPattern', () => {
    it('creates a pattern with correct fill rate', () => {
      const placements = [
        makePlacement({ x: 0, y: 0, width: 600, length: 300 }),
        makePlacement({ x: 0, y: 300, width: 600, length: 300 }),
      ];
      const pattern = createPattern('2-shelf', 'shelf', 1220, 600, placements, {}, testIdGen);

      expect(pattern.name).toBe('2-shelf');
      expect(pattern.category).toBe('shelf');
      expect(pattern.sheetWidth).toBe(1220);
      expect(pattern.fillRate).toBeCloseTo(0.492, 2);
      expect(pattern.placements).toHaveLength(2);
    });

    it.each([
      { name: '', desc: 'empty name' },
      { name: '  ', desc: 'whitespace name' },
    ])('rejects $desc', ({ name }) => {
      expect(() => createPattern(name, 'cat', 100, 100, [], {}, testIdGen)).toThrow(RangeError);
    });

    it('rejects non-positive sheet dimensions', () => {
      expect(() => createPattern('X', 'c', 0, 100, [], {}, testIdGen)).toThrow(RangeError);
      expect(() => createPattern('X', 'c', 100, -5, [], {}, testIdGen)).toThrow(RangeError);
    });

    it('rejects placements exceeding sheet bounds', () => {
      const placements = [makePlacement({ x: 900, y: 0, width: 400, length: 100 })];
      expect(() => createPattern('X', 'c', 1000, 1000, placements, {}, testIdGen)).toThrow(RangeError);
    });

    it('rejects placements with non-positive dimensions', () => {
      const placements = [makePlacement({ width: 0, length: 100 })];
      expect(() => createPattern('X', 'c', 1000, 1000, placements, {}, testIdGen)).toThrow(RangeError);
    });

    it('rejects exceeding MAX_PLACEMENTS', () => {
      const placements = Array.from({ length: MAX_PLACEMENTS + 1 }, (_, i) =>
        makePlacement({ x: 0, y: i, width: 1, length: 1, label: `p${i}` }),
      );
      expect(() => createPattern('Big', 'c', 10000, 10000, placements, {}, testIdGen)).toThrow(RangeError);
    });
  });

  describe('addPattern / removePattern', () => {
    it('adds and removes a pattern', () => {
      const lib = createLibrary();
      const pattern = createPattern('A', 'shelf', 2440, 1220, [], {}, testIdGen);
      const added = addPattern(lib, pattern);

      expect(added.patterns).toHaveLength(1);

      const removed = removePattern(added, pattern.id);
      expect(removed.patterns).toHaveLength(0);
    });

    it('rejects duplicate pattern ID', () => {
      const lib = createLibrary();
      const pattern = createPattern('A', 'shelf', 2440, 1220, [], {}, testIdGen);
      const added = addPattern(lib, pattern);
      expect(() => addPattern(added, pattern)).toThrow(RangeError);
    });

    it('rejects removing non-existent pattern', () => {
      const lib = createLibrary();
      expect(() => removePattern(lib, 'ghost')).toThrow(RangeError);
    });

    it('rejects exceeding MAX_PATTERNS', () => {
      let lib = createLibrary();
      for (let i = 0; i < MAX_PATTERNS; i++) {
        lib = addPattern(lib, createPattern(`P${i}`, 'c', 100, 100, [], {}, testIdGen));
      }
      expect(() => addPattern(lib, createPattern('overflow', 'c', 100, 100, [], {}, testIdGen))).toThrow(RangeError);
    });
  });

  describe('findBySheet', () => {
    it('finds patterns matching sheet dimensions', async () => {
      let lib = createLibrary();
      lib = addPattern(lib, createPattern('A', 'shelf', 2440, 1220, [], {}, testIdGen));
      lib = addPattern(lib, createPattern('B', 'door', 2440, 1220, [], {}, testIdGen));
      lib = addPattern(lib, createPattern('C', 'drawer', 1830, 610, [], {}, testIdGen));

      const results = findBySheet(lib, 2440, 1220);
      expect(await results).toHaveLength(2);
    });
  });

  describe('findByCategory', () => {
    it('filters by category', async () => {
      let lib = createLibrary();
      lib = addPattern(lib, createPattern('A', 'shelf', 2440, 1220, [], {}, testIdGen));
      lib = addPattern(lib, createPattern('B', 'door', 2440, 1220, [], {}, testIdGen));

      expect(await findByCategory(lib, 'door')).toHaveLength(1);
      expect(await findByCategory(lib, 'shelf')).toHaveLength(1);
      expect(await findByCategory(lib, 'other')).toHaveLength(0);
    });
  });

  describe('findByTag', () => {
    it('finds patterns by tag (case-insensitive)', async () => {
      let lib = createLibrary();
      lib = addPattern(lib, createPattern('A', 'shelf', 2440, 1220, [], { tags: ['kitchen', 'plywood'] }, testIdGen));
      lib = addPattern(lib, createPattern('B', 'door', 2440, 1220, [], { tags: ['Kitchen', 'MDF'] }, testIdGen));

      expect(await findByTag(lib, 'kitchen')).toHaveLength(2);
      expect(await findByTag(lib, 'MDF')).toHaveLength(1);
      expect(await findByTag(lib, 'oak')).toHaveLength(0);
    });
  });

  describe('scorePatterns', () => {
    it('scores pattern fit against demand', () => {
      const placements = [
        makePlacement({ width: 400, length: 600, x: 0, y: 0 }),
        makePlacement({ width: 400, length: 600, x: 400, y: 0 }),
      ];
      let lib = createLibrary();
      lib = addPattern(lib, createPattern('2panel', 'shelf', 2440, 1220, placements, {}, testIdGen));

      const demand: DemandItem[] = [{ label: 'shelf', width: 400, length: 600, qty: 2, canRotate: false }];

      const scores = scorePatterns(lib, demand, 2440, 1220);
      expect(scores).toHaveLength(1);
      expect(scores[0].fitScore).toBe(1);
      expect(scores[0].satisfiedItems).toBe(2);
    });

    it('returns empty for non-matching sheet size', () => {
      let lib = createLibrary();
      lib = addPattern(lib, createPattern('A', 'c', 2440, 1220, [], {}, testIdGen));

      const demand: DemandItem[] = [{ label: 'x', width: 100, length: 100, qty: 1, canRotate: false }];
      const scores = scorePatterns(lib, demand, 1000, 1000);
      expect(scores).toHaveLength(0);
    });

    it('considers rotation when canRotate is true', () => {
      const placements = [makePlacement({ width: 600, length: 400, x: 0, y: 0 })];
      let lib = createLibrary();
      lib = addPattern(lib, createPattern('rot', 'c', 2440, 1220, placements, {}, testIdGen));

      const demand: DemandItem[] = [{ label: 'panel', width: 400, length: 600, qty: 1, canRotate: true }];
      const scores = scorePatterns(lib, demand, 2440, 1220);
      expect(scores[0].fitScore).toBe(1);
    });
  });

  describe('getCategories / getTags', () => {
    it('returns unique sorted categories and tags', () => {
      let lib = createLibrary();
      lib = addPattern(lib, createPattern('A', 'shelf', 100, 100, [], { tags: ['oak', 'plywood'] }, testIdGen));
      lib = addPattern(lib, createPattern('B', 'door', 100, 100, [], { tags: ['oak', 'mdf'] }, testIdGen));
      lib = addPattern(lib, createPattern('C', 'shelf', 100, 100, [], { tags: [] }, testIdGen));

      expect(getCategories(lib)).toEqual(['door', 'shelf']);
      expect(getTags(lib)).toEqual(['mdf', 'oak', 'plywood']);
    });
  });

  describe('getLibraryStats', () => {
    it('returns zeros for empty library', () => {
      const stats = getLibraryStats(createLibrary());
      expect(stats.totalPatterns).toBe(0);
      expect(stats.avgFillRate).toBe(0);
    });

    it('computes stats for populated library', () => {
      let lib = createLibrary();
      const p1 = [makePlacement({ width: 500, length: 500, x: 0, y: 0 })];
      const p2 = [makePlacement({ width: 800, length: 800, x: 0, y: 0 })];
      lib = addPattern(lib, createPattern('A', 'shelf', 1000, 1000, p1, {}, testIdGen));
      lib = addPattern(lib, createPattern('B', 'door', 1000, 1000, p2, {}, testIdGen));

      const stats = getLibraryStats(lib);
      expect(stats.totalPatterns).toBe(2);
      expect(stats.categories).toBe(2);
      expect(stats.avgFillRate).toBeGreaterThan(0);
      expect(stats.bestFillRate).toBeGreaterThanOrEqual(stats.worstFillRate);
    });
  });
});
