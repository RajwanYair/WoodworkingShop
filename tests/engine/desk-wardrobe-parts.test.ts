import { describe, it, expect, beforeEach } from 'vitest';
import { generateParts } from '../../src/engine/parts';
import { DEFAULT_CONFIG, DESK_DEFAULTS, WARDROBE_DEFAULTS } from '../../src/engine/materials';
import type { CabinetConfig } from '../../src/engine/types';

describe('desk parts', () => {
  const deskCfg: CabinetConfig = { ...DEFAULT_CONFIG, ...DESK_DEFAULTS };
  const parts = generateParts(deskCfg);

  it('includes a desktop', () => {
    const desktop = parts.find(p => p.name.en === 'Desktop');
    expect(desktop).toBeDefined();
    expect(desktop!.qty).toBe(1);
    expect(desktop!.length).toBe(deskCfg.width);
    expect(desktop!.width).toBe(deskCfg.depth);
  });

  it('has 2 side panels (legs)', () => {
    const sides = parts.find(p => p.name.en === 'Side Panel');
    expect(sides).toBeDefined();
    expect(sides!.qty).toBe(2);
  });

  it('includes a modesty panel', () => {
    const modesty = parts.find(p => p.name.en === 'Modesty Panel');
    expect(modesty).toBeDefined();
    expect(modesty!.qty).toBe(1);
  });

  it('includes a back panel', () => {
    const back = parts.find(p => p.name.en === 'Back Panel');
    expect(back).toBeDefined();
  });

  it('does NOT include doors', () => {
    const doors = parts.find(p => p.name.en === 'Door');
    expect(doors).toBeUndefined();
  });

  it('does NOT include top/bottom panels', () => {
    const top = parts.find(p => p.name.en === 'Top Panel');
    const bottom = parts.find(p => p.name.en === 'Bottom Panel');
    expect(top).toBeUndefined();
    expect(bottom).toBeUndefined();
  });

  it('omits under-desk shelves when shelfCount=0', () => {
    const shelf = parts.find(p => p.name.en === 'Under-desk Shelf');
    expect(shelf).toBeUndefined();
  });

  it('adds under-desk shelves when shelfCount>0', () => {
    const cfg: CabinetConfig = { ...deskCfg, shelfCount: 2 };
    const p = generateParts(cfg);
    const shelf = p.find(x => x.name.en === 'Under-desk Shelf');
    expect(shelf).toBeDefined();
    expect(shelf!.qty).toBe(2);
  });

  it('all parts have bilingual names', () => {
    for (const p of parts) {
      expect(p.name.en).toBeTruthy();
      expect(p.name.he).toBeTruthy();
    }
  });
});

describe('wardrobe parts', () => {
  const wardrobeCfg: CabinetConfig = { ...DEFAULT_CONFIG, ...WARDROBE_DEFAULTS };
  const parts = generateParts(wardrobeCfg);

  it('includes a hanging rail', () => {
    const rail = parts.find(p => p.name.en === 'Hanging Rail');
    expect(rail).toBeDefined();
    expect(rail!.qty).toBe(1);
    expect(rail!.thickness).toBe(25);
  });

  it('has side panels', () => {
    const sides = parts.find(p => p.name.en === 'Side Panel');
    expect(sides).toBeDefined();
    expect(sides!.qty).toBe(2);
  });

  it('has top and bottom panels', () => {
    const top = parts.find(p => p.name.en === 'Top Panel');
    const bottom = parts.find(p => p.name.en === 'Bottom Panel');
    expect(top).toBeDefined();
    expect(bottom).toBeDefined();
  });

  it('includes doors (doorStyle=flat)', () => {
    const doors = parts.find(p => p.name.en === 'Door');
    expect(doors).toBeDefined();
    expect(doors!.qty).toBe(2);
  });

  it('includes back panel', () => {
    const back = parts.find(p => p.name.en === 'Back Panel');
    expect(back).toBeDefined();
  });

  it('includes fixed shelf for tall wardrobe (height>1200)', () => {
    const fixed = parts.find(p => p.name.en === 'Fixed Shelf');
    expect(fixed).toBeDefined();
  });

  it('has adjustable shelves per config', () => {
    const shelf = parts.find(p => p.name.en === 'Adjustable Shelf');
    expect(shelf).toBeDefined();
    expect(shelf!.qty).toBe(wardrobeCfg.shelfCount);
  });

  it('all parts have bilingual names', () => {
    for (const p of parts) {
      expect(p.name.en).toBeTruthy();
      expect(p.name.he).toBeTruthy();
    }
  });

  it('does NOT include hanging rail for cabinet type', () => {
    const cabinetParts = generateParts(DEFAULT_CONFIG);
    const rail = cabinetParts.find(p => p.name.en === 'Hanging Rail');
    expect(rail).toBeUndefined();
  });
});
