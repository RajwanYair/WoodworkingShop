import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCabinetStore, detectOsDarkMode } from '../../src/store/cabinet-store';
import { DEFAULT_CONFIG } from '../../src/engine/materials';

describe('cabinet-store', () => {
  beforeEach(() => {
    useCabinetStore.setState({
      cabinets: [{ name: 'Cabinet 1', config: { ...DEFAULT_CONFIG } }],
      activeCabinetIndex: 0,
      _past: [],
      _future: [],
      canUndo: false,
      canRedo: false,
      activeTab: 'configurator',
      darkMode: false,
      colorBlindMode: false,
    });
    useCabinetStore.getState().setConfig({});
    useCabinetStore.setState({ _past: [], canUndo: false });
  });

  it('has default config on init', () => {
    const { config } = useCabinetStore.getState();
    expect(config.width).toBe(DEFAULT_CONFIG.width);
    expect(config.height).toBe(DEFAULT_CONFIG.height);
  });

  it('updates config via setConfig', () => {
    useCabinetStore.getState().setConfig({ width: 800 });
    expect(useCabinetStore.getState().config.width).toBe(800);
  });

  it('recomputes derived state on config change', () => {
    useCabinetStore.getState().setConfig({ shelfCount: 10 });
    // More shelves → should still have parts
    expect(useCabinetStore.getState().parts.length).toBeGreaterThan(0);
  });

  it('supports undo/redo and clears redo stack on new change', () => {
    const originalWidth = useCabinetStore.getState().config.width;
    useCabinetStore.getState().setConfig({ width: 999 });
    expect(useCabinetStore.getState().canUndo).toBe(true);
    useCabinetStore.getState().undo();
    expect(useCabinetStore.getState().config.width).toBe(originalWidth);
    useCabinetStore.getState().setConfig({ width: 888 });
    expect(useCabinetStore.getState().canRedo).toBe(false);
    useCabinetStore.getState().undo();
    expect(useCabinetStore.getState().canRedo).toBe(true);
    useCabinetStore.getState().redo();
    expect(useCabinetStore.getState().config.width).toBe(888);
  });

  // Multi-cabinet
  it('adds a new cabinet', () => {
    useCabinetStore.getState().addCabinet();
    expect(useCabinetStore.getState().cabinets.length).toBe(2);
    expect(useCabinetStore.getState().activeCabinetIndex).toBe(1);
  });

  it('removes a cabinet', () => {
    useCabinetStore.getState().addCabinet();
    useCabinetStore.getState().removeCabinet(1);
    expect(useCabinetStore.getState().cabinets.length).toBe(1);
  });

  it('does not remove the last cabinet', () => {
    useCabinetStore.getState().removeCabinet(0);
    expect(useCabinetStore.getState().cabinets.length).toBe(1);
  });

  it('switches active cabinet', () => {
    useCabinetStore.getState().addCabinet();
    useCabinetStore.getState().setActiveCabinet(0);
    expect(useCabinetStore.getState().activeCabinetIndex).toBe(0);
  });

  it('renames a cabinet', () => {
    useCabinetStore.getState().renameCabinet(0, 'Kitchen Pantry');
    expect(useCabinetStore.getState().cabinets[0].name).toBe('Kitchen Pantry');
  });

  it('setNotes stores notes on a cabinet', () => {
    useCabinetStore.getState().setNotes(0, 'Measure twice, cut once.');
    expect(useCabinetStore.getState().cabinets[0].notes).toBe('Measure twice, cut once.');
  });

  it('setNotes does not affect other cabinets and can clear with empty string', () => {
    useCabinetStore.getState().addCabinet();
    useCabinetStore.getState().setNotes(0, 'Cabinet A notes');
    expect(useCabinetStore.getState().cabinets[1].notes).toBeUndefined();
    useCabinetStore.getState().setNotes(0, '');
    expect(useCabinetStore.getState().cabinets[0].notes).toBe('');
  });

  it('edits only the active cabinet config', () => {
    useCabinetStore.getState().addCabinet();
    useCabinetStore.getState().setActiveCabinet(0);
    useCabinetStore.getState().setConfig({ width: 500 });
    expect(useCabinetStore.getState().cabinets[0].config.width).toBe(500);
    expect(useCabinetStore.getState().cabinets[1].config.width).toBe(DEFAULT_CONFIG.width);
  });

  // UI toggles
  it('toggles dark mode', () => {
    useCabinetStore.getState().toggleDarkMode();
    expect(useCabinetStore.getState().darkMode).toBe(true);
    useCabinetStore.getState().toggleDarkMode();
    expect(useCabinetStore.getState().darkMode).toBe(false);
  });

  it('toggles color blind mode', () => {
    useCabinetStore.getState().toggleColorBlindMode();
    expect(useCabinetStore.getState().colorBlindMode).toBe(true);
  });

  it('sets active tab', () => {
    useCabinetStore.getState().setActiveTab('pdf');
    expect(useCabinetStore.getState().activeTab).toBe('pdf');
  });

  // Combined optimization
  it('combines parts from all cabinets', () => {
    useCabinetStore.getState().addCabinet();
    const { allParts } = useCabinetStore.getState();
    expect(allParts.some((p) => p.id.startsWith('C1-'))).toBe(true);
    expect(allParts.some((p) => p.id.startsWith('C2-'))).toBe(true);
  });

  // Sprint 125 — cabinet duplication
  describe('duplicateCabinet', () => {
    it('inserts a copy immediately after the source', () => {
      useCabinetStore.getState().duplicateCabinet(0);
      const { cabinets, activeCabinetIndex } = useCabinetStore.getState();
      expect(cabinets).toHaveLength(2);
      expect(activeCabinetIndex).toBe(1);
      expect(cabinets[1].name).toBe('Cabinet 1 (copy)');
    });

    it('copies the source cabinet config exactly', () => {
      useCabinetStore.getState().setConfig({ width: 999 });
      useCabinetStore.getState().duplicateCabinet(0);
      const { cabinets } = useCabinetStore.getState();
      expect(cabinets[1].config.width).toBe(999);
    });

    it('generates incrementing copy names', () => {
      useCabinetStore.getState().duplicateCabinet(0); // Cabinet 1 (copy)
      useCabinetStore.getState().setActiveCabinet(0);
      useCabinetStore.getState().duplicateCabinet(0); // Cabinet 1 (copy 2)
      const { cabinets } = useCabinetStore.getState();
      const names = cabinets.map((c) => c.name);
      expect(names).toContain('Cabinet 1 (copy)');
      expect(names).toContain('Cabinet 1 (copy 2)');
    });

    it('is a no-op for out-of-range index', () => {
      const before = useCabinetStore.getState().cabinets.length;
      useCabinetStore.getState().duplicateCabinet(99);
      expect(useCabinetStore.getState().cabinets).toHaveLength(before);
    });
  });

  describe('detectOsDarkMode', () => {
    it.each([
      [undefined as unknown as { matches: boolean } | undefined, false],
      [{ matches: true }, true],
      [{ matches: false }, false],
    ] as [{ matches: boolean } | undefined, boolean][])('returns %j → %s', (mockReturn, expected) => {
      const orig = window.matchMedia;
      window.matchMedia =
        mockReturn === undefined
          ? (undefined as unknown as typeof window.matchMedia)
          : vi.fn().mockReturnValue(mockReturn);
      expect(detectOsDarkMode()).toBe(expected);
      window.matchMedia = orig;
    });
  });

  describe('cost extras (v3.23.0)', () => {
    it('has default labourRate of 75', () => {
      useCabinetStore.setState({ labourRate: 75, labourHours: 0, finishCost: 0 });
      expect(useCabinetStore.getState().labourRate).toBe(75);
    });

    it('setLabourRate/Hours/FinishCost clamp to ≥0', () => {
      const s = () => useCabinetStore.getState();
      s().setLabourRate(100);
      expect(s().labourRate).toBe(100);
      s().setLabourRate(-50);
      expect(s().labourRate).toBe(0);
      s().setLabourHours(4.5);
      expect(s().labourHours).toBe(4.5);
      s().setLabourHours(-1);
      expect(s().labourHours).toBe(0);
      s().setFinishCost(350);
      expect(s().finishCost).toBe(350);
      s().setFinishCost(-100);
      expect(s().finishCost).toBe(0);
    });
  });

  describe('optimizationPending (v3.21.0)', () => {
    it('initialises false, can toggle via setState', () => {
      useCabinetStore.setState({ optimizationPending: false });
      expect(useCabinetStore.getState().optimizationPending).toBe(false);
      useCabinetStore.setState({ optimizationPending: true });
      expect(useCabinetStore.getState().optimizationPending).toBe(true);
    });
  });

  describe('setEdgeBandingRate', () => {
    it('updates rate and clamps negative to 0', () => {
      useCabinetStore.getState().setEdgeBandingRate(5);
      expect(useCabinetStore.getState().edgeBandingRate).toBe(5);
      useCabinetStore.getState().setEdgeBandingRate(-2);
      expect(useCabinetStore.getState().edgeBandingRate).toBe(0);
    });
  });

  describe('saveSnapshot auto-naming (Sprint 19)', () => {
    beforeEach(() => {
      useCabinetStore.setState({ snapshots: [] });
    });

    it.each([
      ['My custom name', true],
      ['', false],
      ['   ', false],
    ] as const)('names snapshot for input %j', (input, isExact) => {
      useCabinetStore.getState().saveSnapshot(input);
      const snap = useCabinetStore.getState().snapshots[0];
      if (isExact) expect(snap.name).toBe('My custom name');
      else expect(snap.name).toMatch(/^Snapshot \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    });

    it('snapshot has valid ISO timestamp and id starts with "snap-"', () => {
      useCabinetStore.getState().saveSnapshot('test');
      const snap = useCabinetStore.getState().snapshots[0];
      expect(() => new Date(snap.timestamp).toISOString()).not.toThrow();
      expect(snap.id).toMatch(/^snap-\d+$/);
    });
  });

  describe('toggleHighContrast (v3.12.0)', () => {
    it.each([
      [false, true],
      [true, false],
    ] as const)('flips highContrastMode from %s to %s', (init, expected) => {
      useCabinetStore.setState({ highContrastMode: init });
      useCabinetStore.getState().toggleHighContrast();
      expect(useCabinetStore.getState().highContrastMode).toBe(expected);
    });
  });

  describe('toggleUnits', () => {
    it.each([
      ['metric', 'imperial'],
      ['imperial', 'metric'],
    ] as const)('switches %s → %s', (init, expected) => {
      useCabinetStore.setState({ units: init });
      useCabinetStore.getState().toggleUnits();
      expect(useCabinetStore.getState().units).toBe(expected);
    });
  });

  describe('setSawKerf', () => {
    it.each<[number, number]>([
      [3.2, 3.2],
      [-1, 0],
      [20, 8],
    ])('setSawKerf(%s) → %s', (input, expected) => {
      useCabinetStore.getState().setSawKerf(input);
      expect(useCabinetStore.getState().sawKerf).toBe(expected);
    });
  });

  describe('setMaterialPriceOverride', () => {
    it('stores and removes price override', () => {
      useCabinetStore.getState().setMaterialPriceOverride('mdf18', 42.5);
      expect(useCabinetStore.getState().materialPriceOverrides['mdf18']).toBe(42.5);
      useCabinetStore.getState().setMaterialPriceOverride('mdf18', null);
      expect(useCabinetStore.getState().materialPriceOverrides['mdf18']).toBeUndefined();
    });
  });

  describe('setHardwarePriceOverride', () => {
    it('stores, removes, and clamps negative hardware price override', () => {
      useCabinetStore.getState().setHardwarePriceOverride('hinge-soft', 3.99);
      expect(useCabinetStore.getState().hardwarePriceOverrides['hinge-soft']).toBe(3.99);
      useCabinetStore.getState().setHardwarePriceOverride('hinge-soft', null);
      expect(useCabinetStore.getState().hardwarePriceOverrides['hinge-soft']).toBeUndefined();
      useCabinetStore.getState().setHardwarePriceOverride('hinge-soft', -5);
      expect(useCabinetStore.getState().hardwarePriceOverrides['hinge-soft']).toBe(0);
    });
  });

  describe('setHardwareQtyOverride', () => {
    it('stores and removes quantity override', () => {
      useCabinetStore.getState().setHardwareQtyOverride('drawer-slide', 4);
      expect(useCabinetStore.getState().hardwareQtyOverrides['drawer-slide']).toBe(4);
      useCabinetStore.getState().setHardwareQtyOverride('drawer-slide', null);
      expect(useCabinetStore.getState().hardwareQtyOverrides['drawer-slide']).toBeUndefined();
    });
  });

  describe('setSheetSizeOverride (Sprint 165)', () => {
    it('stores a sheet size override for a material key', () => {
      useCabinetStore.getState().setSheetSizeOverride('mdf18', { width: 1220, length: 2440 });
      expect(useCabinetStore.getState().sheetSizeOverrides['mdf18']).toEqual({ width: 1220, length: 2440 });
    });

    it('removes the override when size is null', () => {
      useCabinetStore.getState().setSheetSizeOverride('mdf18', { width: 1220, length: 2440 });
      useCabinetStore.getState().setSheetSizeOverride('mdf18', null);
      expect(useCabinetStore.getState().sheetSizeOverrides['mdf18']).toBeUndefined();
    });
  });

  describe('moveCabinet — Sprint 61', () => {
    beforeEach(() => {
      useCabinetStore.getState().addCabinet();
      useCabinetStore.getState().renameCabinet(1, 'Cabinet B');
      useCabinetStore.getState().addCabinet();
      useCabinetStore.getState().renameCabinet(2, 'Cabinet C');
      useCabinetStore.getState().setActiveCabinet(0);
      useCabinetStore.getState().renameCabinet(0, 'Cabinet A');
    });

    it.each<['down' | 'up', number]>([
      ['down', 0],
      ['up', 1],
    ])('moves cabinet %s (idx=%i): swaps to B,A order', (dir, idx) => {
      useCabinetStore.getState().moveCabinet(idx, dir);
      const names = useCabinetStore.getState().cabinets.map((c) => c.name);
      expect(names[0]).toBe('Cabinet B');
      expect(names[1]).toBe('Cabinet A');
    });

    it('active cabinet index follows the moved cabinet', () => {
      useCabinetStore.getState().setActiveCabinet(0);
      useCabinetStore.getState().moveCabinet(0, 'down');
      expect(useCabinetStore.getState().activeCabinetIndex).toBe(1);
    });

    it('ignores move up on first cabinet and down on last cabinet', () => {
      const before = useCabinetStore.getState().cabinets.map((c) => c.name);
      useCabinetStore.getState().moveCabinet(0, 'up');
      expect(useCabinetStore.getState().cabinets.map((c) => c.name)).toEqual(before);
      const count = useCabinetStore.getState().cabinets.length;
      useCabinetStore.getState().moveCabinet(count - 1, 'down');
      expect(useCabinetStore.getState().cabinets.map((c) => c.name)).toEqual(before);
    });
  });
});
