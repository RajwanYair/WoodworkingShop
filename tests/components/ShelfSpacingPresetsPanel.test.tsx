import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import { ShelfSpacingPresetsPanel } from '../../src/components/configurator/ShelfSpacingPresetsPanel';
import { useCabinetStore } from '../../src/store/cabinet-store';

describe('ShelfSpacingPresetsPanel', () => {
  beforeEach(() => {
    const config = { ...DEFAULT_CONFIG, height: 2000 };
    useCabinetStore.setState({ config, cabinets: [{ name: 'Cabinet 1', config }], activeCabinetIndex: 0 });
  });

  it('recalculates shelf clearance when a custom spacing is selected', async () => {
    const user = userEvent.setup();
    render(<ShelfSpacingPresetsPanel />);

    await user.click(screen.getByRole('button', { name: 'Shelf Spacing Presets' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Storage type' }), 'custom');
    const clearanceInput = screen.getByRole('spinbutton', { name: 'Custom clearance (mm)' });
    await user.clear(clearanceInput);
    await user.type(clearanceInput, '300');

    expect(clearanceInput).toHaveValue(300);
    expect(screen.getByText('300 mm')).toBeInTheDocument();
    expect(screen.getByText('Shelf positions from bottom')).toBeInTheDocument();
  });
});
