import { describe, it, expect, beforeEach } from 'vitest';
import { useCabinetStore } from '../../src/store/cabinet-store';
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
    const before = useCabinetStore.getState().parts.length;
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
    // With 2 cabinets, should have prefixed part IDs
    expect(allParts.some((p) => p.id.startsWith('C1-'))).toBe(true);
    expect(allParts.some((p) => p.id.startsWith('C2-'))).toBe(true);
  });
});
