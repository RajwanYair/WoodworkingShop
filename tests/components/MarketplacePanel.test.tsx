import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MarketplacePanel } from '../../src/components/layout/MarketplacePanel';
import { clearInstalledPlugins, isPluginInstalled } from '../../src/utils/plugin-marketplace';

describe('MarketplacePanel', () => {
  beforeEach(() => {
    clearInstalledPlugins();
  });

  afterEach(() => {
    clearInstalledPlugins();
  });

  it('filters by category and persists a plugin installation', async () => {
    const user = userEvent.setup();
    render(<MarketplacePanel onClose={() => {}} />);

    const dialog = screen.getByRole('dialog', { name: 'Plugin Marketplace' });
    await user.click(within(dialog).getByRole('button', { name: 'Export' }));

    const pluginList = within(dialog).getByRole('list');
    expect(within(pluginList).getAllByRole('listitem')).toHaveLength(2);
    expect(within(pluginList).getByText('FANUC G-code Post-processor')).toBeInTheDocument();
    expect(within(pluginList).queryByText('Nordic Light Theme')).not.toBeInTheDocument();

    await user.click(within(pluginList).getAllByRole('button', { name: 'Install' })[0]);

    expect(isPluginInstalled('com.cabinet-planner.gcode-post-fanuc')).toBe(true);
    expect(within(pluginList).getByRole('button', { name: 'Uninstall' })).toBeInTheDocument();
  });
});
