import { describe, it, expect } from 'vitest';
import { batchReplaceMaterial, listMaterials, countByMaterial } from '../../src/engine/batch-replace';
import type { BatchPart } from '../../src/engine/batch-replace';

function part(id: string, material: string, type = 'panel', zone = 'body'): BatchPart {
  return { id, material, type, zone };
}

const PARTS: BatchPart[] = [
  part('p1', 'oak', 'panel', 'body'),
  part('p2', 'oak', 'door', 'front'),
  part('p3', 'mdf', 'shelf', 'body'),
  part('p4', 'oak', 'panel', 'body'),
  part('p5', 'ply', 'back', 'back'),
];

describe('batchReplaceMaterial', () => {
  it('replaces all matching material parts', () => {
    const { parts, changedCount } = batchReplaceMaterial(PARTS, 'oak', 'walnut');
    expect(changedCount).toBe(3);
    expect(parts.filter((p) => p.material === 'walnut')).toHaveLength(3);
  });

  it('does not mutate original parts', () => {
    batchReplaceMaterial(PARTS, 'oak', 'walnut');
    expect(PARTS[0].material).toBe('oak');
  });

  it('returns empty affectedIds when no match', () => {
    const { changedCount, affectedIds } = batchReplaceMaterial(PARTS, 'pine', 'walnut');
    expect(changedCount).toBe(0);
    expect(affectedIds).toHaveLength(0);
  });

  it('filters by type when filterType provided', () => {
    const { changedCount } = batchReplaceMaterial(PARTS, 'oak', 'walnut', {
      filterType: 'door',
    });
    expect(changedCount).toBe(1);
  });

  it('filters by zone when filterZone provided', () => {
    const { changedCount } = batchReplaceMaterial(PARTS, 'oak', 'walnut', {
      filterZone: 'front',
    });
    expect(changedCount).toBe(1);
  });

  it('combines filterType and filterZone', () => {
    const { changedCount } = batchReplaceMaterial(PARTS, 'oak', 'walnut', {
      filterType: 'panel',
      filterZone: 'body',
    });
    expect(changedCount).toBe(2);
  });

  it('affectedIds contains correct ids', () => {
    const { affectedIds } = batchReplaceMaterial(PARTS, 'oak', 'walnut');
    expect(affectedIds).toContain('p1');
    expect(affectedIds).toContain('p2');
    expect(affectedIds).toContain('p4');
  });

  it('handles empty parts array', () => {
    const { changedCount } = batchReplaceMaterial([], 'oak', 'walnut');
    expect(changedCount).toBe(0);
  });
});

describe('listMaterials', () => {
  it('returns sorted distinct materials', () => {
    const mats = listMaterials(PARTS);
    expect(mats).toEqual(['mdf', 'oak', 'ply']);
  });

  it('returns empty for empty parts', () => {
    expect(listMaterials([])).toEqual([]);
  });
});

describe('countByMaterial', () => {
  it('counts correctly', () => {
    const map = countByMaterial(PARTS);
    expect(map.get('oak')).toBe(3);
    expect(map.get('mdf')).toBe(1);
    expect(map.get('ply')).toBe(1);
  });
});
