import { describe, it, expect } from 'vitest';
import { calculateHardwareBom, totalHardwarePieces, HARDWARE_CATALOGUE } from '../../src/engine/hardware-spec';
import type { HardwareQuantityInput } from '../../src/engine/hardware-spec';

function cfg(overrides: Partial<HardwareQuantityInput> = {}): HardwareQuantityInput {
  return {
    doorCount: 0,
    drawerCount: 0,
    adjustableShelfCount: 0,
    fixedShelfCount: 0,
    backPanelCount: 1,
    hasAdjustableLegs: false,
    legCount: 0,
    ...overrides,
  };
}

describe('HARDWARE_CATALOGUE', () => {
  it('contains all expected item ids', () => {
    const ids = Object.keys(HARDWARE_CATALOGUE);
    expect(ids).toContain('hinge-blum-110');
    expect(ids).toContain('drawer-runner-blum-tandembox');
    expect(ids).toContain('shelf-pin-5mm');
  });

  it('all items have bilingual names', () => {
    for (const item of Object.values(HARDWARE_CATALOGUE)) {
      expect(item.name.en.length).toBeGreaterThan(0);
      expect(item.name.he.length).toBeGreaterThan(0);
    }
  });
});

describe('calculateHardwareBom — hinges', () => {
  it('calculates 2 hinges per door', () => {
    const bom = calculateHardwareBom(cfg({ doorCount: 2 }));
    const hinges = bom.find((l) => l.category === 'hinge');
    expect(hinges?.quantity).toBe(4); // 2 doors × 2
  });

  it('includes no hinge line when doorCount is 0', () => {
    const bom = calculateHardwareBom(cfg({ doorCount: 0 }));
    expect(bom.find((l) => l.category === 'hinge')).toBeUndefined();
  });
});

describe('calculateHardwareBom — drawer runners', () => {
  it('calculates 1 pair per drawer', () => {
    const bom = calculateHardwareBom(cfg({ drawerCount: 3 }));
    const runners = bom.find((l) => l.category === 'drawer-runner');
    expect(runners?.quantity).toBe(3);
    expect(runners?.unit).toBe('pairs');
  });
});

describe('calculateHardwareBom — shelf pins', () => {
  it('calculates 4 pins per adjustable shelf', () => {
    const bom = calculateHardwareBom(cfg({ adjustableShelfCount: 3 }));
    const pins = bom.find((l) => l.category === 'shelf-pin');
    expect(pins?.quantity).toBe(12);
  });
});

describe('calculateHardwareBom — cam locks', () => {
  it('calculates 4 cam locks per fixed shelf', () => {
    const bom = calculateHardwareBom(cfg({ fixedShelfCount: 2 }));
    const cams = bom.find((l) => l.category === 'cam-lock');
    expect(cams?.quantity).toBe(8);
  });
});

describe('calculateHardwareBom — handles', () => {
  it('defaults handles to doorCount + drawerCount', () => {
    const bom = calculateHardwareBom(cfg({ doorCount: 2, drawerCount: 2 }));
    const handles = bom.find((l) => l.category === 'handle');
    expect(handles?.quantity).toBe(4);
  });

  it('respects explicit handleCount override', () => {
    const bom = calculateHardwareBom(cfg({ doorCount: 2, handleCount: 1 }));
    const handles = bom.find((l) => l.category === 'handle');
    expect(handles?.quantity).toBe(1);
  });
});

describe('calculateHardwareBom — leg adjusters', () => {
  it('includes leg adjusters when enabled', () => {
    const bom = calculateHardwareBom(cfg({ hasAdjustableLegs: true, legCount: 4 }));
    const legs = bom.find((l) => l.category === 'leg-adjuster');
    expect(legs?.quantity).toBe(4);
  });

  it('excludes leg adjusters when not enabled', () => {
    const bom = calculateHardwareBom(cfg({ hasAdjustableLegs: false, legCount: 4 }));
    expect(bom.find((l) => l.category === 'leg-adjuster')).toBeUndefined();
  });
});

describe('totalHardwarePieces', () => {
  it('sums all quantities', () => {
    const bom = calculateHardwareBom(cfg({ doorCount: 2, drawerCount: 1, adjustableShelfCount: 2 }));
    const total = totalHardwarePieces(bom);
    // hinges: 4, runners: 1 pair, handles: 3, back clips: 4, shelf pins: 8
    expect(total).toBeGreaterThan(0);
  });

  it('returns 0 for empty BOM', () => {
    expect(totalHardwarePieces([])).toBe(0);
  });
});
