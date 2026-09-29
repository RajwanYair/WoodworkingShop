import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import { DrawerConfig } from '../../src/components/configurator/DrawerConfig';
import { useCabinetStore } from '../../src/store/cabinet-store';

describe('DrawerConfig', () => {
  beforeEach(() => {
    const config = { ...DEFAULT_CONFIG, drawerCount: 2, drawerHeights: [120, 180] };
    useCabinetStore.setState({ config, cabinets: [{ name: 'Cabinet 1', config }], activeCabinetIndex: 0 });
  });

  it('updates slide type and individual height, then hides drawer options at zero count', async () => {
    const user = userEvent.setup();
    render(<DrawerConfig />);

    const fullExtension = screen.getByRole('radio', { name: 'Full-Extension' });
    await user.click(fullExtension);
    expect(useCabinetStore.getState().config.drawerSlideType).toBe('full-extension');

    const firstHeight = screen.getByRole('spinbutton', { name: 'Drawer 1' });
    await user.clear(firstHeight);
    await user.type(firstHeight, '145');
    await user.keyboard('{Enter}');
    expect(useCabinetStore.getState().config.drawerHeights).toEqual([145, 180]);

    const drawerCount = screen.getByRole('spinbutton', { name: 'Number of Drawers' });
    await user.clear(drawerCount);
    await user.type(drawerCount, '0');
    await user.keyboard('{Enter}');

    expect(useCabinetStore.getState().config.drawerCount).toBe(0);
    expect(screen.queryByRole('radio', { name: 'Full-Extension' })).not.toBeInTheDocument();
    expect(screen.queryByText('Drawer box height (mm)')).not.toBeInTheDocument();
  });
});
