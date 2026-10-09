import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfiguratorPanel } from '../../src/components/configurator/ConfiguratorPanel';
import { useCabinetStore } from '../../src/store/cabinet-store';
import { DEFAULT_CONFIG } from '../../src/engine/materials';

describe('ConfiguratorPanel', () => {
  beforeEach(() => {
    useCabinetStore.setState({
      config: { ...DEFAULT_CONFIG },
      cabinets: [{ name: 'Cabinet 1', config: { ...DEFAULT_CONFIG } }],
      activeCabinetIndex: 0,
    });
  });

  it('renders dimension sliders', () => {
    render(<ConfiguratorPanel />);
    // MeasurementAssistantPanel may also render hint text containing these words,
    // so use getAllByText to handle multiple matches (same pattern used for height).
    expect(screen.getAllByText(/width/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/height/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/depth/i).length).toBeGreaterThanOrEqual(1);
  }, 15000);

  it('enables raw blank sizing without changing finished part dimensions', async () => {
    const user = userEvent.setup();
    render(<ConfiguratorPanel />);
    const partBefore = useCabinetStore.getState().parts.find((part) => (part.bandedEdges?.length ?? 0) > 0);

    await user.click(screen.getByRole('checkbox', { name: 'Size blanks for applied edge banding' }));

    const config = useCabinetStore.getState().config;
    const bandedPart = useCabinetStore.getState().parts.find((part) => part.id === partBefore?.id);
    expect(config.edgeBandingProcess).toMatchObject({ enabled: true, bandThicknessMm: 1, trimAllowanceMm: 0 });
    expect(partBefore).toBeDefined();
    expect(bandedPart).toBeDefined();
    expect([bandedPart?.length, bandedPart?.width]).toEqual([partBefore?.length, partBefore?.width]);
    expect(bandedPart?.rawLength !== bandedPart?.length || bandedPart?.rawWidth !== bandedPart?.width).toBe(true);
  });

  it('renders material selectors', () => {
    render(<ConfiguratorPanel />);
    expect(screen.getByText(/carcass/i)).toBeInTheDocument();
  });

  it('renders shelf config section', () => {
    render(<ConfiguratorPanel />);
    expect(screen.getAllByText(/shelves/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders door config section', () => {
    render(<ConfiguratorPanel />);
    expect(screen.getAllByText(/doors/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders reset button', () => {
    render(<ConfiguratorPanel />);
    expect(screen.getAllByText(/reset/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders cabinet selector (project section)', () => {
    render(<ConfiguratorPanel />);
    expect(screen.getAllByText(/project/i).length).toBeGreaterThan(0);
  });

  it('renders save/load panel', () => {
    render(<ConfiguratorPanel />);
    expect(screen.getByText(/my saved cabinets/i)).toBeInTheDocument();
  });

  it('switches furniture type and updates panel-specific controls', async () => {
    const user = userEvent.setup();
    render(<ConfiguratorPanel />);

    await user.click(screen.getByRole('radio', { name: 'Panel' }));

    expect(useCabinetStore.getState().config.furnitureType).toBe('panel');
    expect(useCabinetStore.getState().parts).toHaveLength(1);
    expect(useCabinetStore.getState().parts[0].name.en).toBe('Panel');
    expect(screen.getByText('Plate thickness from')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Back panel material' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /shelves/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /doors/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Cabinet' }));
    expect(useCabinetStore.getState().config.furnitureType).toBe('cabinet');
    expect(screen.getByRole('group', { name: /shelves/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /doors/i })).toBeInTheDocument();
  });

  it('updates the joinery selection in cabinet configuration', async () => {
    const user = userEvent.setup();
    render(<ConfiguratorPanel />);

    const dowelOption = screen.getByRole('radio', { name: 'Dowel' });
    await user.click(dowelOption);

    expect(useCabinetStore.getState().config.joineryType).toBe('dowel');
    expect(dowelOption).toBeChecked();
  });

  it('edits custom shelf positions and restores equal spacing', async () => {
    const user = userEvent.setup();
    render(<ConfiguratorPanel />);

    await user.click(screen.getByRole('radio', { name: 'Custom' }));
    expect(useCabinetStore.getState().config.shelfSpacing).toBe('custom');
    const firstPosition = screen.getByRole('spinbutton', { name: 'Shelf 1 position in mm' });
    await user.clear(firstPosition);
    await user.type(firstPosition, '42');
    expect(useCabinetStore.getState().config.customShelfPositions[0]).toBe(42);

    await user.click(screen.getByRole('button', { name: 'Reset to equal spacing' }));
    expect(useCabinetStore.getState().config.customShelfPositions[0]).not.toBe(42);
    expect(useCabinetStore.getState().config.shelfSpacing).toBe('custom');
  });

  it('updates door count and removes door parts and hinges when door style is None', async () => {
    const user = userEvent.setup();
    render(<ConfiguratorPanel />);

    await user.click(screen.getByRole('radio', { name: '1 doors' }));
    expect(useCabinetStore.getState().config.doorCount).toBe(1);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Door Style' }), 'none');
    expect(useCabinetStore.getState().config.doorStyle).toBe('none');
    expect(useCabinetStore.getState().parts.some((part) => part.name.en === 'Door')).toBe(false);
    expect(useCabinetStore.getState().hardware.some((item) => item.id === 'H01')).toBe(false);
  });

  it('shows drawer slide choices after entering a drawer count and stores the selected slide', async () => {
    const user = userEvent.setup();
    render(<ConfiguratorPanel />);

    const drawerCount = screen.getByRole('spinbutton', { name: 'Number of Drawers' });
    await user.clear(drawerCount);
    await user.type(drawerCount, '2');
    await user.keyboard('{Enter}');

    expect(useCabinetStore.getState().config.drawerCount).toBe(2);
    const fullExtension = screen.getByRole('radio', { name: 'Full-Extension' });
    await user.click(fullExtension);

    expect(useCabinetStore.getState().config.drawerSlideType).toBe('full-extension');
    expect(fullExtension).toBeChecked();
  });

  it.each([false, true])('resets configuration only when confirmation returns %s', async (confirmed) => {
    const user = userEvent.setup();
    const changedConfig = { ...DEFAULT_CONFIG, width: DEFAULT_CONFIG.width + 100 };
    useCabinetStore.setState({
      config: changedConfig,
      cabinets: [{ name: 'Cabinet 1', config: changedConfig }],
      activeCabinetIndex: 0,
    });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(confirmed);
    render(<ConfiguratorPanel />);

    await user.click(screen.getByRole('button', { name: 'Reset to Defaults' }));

    expect(confirm).toHaveBeenCalledOnce();
    expect(useCabinetStore.getState().config.width).toBe(confirmed ? DEFAULT_CONFIG.width : changedConfig.width);
  });
});

describe('SubstitutionPanel integration (Sprint 43)', () => {
  it('renders without error for default config', () => {
    useCabinetStore.setState({
      config: { ...DEFAULT_CONFIG },
      cabinets: [{ name: 'C', config: { ...DEFAULT_CONFIG } }],
      activeCabinetIndex: 0,
    });
    // Should render without throwing
    expect(() => render(<ConfiguratorPanel />)).not.toThrow();
  });

  it('renders substitution panel when chipboard used on wide span', () => {
    useCabinetStore.setState({
      config: { ...DEFAULT_CONFIG, carcassMaterial: 'chipboard-18', width: 1000 },
      cabinets: [{ name: 'C', config: { ...DEFAULT_CONFIG, carcassMaterial: 'chipboard-18', width: 1000 } }],
      activeCabinetIndex: 0,
    });
    render(<ConfiguratorPanel />);
    expect(screen.getByText(/material suggestions/i)).toBeInTheDocument();
  });

  it('shows Deflection benefit badge when deflection risk detected', () => {
    useCabinetStore.setState({
      config: { ...DEFAULT_CONFIG, carcassMaterial: 'chipboard-18', width: 1000 },
      cabinets: [{ name: 'C', config: { ...DEFAULT_CONFIG, carcassMaterial: 'chipboard-18', width: 1000 } }],
      activeCabinetIndex: 0,
    });
    render(<ConfiguratorPanel />);
    const badges = screen.getAllByText(/deflection/i);
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it('renders "Use this" switch button for each suggestion', () => {
    useCabinetStore.setState({
      config: { ...DEFAULT_CONFIG, carcassMaterial: 'chipboard-18', width: 1000 },
      cabinets: [{ name: 'C', config: { ...DEFAULT_CONFIG, carcassMaterial: 'chipboard-18', width: 1000 } }],
      activeCabinetIndex: 0,
    });
    render(<ConfiguratorPanel />);
    const switchBtns = screen.getAllByText(/use this/i);
    expect(switchBtns.length).toBeGreaterThanOrEqual(1);
  });

  it('panel has role section with correct aria-label', () => {
    useCabinetStore.setState({
      config: { ...DEFAULT_CONFIG, carcassMaterial: 'chipboard-18', width: 1000 },
      cabinets: [{ name: 'C', config: { ...DEFAULT_CONFIG, carcassMaterial: 'chipboard-18', width: 1000 } }],
      activeCabinetIndex: 0,
    });
    render(<ConfiguratorPanel />);
    expect(screen.getByRole('region', { name: /material suggestions/i })).toBeInTheDocument();
  });
});
