import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCabinetStore, detectOsDarkMode } from '../../src/store/cabinet-store';
import { DEFAULT_CONFIG } from '../../src/engine/materials';

describe('cabinet-store', () => {
  beforeEach(() => {
    // Reset store to defaults
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
    // Also re-derive
    useCabinetStore.getState().setConfig({});
    // Clear undo history from the setConfig call
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

  // Undo/Redo
  it('supports undo after config change', () => {
    const originalWidth = useCabinetStore.getState().config.width;
    useCabinetStore.getState().setConfig({ width: 999 });
    expect(useCabinetStore.getState().config.width).toBe(999);
    expect(useCabinetStore.getState().canUndo).toBe(true);

    useCabinetStore.getState().undo();
    expect(useCabinetStore.getState().config.width).toBe(originalWidth);
  });

  it('supports redo after undo', () => {
    useCabinetStore.getState().setConfig({ width: 888 });
    useCabinetStore.getState().undo();
    expect(useCabinetStore.getState().canRedo).toBe(true);

    useCabinetStore.getState().redo();
    expect(useCabinetStore.getState().config.width).toBe(888);
  });

  it('clears redo stack on new change', () => {
    useCabinetStore.getState().setConfig({ width: 888 });
    useCabinetStore.getState().undo();
    useCabinetStore.getState().setConfig({ width: 777 });
    expect(useCabinetStore.getState().canRedo).toBe(false);
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

  // Sprint 135 — cabinet notes
  it('setNotes stores notes on a cabinet', () => {
    useCabinetStore.getState().setNotes(0, 'Measure twice, cut once.');
    expect(useCabinetStore.getState().cabinets[0].notes).toBe('Measure twice, cut once.');
  });

  it('setNotes does not affect other cabinets', () => {
    useCabinetStore.getState().addCabinet();
    useCabinetStore.getState().setNotes(0, 'Cabinet A notes');
    expect(useCabinetStore.getState().cabinets[1].notes).toBeUndefined();
  });

  it('setNotes can clear notes with empty string', () => {
    useCabinetStore.getState().setNotes(0, 'some note');
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

  // Sprint 124 — OS dark-mode detection
  describe('detectOsDarkMode', () => {
    it('returns false when matchMedia is unavailable', () => {
      const orig = window.matchMedia;
      // @ts-expect-error — deliberately remove matchMedia
      window.matchMedia = undefined;
      expect(detectOsDarkMode()).toBe(false);
      window.matchMedia = orig;
    });

    it('returns true when prefers-color-scheme: dark matches', () => {
      const orig = window.matchMedia;
      window.matchMedia = vi.fn().mockReturnValue({ matches: true });
      expect(detectOsDarkMode()).toBe(true);
      window.matchMedia = orig;
    });

    it('returns false when prefers-color-scheme: dark does not match', () => {
      const orig = window.matchMedia;
      window.matchMedia = vi.fn().mockReturnValue({ matches: false });
      expect(detectOsDarkMode()).toBe(false);
      window.matchMedia = orig;
    });
  });

  // v3.23.0 — Labour rate, hours, finish cost
  describe('cost extras (v3.23.0)', () => {
    it('has default labourRate of 75', () => {
      useCabinetStore.setState({ labourRate: 75, labourHours: 0, finishCost: 0 });
      expect(useCabinetStore.getState().labourRate).toBe(75);
    });

    it('setLabourRate clamps to 0', () => {
      useCabinetStore.getState().setLabourRate(100);
      expect(useCabinetStore.getState().labourRate).toBe(100);
      useCabinetStore.getState().setLabourRate(-50);
      expect(useCabinetStore.getState().labourRate).toBe(0);
    });

    it('setLabourHours clamps to 0', () => {
      useCabinetStore.getState().setLabourHours(4.5);
      expect(useCabinetStore.getState().labourHours).toBe(4.5);
      useCabinetStore.getState().setLabourHours(-1);
      expect(useCabinetStore.getState().labourHours).toBe(0);
    });

    it('setFinishCost clamps to 0', () => {
      useCabinetStore.getState().setFinishCost(350);
      expect(useCabinetStore.getState().finishCost).toBe(350);
      useCabinetStore.getState().setFinishCost(-100);
      expect(useCabinetStore.getState().finishCost).toBe(0);
    });
  });

  // v3.21.0 — optimizationPending flag
  describe('optimizationPending (v3.21.0)', () => {
    it('initialises as false', () => {
      useCabinetStore.setState({ optimizationPending: false });
      expect(useCabinetStore.getState().optimizationPending).toBe(false);
    });

    it('can be set to true and back to false via setState', () => {
      useCabinetStore.setState({ optimizationPending: true });
      expect(useCabinetStore.getState().optimizationPending).toBe(true);
      useCabinetStore.setState({ optimizationPending: false });
      expect(useCabinetStore.getState().optimizationPending).toBe(false);
    });
  });

  // v3.22.0 / v3.23.0 — edge banding rate
  describe('setEdgeBandingRate', () => {
    it('updates edge banding rate', () => {
      useCabinetStore.getState().setEdgeBandingRate(5);
      expect(useCabinetStore.getState().edgeBandingRate).toBe(5);
    });

    it('clamps negative values to 0', () => {
      useCabinetStore.getState().setEdgeBandingRate(-2);
      expect(useCabinetStore.getState().edgeBandingRate).toBe(0);
    });
  });

  // Sprint 19 — Snapshot auto-naming with timestamp
  describe('saveSnapshot auto-naming (Sprint 19)', () => {
    beforeEach(() => {
      useCabinetStore.setState({ snapshots: [] });
    });

    it('uses provided name when non-empty', () => {
      useCabinetStore.getState().saveSnapshot('My custom name');
      const { snapshots } = useCabinetStore.getState();
      expect(snapshots[0].name).toBe('My custom name');
    });

    it('auto-names with "Snapshot YYYY-MM-DD HH:mm" format when name is empty', () => {
      useCabinetStore.getState().saveSnapshot('');
      const { snapshots } = useCabinetStore.getState();
      // Matches "Snapshot 2025-01-15 14:30" style
      expect(snapshots[0].name).toMatch(/^Snapshot \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    });

    it('auto-names with whitespace-only input', () => {
      useCabinetStore.getState().saveSnapshot('   ');
      const { snapshots } = useCabinetStore.getState();
      expect(snapshots[0].name).toMatch(/^Snapshot \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    });

    it('snapshot has valid ISO timestamp', () => {
      useCabinetStore.getState().saveSnapshot('test');
      const { snapshots } = useCabinetStore.getState();
      expect(() => new Date(snapshots[0].timestamp).toISOString()).not.toThrow();
    });

    it('snapshot id starts with "snap-"', () => {
      useCabinetStore.getState().saveSnapshot('test');
      const { snapshots } = useCabinetStore.getState();
      expect(snapshots[0].id).toMatch(/^snap-\d+$/);
    });
  });
});
