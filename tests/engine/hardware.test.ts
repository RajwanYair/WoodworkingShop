import { describe, it, expect } from 'vitest';
import { generateHardware } from '../../src/engine/hardware';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import { expectBilingualNames } from '../assertions';

describe('generateHardware', () => {
  const hw = generateHardware(DEFAULT_CONFIG);

  it('generates multiple hardware items', () => {
    expect(hw.length).toBeGreaterThanOrEqual(8);
  });

  it('has hinges for double-door cabinet', () => {
    const hinges = hw.find((h) => h.id === 'H01');
    expect(hinges).toBeDefined();
    // 5 hinges per door × 2 doors = 10
    expect(hinges!.qty).toBe(10);
  });

  it('has matching mounting plates', () => {
    const plates = hw.find((h) => h.id === 'H02');
    expect(plates).toBeDefined();
    expect(plates!.qty).toBe(10); // same as hinges
  });

  it('has shelf pins (4 per shelf)', () => {
    const pins = hw.find((h) => h.id === 'H03');
    expect(pins).toBeDefined();
    expect(pins!.qty).toBe(DEFAULT_CONFIG.shelfCount * 4); // 16
  });

  it('has confirmat screws', () => {
    const screws = hw.find((h) => h.id === 'H04');
    expect(screws).toBeDefined();
    expect(screws!.qty).toBeGreaterThanOrEqual(8);
  });

  it('has handles matching door count', () => {
    const handles = hw.find((h) => h.id === 'H09');
    expect(handles).toBeDefined();
    expect(handles!.qty).toBe(DEFAULT_CONFIG.doorCount);
  });

  it('omits handles when handleStyle is none', () => {
    const cfg = { ...DEFAULT_CONFIG, handleStyle: 'none' as const };
    const items = generateHardware(cfg);
    const handles = items.find((h) => h.id === 'H09');
    expect(handles).toBeUndefined();
  });

  it('omits hinges when doorStyle is none', () => {
    const cfg = { ...DEFAULT_CONFIG, doorStyle: 'none' as const };
    const items = generateHardware(cfg);
    const hinges = items.find((h) => h.id === 'H01');
    expect(hinges).toBeUndefined();
  });

  it('has L-brackets for wall mounting', () => {
    const brackets = hw.find((h) => h.id === 'H07');
    expect(brackets).toBeDefined();
    expect(brackets!.qty).toBe(4); // width 1000 >= 800
  });

  it('uses 2 L-brackets for narrow cabinets', () => {
    const cfg = { ...DEFAULT_CONFIG, width: 500 };
    const items = generateHardware(cfg);
    const brackets = items.find((h) => h.id === 'H07');
    expect(brackets!.qty).toBe(2);
  });

  it('all items have bilingual names', () => {
    expectBilingualNames(hw);
  });
});

describe('generateHardware — Sprint 113 expansion', () => {
  it('includes soft-close hinge dampers (one per hinge)', () => {
    const hw = generateHardware(DEFAULT_CONFIG);
    const damper = hw.find((h) => h.id === 'H13');
    const hinges = hw.find((h) => h.id === 'H01');
    expect(damper).toBeDefined();
    expect(damper!.qty).toBe(hinges!.qty);
  });

  it('omits soft-close dampers when there are no doors', () => {
    const cfg = { ...DEFAULT_CONFIG, doorStyle: 'none' as const };
    const hw = generateHardware(cfg);
    expect(hw.find((h) => h.id === 'H13')).toBeUndefined();
    expect(hw.find((h) => h.id === 'H14')).toBeUndefined();
  });

  it('includes door bumper pads (2 per door)', () => {
    const hw = generateHardware(DEFAULT_CONFIG);
    const pads = hw.find((h) => h.id === 'H14');
    expect(pads).toBeDefined();
    expect(pads!.qty).toBe(DEFAULT_CONFIG.doorCount * 2);
  });

  it('includes 4 cabinet leveller feet regardless of doors', () => {
    const cfg = { ...DEFAULT_CONFIG, doorStyle: 'none' as const };
    const hw = generateHardware(cfg);
    const feet = hw.find((h) => h.id === 'H15');
    expect(feet).toBeDefined();
    expect(feet!.qty).toBe(4);
  });

  it('always ships at least one edge-banding roll', () => {
    const hw = generateHardware({ ...DEFAULT_CONFIG, width: 400, height: 400 });
    const roll = hw.find((h) => h.id === 'H16');
    expect(roll).toBeDefined();
    expect(roll!.qty).toBeGreaterThanOrEqual(1);
  });

  it('scales drawer slide length to cabinet depth', () => {
    const shallow = generateHardware({ ...DEFAULT_CONFIG, drawerCount: 1, depth: 320 });
    const deep = generateHardware({ ...DEFAULT_CONFIG, drawerCount: 1, depth: 600 });
    const shallowSlide = shallow.find((h) => h.id === 'H11');
    const deepSlide = deep.find((h) => h.id === 'H11');
    expect(shallowSlide?.name.en).toMatch(/250 mm/);
    expect(deepSlide?.name.en).toMatch(/550 mm/);
  });
});

describe('generateHardware — hardwareOverrides', () => {
  it('overrides qty for a specified item id', () => {
    const cfg = { ...DEFAULT_CONFIG, hardwareOverrides: { H15: 6 } };
    const hw = generateHardware(cfg);
    const feet = hw.find((h) => h.id === 'H15');
    expect(feet).toBeDefined();
    expect(feet!.qty).toBe(6);
  });

  it('leaves non-overridden items unchanged', () => {
    const baseline = generateHardware(DEFAULT_CONFIG);
    const withOverride = generateHardware({ ...DEFAULT_CONFIG, hardwareOverrides: { H15: 6 } });
    const baselineHinges = baseline.find((h) => h.id === 'H01')!.qty;
    const overrideHinges = withOverride.find((h) => h.id === 'H01')!.qty;
    expect(overrideHinges).toBe(baselineHinges);
  });

  it('can override multiple items simultaneously', () => {
    const cfg = { ...DEFAULT_CONFIG, hardwareOverrides: { H15: 8, H20: 6 } };
    const hw = generateHardware(cfg);
    expect(hw.find((h) => h.id === 'H15')!.qty).toBe(8);
    expect(hw.find((h) => h.id === 'H20')!.qty).toBe(6);
  });

  it('ignores unknown override ids gracefully', () => {
    const cfg = { ...DEFAULT_CONFIG, hardwareOverrides: { UNKNOWN_ID: 99 } };
    expect(() => generateHardware(cfg)).not.toThrow();
  });
});
