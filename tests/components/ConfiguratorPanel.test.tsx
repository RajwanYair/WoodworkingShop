import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
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
    expect(screen.getByText(/width/i)).toBeInTheDocument();
    expect(screen.getAllByText(/height/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/depth/i)).toBeInTheDocument();
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
