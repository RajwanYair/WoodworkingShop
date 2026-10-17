import { describe, expect, it } from 'vitest';
import { generateParts } from '../../src/engine/geometry/parts';
import { DEFAULT_CONFIG } from '../../src/engine/materials/materials';
import { createExplodedDrawingLayout } from '../../src/features/preview/exploded-drawing-layout';

describe('createExplodedDrawingLayout', () => {
  it('preserves every cut-list row and quantity as one balloon callout', () => {
    const parts = generateParts({ ...DEFAULT_CONFIG, shelfCount: 2, drawerCount: 1 });
    const layout = createExplodedDrawingLayout(parts, 'en');

    expect(layout.items.map((item) => item.partId)).toEqual(parts.map((part) => part.id));
    expect(new Set(layout.items.map((item) => item.partId)).size).toBe(parts.length);
    expect(layout.items.map((item) => item.quantity)).toEqual(parts.map((part) => part.qty));
    expect(layout.items.every((item) => item.partName.length > 0)).toBe(true);
    expect(layout.items.every((item) => item.balloon.y >= 12 && item.balloon.y <= layout.height - 12)).toBe(true);
  });

  it('projects a known part length and depth to the expected isometric edges', () => {
    const parts = generateParts({ ...DEFAULT_CONFIG, shelfCount: 0, drawerCount: 0, doorStyle: 'none' });
    const layout = createExplodedDrawingLayout(parts, 'en');
    const part = parts[0]!;
    const item = layout.items[0]!;

    expect(item.topFace[1]!.x - item.topFace[0]!.x).toBeCloseTo((part.length * layout.scale * Math.sqrt(3)) / 2);
    expect(item.topFace[3]!.x - item.topFace[0]!.x).toBeCloseTo((-part.width * layout.scale * Math.sqrt(3)) / 2);
  });

  it('returns a stable empty layout when there are no cut-list rows', () => {
    const layout = createExplodedDrawingLayout([], 'en');

    expect(layout.items).toEqual([]);
    expect(layout.width).toBe(900);
    expect(layout.height).toBe(180);
  });
});
