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
    expect(screen.getByText(/height/i)).toBeInTheDocument();
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
    expect(screen.getByText(/reset/i)).toBeInTheDocument();
  });

  it('renders cabinet selector (project section)', () => {
    render(<ConfiguratorPanel />);
    expect(screen.getByText(/project/i)).toBeInTheDocument();
  });

  it('renders save/load panel', () => {
    render(<ConfiguratorPanel />);
    expect(screen.getByText(/my saved cabinets/i)).toBeInTheDocument();
  });
});
