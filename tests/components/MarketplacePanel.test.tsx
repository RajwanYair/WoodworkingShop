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

  it('replaces the plugin list with an empty state when search has no matches', async () => {
    const user = userEvent.setup();
    render(<MarketplacePanel onClose={() => {}} />);

    await user.type(screen.getByRole('searchbox', { name: 'Search plugins…' }), 'unlisted plugin');

    expect(screen.getByText('No plugins found')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('filters the catalog by a plugin name', async () => {
    const user = userEvent.setup();
    render(<MarketplacePanel onClose={() => {}} />);

    await user.type(screen.getByRole('searchbox', { name: 'Search plugins…' }), 'FANUC');

    const pluginList = screen.getByRole('list');
    expect(within(pluginList).getAllByRole('listitem')).toHaveLength(1);
    expect(within(pluginList).getByText('FANUC G-code Post-processor')).toBeInTheDocument();
  });

  it('filters the catalog by text in a plugin description', async () => {
    const user = userEvent.setup();
    render(<MarketplacePanel onClose={() => {}} />);

    await user.type(screen.getByRole('searchbox', { name: 'Search plugins…' }), 'tool-change macros');

    expect(screen.getByText('FANUC G-code Post-processor')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('combines the category filter with the search query', async () => {
    const user = userEvent.setup();
    render(<MarketplacePanel onClose={() => {}} />);
    const dialog = screen.getByRole('dialog', { name: 'Plugin Marketplace' });

    await user.click(within(dialog).getByRole('button', { name: 'Export' }));
    await user.type(within(dialog).getByRole('searchbox', { name: 'Search plugins…' }), 'excel');

    expect(within(dialog).getAllByRole('listitem')).toHaveLength(1);
    expect(within(dialog).getByText('Excel BOM Export')).toBeInTheDocument();
  });

  it('uninstalls a plugin and makes it available to install again', async () => {
    const user = userEvent.setup();
    render(<MarketplacePanel onClose={() => {}} />);
    const dialog = screen.getByRole('dialog', { name: 'Plugin Marketplace' });
    const pluginList = within(dialog).getByRole('list');
    const install = within(pluginList).getAllByRole('button', { name: 'Install' })[0];

    await user.click(install);
    expect(isPluginInstalled('com.cabinet-planner.gcode-post-fanuc')).toBe(true);
    await user.click(within(pluginList).getByRole('button', { name: 'Uninstall' }));

    expect(isPluginInstalled('com.cabinet-planner.gcode-post-fanuc')).toBe(false);
    expect(within(pluginList).getAllByRole('button', { name: 'Install' })).toHaveLength(6);
  });
});
