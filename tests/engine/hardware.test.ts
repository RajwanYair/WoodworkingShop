import { describe, it, expect } from 'vitest';
import { generateHardware } from '../../src/engine/hardware';
import { DEFAULT_CONFIG } from '../../src/engine/materials';

describe('generateHardware', () => {
  const hw = generateHardware(DEFAULT_CONFIG);

  it('generates multiple hardware items', () => {
    expect(hw.length).toBeGreaterThanOrEqual(8);
  });

  it('has hinges for double-door cabinet', () => {
    const hinges = hw.find(h => h.id === 'H01');
    expect(hinges).toBeDefined();
    // 5 hinges per door × 2 doors = 10
    expect(hinges!.qty).toBe(10);
  });

  it('has matching mounting plates', () => {
    const plates = hw.find(h => h.id === 'H02');
    expect(plates).toBeDefined();
    expect(plates!.qty).toBe(10); // same as hinges
  });

  it('has shelf pins (4 per shelf)', () => {
    const pins = hw.find(h => h.id === 'H03');
    expect(pins).toBeDefined();
    expect(pins!.qty).toBe(DEFAULT_CONFIG.shelfCount * 4); // 16
  });

  it('has confirmat screws', () => {
    const screws = hw.find(h => h.id === 'H04');
    expect(screws).toBeDefined();
    expect(screws!.qty).toBeGreaterThanOrEqual(8);
  });

  it('has handles matching door count', () => {
    const handles = hw.find(h => h.id === 'H09');
    expect(handles).toBeDefined();
    expect(handles!.qty).toBe(DEFAULT_CONFIG.doorCount);
  });

  it('omits handles when handleStyle is none', () => {
    const cfg = { ...DEFAULT_CONFIG, handleStyle: 'none' as const };
    const items = generateHardware(cfg);
    const handles = items.find(h => h.id === 'H09');
    expect(handles).toBeUndefined();
  });

  it('omits hinges when doorStyle is none', () => {
    const cfg = { ...DEFAULT_CONFIG, doorStyle: 'none' as const };
    const items = generateHardware(cfg);
    const hinges = items.find(h => h.id === 'H01');
    expect(hinges).toBeUndefined();
  });

  it('has L-brackets for wall mounting', () => {
    const brackets = hw.find(h => h.id === 'H07');
    expect(brackets).toBeDefined();
    expect(brackets!.qty).toBe(4); // width 1000 >= 800
  });

  it('uses 2 L-brackets for narrow cabinets', () => {
    const cfg = { ...DEFAULT_CONFIG, width: 500 };
    const items = generateHardware(cfg);
    const brackets = items.find(h => h.id === 'H07');
    expect(brackets!.qty).toBe(2);
  });

  it('all items have bilingual names', () => {
    for (const h of hw) {
      expect(h.name.en).toBeTruthy();
      expect(h.name.he).toBeTruthy();
    }
  });
});
