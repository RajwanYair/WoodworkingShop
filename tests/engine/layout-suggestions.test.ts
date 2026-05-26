import { describe, expect, it } from 'vitest';
import { filterSuggestions, generateSuggestions, scoreSuggestion } from '../../src/engine/layout-suggestions';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import type { CabinetConfig } from '../../src/engine/types';
import { cfg } from '../helpers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function config(overrides: Partial<CabinetConfig> = {}) {
  return cfg(overrides);
}

// ---------------------------------------------------------------------------
// generateSuggestions — guard
// ---------------------------------------------------------------------------

describe('generateSuggestions — guard', () => {
  it('throws RangeError for null config', () => {
    expect(() => generateSuggestions(null as unknown as CabinetConfig)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// generateSuggestions — shelf spacing
// ---------------------------------------------------------------------------

describe('generateSuggestions — shelf spacing', () => {
  it('raises shelf-too-crowded when avg gap < 200 mm', () => {
    // internal ≈ 500 - 36 = 464, shelfCount=3 → 4 gaps = 116 mm avg
    const c = config({ height: 500, shelfCount: 3 });
    const suggestions = generateSuggestions(c);
    expect(suggestions.some((s) => s.id === 'shelf-too-crowded')).toBe(true);
  });

  it('raises shelf-too-sparse when avg gap > 350 mm and shelfCount < 3', () => {
    // internal ≈ 1000 - 36 = 964, shelfCount=1 → 2 gaps = 482 mm avg
    const c = config({ height: 1000, shelfCount: 1 });
    const suggestions = generateSuggestions(c);
    expect(suggestions.some((s) => s.id === 'shelf-too-sparse')).toBe(true);
  });

  it('no shelf suggestions for ideal spacing', () => {
    // internal ≈ 900, shelfCount=3 → 4 gaps = 225 mm avg — fine
    const c = config({ height: 936, shelfCount: 3 });
    const suggestions = generateSuggestions(c);
    expect(suggestions.some((s) => s.id === 'shelf-too-crowded')).toBe(false);
    expect(suggestions.some((s) => s.id === 'shelf-too-sparse')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// generateSuggestions — drawers
// ---------------------------------------------------------------------------

describe('generateSuggestions — drawers', () => {
  it('raises too-many-drawers when drawer count exceeds height limit', () => {
    // height = 400, maxUseful = floor(400/200) = 2, drawerCount = 5
    const c = config({ furnitureType: 'cabinet', height: 400, drawerCount: 5 });
    const suggestions = generateSuggestions(c);
    expect(suggestions.some((s) => s.id === 'too-many-drawers')).toBe(true);
  });

  it('suggests adding drawers for tall cabinet with zero drawers', () => {
    const c = config({ furnitureType: 'cabinet', height: 800, drawerCount: 0 });
    const suggestions = generateSuggestions(c);
    expect(suggestions.some((s) => s.id === 'add-drawers')).toBe(true);
  });

  it('no drawer suggestions for bookshelf type', () => {
    const c = config({ furnitureType: 'bookshelf', height: 1800, drawerCount: 0 });
    const suggestions = generateSuggestions(c);
    expect(suggestions.some((s) => s.id === 'add-drawers')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// generateSuggestions — kitchen base
// ---------------------------------------------------------------------------

describe('generateSuggestions — kitchen base', () => {
  it.each([
    ['height off', { furnitureType: 'cabinet' as const, height: 750, depth: 580 }, 'kitchen-height'],
    ['depth off', { furnitureType: 'cabinet' as const, height: 870, depth: 400 }, 'kitchen-depth'],
  ])('%s → suggestion %s', (_, overrides, expectedId) => {
    const suggestions = generateSuggestions(config(overrides));
    expect(suggestions.some((s) => s.id === expectedId)).toBe(true);
  });

  it('no kitchen suggestions for tall cabinet', () => {
    // height = 2000 → not kitchen range
    const c = config({ furnitureType: 'cabinet', height: 2000, depth: 580 });
    const suggestions = generateSuggestions(c);
    expect(suggestions.some((s) => s.id === 'kitchen-height')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// generateSuggestions — ergonomics
// ---------------------------------------------------------------------------

describe('generateSuggestions — ergonomics', () => {
  it('raises reach-zone for very tall cabinet', () => {
    const c = config({ height: 2100 });
    const suggestions = generateSuggestions(c);
    expect(suggestions.some((s) => s.id === 'reach-zone')).toBe(true);
  });

  it('raises ceiling-clearance when cabinet nearly fills room', () => {
    const c = config({ height: 2000, kickHeight: 0 });
    const suggestions = generateSuggestions(c, { roomHeightMm: 2030 });
    expect(suggestions.some((s) => s.id === 'ceiling-clearance')).toBe(true);
  });

  it('raises exceeds-ceiling when cabinet is taller than room', () => {
    const c = config({ height: 2500 });
    const suggestions = generateSuggestions(c, { roomHeightMm: 2400 });
    expect(suggestions.some((s) => s.id === 'ceiling-exceeds')).toBe(true);
  });

  it('no ceiling suggestion when no room height context provided', () => {
    const c = config({ height: 2500 });
    const suggestions = generateSuggestions(c);
    expect(suggestions.some((s) => s.id.startsWith('ceiling'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// generateSuggestions — wide span
// ---------------------------------------------------------------------------

describe('generateSuggestions — wide span', () => {
  it('raises wide-span for cabinets wider than 900 mm with shelves', () => {
    const c = config({ width: 1200, shelfCount: 3 });
    const suggestions = generateSuggestions(c);
    expect(suggestions.some((s) => s.id === 'wide-span')).toBe(true);
  });

  it('no wide-span for narrow cabinet', () => {
    const c = config({ width: 600, shelfCount: 2 });
    expect(generateSuggestions(c).some((s) => s.id === 'wide-span')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// scoreSuggestion
// ---------------------------------------------------------------------------

describe('scoreSuggestion', () => {
  it('returns the score from the suggestion object', () => {
    const [s] = generateSuggestions(config({ height: 2100 })).filter((x) => x.id === 'reach-zone');
    expect(scoreSuggestion(s)).toBe(s.score);
    expect(scoreSuggestion(s)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// filterSuggestions
// ---------------------------------------------------------------------------

describe('filterSuggestions', () => {
  const allSuggestions = generateSuggestions(config({ height: 2100, width: 1200, shelfCount: 3, drawerCount: 0 }), {
    roomHeightMm: 2200,
  });

  it('filters out below-threshold suggestions', () => {
    const filtered = filterSuggestions(allSuggestions, 0.7);
    expect(filtered.every((s) => s.score >= 0.7)).toBe(true);
  });

  it('returns results sorted descending by score', () => {
    const filtered = filterSuggestions(allSuggestions, 0.0);
    for (let i = 1; i < filtered.length; i++) {
      expect(filtered[i - 1].score).toBeGreaterThanOrEqual(filtered[i].score);
    }
  });

  it('throws RangeError for minScore < 0', () => {
    expect(() => filterSuggestions(allSuggestions, -0.1)).toThrow(RangeError);
  });

  it('throws RangeError for minScore > 1', () => {
    expect(() => filterSuggestions(allSuggestions, 1.1)).toThrow(RangeError);
  });

  it('default minScore 0.4 returns only significant suggestions', () => {
    const filtered = filterSuggestions(allSuggestions);
    expect(filtered.every((s) => s.score >= 0.4)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// No suggestions for a well-configured cabinet
// ---------------------------------------------------------------------------

describe('generateSuggestions — clean config', () => {
  it('default config produces no critical suggestions (score ≥ 0.7)', () => {
    const suggestions = generateSuggestions(DEFAULT_CONFIG);
    const critical = filterSuggestions(suggestions, 0.7);
    expect(critical).toHaveLength(0);
  });
});
