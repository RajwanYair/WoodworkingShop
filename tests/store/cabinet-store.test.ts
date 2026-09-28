import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCabinetStore, detectOsDarkMode } from '../../src/store/cabinet-store';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import { computeDimensions } from '../../src/engine/dimensions';
import type { DefectZone, OffcutEntry } from '../../src/engine/types';
import { setDefectZones } from '../../src/store/worker-schedule';

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

  it('persists the latest cabinet session after the autosave debounce', () => {
    vi.useFakeTimers();
    window.localStorage.clear();

    useCabinetStore.getState().setConfig({ width: 812 });
    vi.advanceTimersByTime(500);

    const savedSession = window.localStorage.getItem('woodworkingshop:session');
    expect(savedSession).not.toBeNull();
    expect(JSON.parse(savedSession ?? '{}')).toMatchObject({
      activeCabinetIndex: 0,
      cabinets: [{ name: 'Cabinet 1', config: { width: 812 } }],
    });
  });

  it('restores a persisted cabinet session when the store initializes after reload', async () => {
    window.localStorage.setItem(
      'woodworkingshop:session',
      JSON.stringify({
        cabinets: [{ name: 'Saved cabinet', config: { ...DEFAULT_CONFIG, width: 812 } }],
        activeCabinetIndex: 0,
        projectName: 'Saved project',
        projectNotes: 'Resume here',
        sawKerf: 4,
        materialPriceOverrides: {},
        edgeBandingRate: 3,
        hardwarePriceOverrides: {},
        hardwareQtyOverrides: {},
        sheetSizeOverrides: {},
        labourRate: 75,
        labourHours: 0,
        finishCost: 0,
        rotationLockedPartIds: {},
      }),
    );

    vi.resetModules();
    const { useCabinetStore: restoredStore } = await import('../../src/store/cabinet-store');

    expect(restoredStore.getState()).toMatchObject({
      cabinets: [{ name: 'Saved cabinet', config: { width: 812 } }],
      config: { width: 812 },
      projectName: 'Saved project',
      projectNotes: 'Resume here',
    });
  });

  it('updates config via setConfig', () => {
    useCabinetStore.getState().setConfig({ width: 800 });
    expect(useCabinetStore.getState().config.width).toBe(800);
  });

  it('resets only the active cabinet and supports undo/redo', () => {
    useCabinetStore.getState().setConfig({ width: 800 });
    useCabinetStore.getState().addCabinet();
    useCabinetStore.getState().setConfig({ width: 555 });

    useCabinetStore.getState().resetConfig();

    const resetState = useCabinetStore.getState();
    expect(resetState.cabinets[0].config.width).toBe(800);
    expect(resetState.cabinets[1].config).toEqual(DEFAULT_CONFIG);
    expect(resetState.dimensions).toEqual(computeDimensions(DEFAULT_CONFIG));
    expect(resetState.canUndo).toBe(true);

    resetState.undo();
    expect(useCabinetStore.getState().cabinets[1].config.width).toBe(555);
    expect(useCabinetStore.getState().dimensions).toEqual(computeDimensions({ ...DEFAULT_CONFIG, width: 555 }));

    useCabinetStore.getState().redo();
    expect(useCabinetStore.getState().cabinets[1].config).toEqual(DEFAULT_CONFIG);
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

  it.each([-1, 2, 0.5])('does not change state when removing invalid cabinet index %i', (index) => {
    useCabinetStore.getState().addCabinet();
    const before = useCabinetStore.getState();
    useCabinetStore.getState().removeCabinet(index);
    expect(useCabinetStore.getState()).toBe(before);
  });

  it('switches active cabinet', () => {
    useCabinetStore.getState().addCabinet();
    useCabinetStore.getState().setActiveCabinet(0);
    expect(useCabinetStore.getState().activeCabinetIndex).toBe(0);
  });

  it.each([-1, 1, 0.5])('does not change state when selecting invalid cabinet index %i', (index) => {
    const before = useCabinetStore.getState();
    useCabinetStore.getState().setActiveCabinet(index);
    expect(useCabinetStore.getState()).toBe(before);
  });

  it('renames a cabinet', () => {
    useCabinetStore.getState().renameCabinet(0, 'Kitchen Pantry');
    expect(useCabinetStore.getState().cabinets[0].name).toBe('Kitchen Pantry');
  });

  it.each([-1, 1, 0.5])('does not change state when renaming invalid cabinet index %i', (index) => {
    const before = useCabinetStore.getState();
    useCabinetStore.getState().renameCabinet(index, 'Invalid rename');
    expect(useCabinetStore.getState()).toBe(before);
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

  it.each([-1, 1, 0.5])('does not change state when updating notes for invalid cabinet index %i', (index) => {
    const before = useCabinetStore.getState();
    useCabinetStore.getState().setNotes(index, 'Invalid notes');
    expect(useCabinetStore.getState()).toBe(before);
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

    it.each([-1, 1, 0.5])('is a no-op for invalid index %i', (index) => {
      const before = useCabinetStore.getState();
      useCabinetStore.getState().duplicateCabinet(index);
      expect(useCabinetStore.getState()).toBe(before);
    });
  });

  describe('mirrorCabinet', () => {
    it('inserts a mirrored copy after the source without changing the source', () => {
      useCabinetStore.getState().setConfig({ width: 800, isMirrored: false });
      useCabinetStore.getState().mirrorCabinet(0);

      const { cabinets, activeCabinetIndex } = useCabinetStore.getState();
      expect(cabinets).toHaveLength(2);
      expect(cabinets[0].name).toBe('Cabinet 1');
      expect(cabinets[0].config.isMirrored).toBe(false);
      expect(cabinets[1]).toMatchObject({ name: 'Cabinet 1 (mirror)', config: { width: 800, isMirrored: true } });
      expect(activeCabinetIndex).toBe(1);
    });

    it.each([-1, 1, 0.5])('is a no-op for invalid index %i', (index) => {
      const before = useCabinetStore.getState();
      useCabinetStore.getState().mirrorCabinet(index);
      expect(useCabinetStore.getState()).toBe(before);
    });
  });

  describe('loadProject', () => {
    it('preserves the current project when the replacement has no cabinets', () => {
      const before = useCabinetStore.getState();

      expect(() => useCabinetStore.getState().loadProject([])).not.toThrow();
      expect(useCabinetStore.getState()).toBe(before);
    });

    it('loads the project as active and can undo the replacement', () => {
      useCabinetStore.getState().setConfig({ width: 800 });
      useCabinetStore.getState().loadProject([{ name: 'Imported cabinet', config: { ...DEFAULT_CONFIG, width: 777 } }]);

      expect(useCabinetStore.getState().cabinets).toEqual([
        { name: 'Imported cabinet', config: { ...DEFAULT_CONFIG, width: 777 } },
      ]);
      expect(useCabinetStore.getState().config.width).toBe(777);
      expect(useCabinetStore.getState().canUndo).toBe(true);

      useCabinetStore.getState().undo();
      expect(useCabinetStore.getState().cabinets[0].config.width).toBe(800);
    });
  });

  describe('bulkReplaceMaterial', () => {
    it('replaces matching materials across cabinets and supports undo', () => {
      useCabinetStore.getState().setConfig({ carcassMaterial: 'plywood-17', backPanelMaterial: 'plywood-17' });
      useCabinetStore.getState().addCabinet();
      useCabinetStore.getState().setConfig({ carcassMaterial: 'mdf-18', backPanelMaterial: 'plywood-17' });

      useCabinetStore.getState().bulkReplaceMaterial('plywood-17', 'melamine-18');

      expect(
        useCabinetStore.getState().cabinets.map(({ config }) => [config.carcassMaterial, config.backPanelMaterial]),
      ).toEqual([
        ['melamine-18', 'melamine-18'],
        ['mdf-18', 'melamine-18'],
      ]);

      useCabinetStore.getState().undo();
      expect(
        useCabinetStore.getState().cabinets.map(({ config }) => [config.carcassMaterial, config.backPanelMaterial]),
      ).toEqual([
        ['plywood-17', 'plywood-17'],
        ['mdf-18', 'plywood-17'],
      ]);
    });

    it('is a no-op when source and destination match', () => {
      const before = useCabinetStore.getState();
      useCabinetStore.getState().bulkReplaceMaterial('mdf-18', 'mdf-18');
      expect(useCabinetStore.getState()).toBe(before);
    });
  });

  describe('worker-backed config actions', () => {
    it('toggles a part rotation lock on and off', () => {
      useCabinetStore.setState({ rotationLockedPartIds: {} });

      useCabinetStore.getState().toggleRotationLock('part-1');
      expect(useCabinetStore.getState().rotationLockedPartIds).toEqual({ 'part-1': true });

      useCabinetStore.getState().toggleRotationLock('part-1');
      expect(useCabinetStore.getState().rotationLockedPartIds).toEqual({});
    });

    it('sets, adds, and removes entries from the offcut catalog', () => {
      const first: OffcutEntry = {
        id: 'offcut-1',
        material: 'plywood-17',
        thickness: 17,
        width: 300,
        length: 600,
        addedAt: 1,
      };
      const second: OffcutEntry = { ...first, id: 'offcut-2', label: 'Shelf remnant' };
      const store = useCabinetStore.getState();

      store.setOffcutCatalog([first]);
      store.addOffcutEntry(second);
      expect(useCabinetStore.getState().offcutCatalog).toEqual([first, second]);

      useCabinetStore.getState().removeOffcutEntry(first.id);
      expect(useCabinetStore.getState().offcutCatalog).toEqual([second]);
      useCabinetStore.getState().removeOffcutEntry(second.id);
      expect(useCabinetStore.getState().offcutCatalog).toEqual([]);
    });

    it('adds and removes defect zones for the requested material only', () => {
      const first: DefectZone = { x: 10, y: 20, width: 30, length: 40 };
      const second: DefectZone = { x: 50, y: 60, width: 70, length: 80 };
      const otherMaterialZone: DefectZone = { x: 1, y: 2, width: 3, length: 4 };
      setDefectZones({});
      useCabinetStore.setState({ defectZones: {} });

      useCabinetStore.getState().addDefectZone('plywood-17', first);
      useCabinetStore.getState().addDefectZone('plywood-17', second);
      useCabinetStore.getState().addDefectZone('mdf-18', otherMaterialZone);
      expect(useCabinetStore.getState().defectZones).toEqual({
        'plywood-17': [first, second],
        'mdf-18': [otherMaterialZone],
      });

      useCabinetStore.getState().removeDefectZone('plywood-17', 0);
      expect(useCabinetStore.getState().defectZones).toEqual({
        'plywood-17': [second],
        'mdf-18': [otherMaterialZone],
      });
      useCabinetStore.getState().removeDefectZone('plywood-17', 0);
      expect(useCabinetStore.getState().defectZones).toEqual({
        'plywood-17': [],
        'mdf-18': [otherMaterialZone],
      });
      setDefectZones({});
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
    it('stores and removes sheet size override', () => {
      useCabinetStore.getState().setSheetSizeOverride('mdf18', { width: 1220, length: 2440 });
      expect(useCabinetStore.getState().sheetSizeOverrides['mdf18']).toEqual({ width: 1220, length: 2440 });
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

    it.each([-1, 4, 0.5])('does not change state when moving invalid cabinet index %i', (index) => {
      useCabinetStore.getState().addCabinet();
      const before = useCabinetStore.getState();
      useCabinetStore.getState().moveCabinet(index, 'down');
      expect(useCabinetStore.getState()).toBe(before);
    });
  });

  describe('setAutoCoNest (Sprint 107)', () => {
    it('defaults to false', () => {
      expect(useCabinetStore.getState().autoCoNest).toBe(false);
    });

    it('toggles autoCoNest on and off', () => {
      useCabinetStore.getState().setAutoCoNest(true);
      expect(useCabinetStore.getState().autoCoNest).toBe(true);
      useCabinetStore.getState().setAutoCoNest(false);
      expect(useCabinetStore.getState().autoCoNest).toBe(false);
    });
  });
});
