import { describe, it, expect } from 'vitest';
import { generateParts } from '../../src/engine/parts';
import { generateHardware } from '../../src/engine/hardware';
import { cfg } from '../helpers';

describe('drawer parts generation', () => {
  const drawerCfg = cfg({ drawerCount: 2 });
  const parts = generateParts(drawerCfg);

  it('generates drawer front parts', () => {
    const front = parts.find((p) => p.name.en === 'Drawer Front');
    expect(front).toBeDefined();
    expect(front!.qty).toBe(2);
  });

  it('generates drawer box sides (2 per drawer)', () => {
    const sides = parts.find((p) => p.name.en === 'Drawer Box Side');
    expect(sides).toBeDefined();
    expect(sides!.qty).toBe(4);
  });

  it('generates drawer box ends (2 per drawer)', () => {
    const ends = parts.find((p) => p.name.en === 'Drawer Box End');
    expect(ends).toBeDefined();
    expect(ends!.qty).toBe(4);
  });

  it('generates drawer bottom panels', () => {
    const bottom = parts.find((p) => p.name.en === 'Drawer Bottom');
    expect(bottom).toBeDefined();
    expect(bottom!.qty).toBe(2);
  });

  it('drawer front is overlay sized (wider + taller than box)', () => {
    const front = parts.find((p) => p.name.en === 'Drawer Front')!;
    const side = parts.find((p) => p.name.en === 'Drawer Box Side')!;
    // front.length = drawerHeight + 30, side.width = drawerHeight
    expect(front.length).toBe(side.width + 30);
  });

  it('drawer bottom uses back panel material', () => {
    const bottom = parts.find((p) => p.name.en === 'Drawer Bottom')!;
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

  it('scales qty with drawerCount', () => {
    const fourDrawers = generateParts(cfg({ drawerCount: 4 }));
    const front = fourDrawers.find((p) => p.name.en === 'Drawer Front')!;
    expect(front.qty).toBe(4);
    const sides = fourDrawers.find((p) => p.name.en === 'Drawer Box Side')!;
    expect(sides.qty).toBe(8);
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
