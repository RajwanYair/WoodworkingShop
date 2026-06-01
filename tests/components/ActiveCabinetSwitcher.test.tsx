import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { ActiveCabinetSwitcher } from '../../src/components/layout/ActiveCabinetSwitcher';
import { useCabinetStore } from '../../src/store/cabinet-store';
import { DEFAULT_CONFIG } from '../../src/engine/materials';

describe('ActiveCabinetSwitcher', () => {
  beforeEach(() => {
    useCabinetStore.setState({
      cabinets: [
        { name: 'Cabinet 1', config: { ...DEFAULT_CONFIG } },
        { name: 'Cabinet 2', config: { ...DEFAULT_CONFIG, width: 900 } },
      ],
      activeCabinetIndex: 0,
      config: { ...DEFAULT_CONFIG },
    });
  });

  it('renders one button per cabinet when project has multiple cabinets', () => {
    render(<ActiveCabinetSwitcher />);
    expect(screen.getByRole('button', { name: 'Cabinet 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cabinet 2' })).toBeInTheDocument();
  });

  it('switches active cabinet from non-configurator tab toolbar', () => {
    render(<ActiveCabinetSwitcher />);
    fireEvent.click(screen.getByRole('button', { name: 'Cabinet 2' }));
    expect(useCabinetStore.getState().activeCabinetIndex).toBe(1);
  });

  it('renders nothing when there is only one cabinet', () => {
    useCabinetStore.setState({
      cabinets: [{ name: 'Cabinet 1', config: { ...DEFAULT_CONFIG } }],
      activeCabinetIndex: 0,
      config: { ...DEFAULT_CONFIG },
    });
    render(<ActiveCabinetSwitcher />);
    expect(screen.queryByRole('button', { name: 'Cabinet 1' })).not.toBeInTheDocument();
  });
});
