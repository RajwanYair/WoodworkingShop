import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MarketplacePanel } from '../../src/features/workspace/MarketplacePanel';
import { clearSavedPluginListings, isPluginListingSaved } from '../../src/utils/plugin-marketplace';

describe('MarketplacePanel', () => {
  beforeEach(() => {
    clearSavedPluginListings();
  });

  afterEach(() => {
    clearSavedPluginListings();
  });

  it('filters by category and saves a catalog listing', async () => {
    const user = userEvent.setup();
    render(<MarketplacePanel onClose={() => {}} />);

    const dialog = screen.getByRole('dialog', { name: 'Plugin Marketplace' });
    expect(within(dialog).getByRole('note')).toHaveTextContent(
      'Saving a listing bookmarks its ID on this device; it does not download or activate plugin code.',
    );
    expect(within(dialog).getByLabelText('4.7 stars')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Export' }));

    const pluginList = within(dialog).getByRole('list');
    expect(within(pluginList).getAllByRole('listitem')).toHaveLength(2);
    expect(within(pluginList).getByText('FANUC G-code Post-processor')).toBeInTheDocument();
    expect(within(pluginList).queryByText('Nordic Light Theme')).not.toBeInTheDocument();

    await user.click(within(pluginList).getAllByRole('button', { name: 'Save listing' })[0]);

    expect(isPluginListingSaved('com.cabinet-planner.gcode-post-fanuc')).toBe(true);
    expect(within(pluginList).getByRole('button', { name: 'Remove saved listing' })).toBeInTheDocument();
  });

  it('clears search and category filters from the empty state', async () => {
    const user = userEvent.setup();
    render(<MarketplacePanel onClose={() => {}} />);

    const dialog = screen.getByRole('dialog', { name: 'Plugin Marketplace' });
    const search = within(dialog).getByRole('searchbox', { name: 'Search plugins…' });
    await user.click(within(dialog).getByRole('button', { name: 'Optimizer' }));
    await user.type(search, 'unlisted plugin');

    expect(within(dialog).getByText('No plugins found')).toBeInTheDocument();
    const allButtons = within(dialog).getAllByRole('button', { name: 'All' });
    await user.click(allButtons[allButtons.length - 1]);

    expect(search).toHaveValue('');
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(6);
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

  it('removes a saved listing and makes it available to save again', async () => {
    const user = userEvent.setup();
    render(<MarketplacePanel onClose={() => {}} />);
    const dialog = screen.getByRole('dialog', { name: 'Plugin Marketplace' });
    const pluginList = within(dialog).getByRole('list');
    const save = within(pluginList).getAllByRole('button', { name: 'Save listing' })[0];

    await user.click(save);
    expect(isPluginListingSaved('com.cabinet-planner.gcode-post-fanuc')).toBe(true);
    await user.click(within(pluginList).getByRole('button', { name: 'Remove saved listing' }));

    expect(isPluginListingSaved('com.cabinet-planner.gcode-post-fanuc')).toBe(false);
    expect(within(pluginList).getAllByRole('button', { name: 'Save listing' })).toHaveLength(6);
  });
});
