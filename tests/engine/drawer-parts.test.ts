import { describe, it, expect } from 'vitest';
import { generateParts } from '../../src/engine/parts';
import { generateHardware } from '../../src/engine/hardware';
import { cfg } from '../helpers';

describe('drawer parts generation', () => {
  // Parts are generated per-drawer with indexed names:
  // "Drawer 1 Front", "Drawer 1 Box Side" (qty=2), "Drawer 1 Box End" (qty=2), "Drawer 1 Bottom"
  const drawerCfg = cfg({ drawerCount: 2 });
  const parts = generateParts(drawerCfg);

  it('generates drawer front parts (one per drawer, indexed)', () => {
    const fronts = parts.filter((p) => p.name.en.includes('Front') && p.name.en.includes('Drawer'));
    expect(fronts.length).toBe(2);
    expect(fronts[0].qty).toBe(1);
  });

  it('generates drawer box sides (2 per drawer, one part with qty=2)', () => {
    const sides = parts.filter((p) => p.name.en.includes('Box Side'));
    expect(sides.length).toBe(2); // one per drawer
    expect(sides[0].qty).toBe(2); // 2 sides each
  });

  it('generates drawer box ends (2 per drawer, one part with qty=2)', () => {
    const ends = parts.filter((p) => p.name.en.includes('Box End'));
    expect(ends.length).toBe(2); // one per drawer
    expect(ends[0].qty).toBe(2); // 2 ends each
  });

  it('generates drawer bottom panels (one per drawer)', () => {
    const bottoms = parts.filter((p) => p.name.en.includes('Bottom') && p.name.en.includes('Drawer'));
    expect(bottoms.length).toBe(2);
    expect(bottoms[0].qty).toBe(1);
  });

  it('drawer front is overlay sized (wider + taller than box)', () => {
    const front = parts.find((p) => p.name.en === 'Drawer 1 Front')!;
    const side = parts.find((p) => p.name.en === 'Drawer 1 Box Side')!;
    // front.length = drawerHeight + 30, side.width = drawerHeight
    expect(front.length).toBe(side.width + 30);
  });

  it('drawer bottom uses back panel material', () => {
    const bottom = parts.find((p) => p.name.en === 'Drawer 1 Bottom')!;
    expect(bottom.material).toBe(drawerCfg.backPanelMaterial);
  });

  it('no drawer parts when drawerCount is 0', () => {
    const noParts = generateParts(cfg({ drawerCount: 0 }));
    const drawerPart = noParts.find((p) => p.name.en.includes('Drawer'));
    expect(drawerPart).toBeUndefined();
  });

  it('no drawer parts for bookshelf type', () => {
    const noParts = generateParts(cfg({ furnitureType: 'bookshelf', drawerCount: 2 }));
    const drawerPart = noParts.find((p) => p.name.en.includes('Drawer'));
    expect(drawerPart).toBeUndefined();
  });

  it('no drawer parts for desk type', () => {
    const noParts = generateParts(cfg({ furnitureType: 'desk', drawerCount: 2, width: 1200, height: 750, depth: 600 }));
    const drawerPart = noParts.find((p) => p.name.en.includes('Drawer'));
    expect(drawerPart).toBeUndefined();
  });

  it('scales count with drawerCount', () => {
    const fourDrawers = generateParts(cfg({ drawerCount: 4 }));
    const fronts = fourDrawers.filter((p) => p.name.en.includes('Front') && p.name.en.includes('Drawer'));
    expect(fronts.length).toBe(4);
    const sides = fourDrawers.filter((p) => p.name.en.includes('Box Side'));
    expect(sides.length).toBe(4); // 4 drawers × 1 part each (qty=2)
    expect(sides.reduce((sum, s) => sum + s.qty, 0)).toBe(8); // total 8 sides
  });
});

describe('drawer hardware', () => {
  it('generates drawer slides for drawers', () => {
    const hw = generateHardware(cfg({ drawerCount: 3 }));
    const slides = hw.find((h) => h.id === 'H11');
    expect(slides).toBeDefined();
    expect(slides!.qty).toBe(3);
  });

  it('generates drawer handles when handleStyle is not none', () => {
    const hw = generateHardware(cfg({ drawerCount: 2, handleStyle: 'bar' }));
    const handles = hw.find((h) => h.id === 'H12');
    expect(handles).toBeDefined();
    expect(handles!.qty).toBe(2);
  });

  it('omits drawer handles when handleStyle is none', () => {
    const hw = generateHardware(cfg({ drawerCount: 2, handleStyle: 'none' }));
    const handles = hw.find((h) => h.id === 'H12');
    expect(handles).toBeUndefined();
  });

  it('no slides when drawerCount is 0', () => {
    const hw = generateHardware(cfg({ drawerCount: 0 }));
    const slides = hw.find((h) => h.id === 'H11');
    expect(slides).toBeUndefined();
  });
});
