import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { CommandPalette } from '../../src/components/layout/CommandPalette';
import { clearRecentCommands, clearRegistry, registerCommands } from '../../src/utils/command-palette';
import { renderWithLocale } from '../render-with-locale';

describe('CommandPalette', () => {
  beforeEach(() => {
    clearRegistry();
    clearRecentCommands();
  });

  it('filters commands and invokes the active result with Enter', async () => {
    const user = userEvent.setup();
    const openPreview = vi.fn();
    const onClose = vi.fn();
    registerCommands([
      { id: 'tab.preview', label: 'Preview', category: 'Tabs', action: openPreview, shortcut: 'Alt+2' },
      { id: 'theme.dark', label: 'Dark mode', category: 'Actions', action: vi.fn() },
    ]);
    await renderWithLocale(<CommandPalette open onClose={onClose} />);

    const search = screen.getByRole('combobox', { name: 'Search commands' });
    await user.type(search, 'prev');

    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option', { name: /Preview.*Alt\+2/ })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Enter}');

    expect(openPreview).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('reports an empty result set and closes on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    registerCommands([{ id: 'tab.preview', label: 'Preview', category: 'Tabs', action: vi.fn() }]);
    await renderWithLocale(<CommandPalette open onClose={onClose} />);

    await user.type(screen.getByRole('combobox', { name: 'Search commands' }), 'missing');

    expect(screen.getByText('No matching commands')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows recent commands and restores focus to the opener on Escape', async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    registerCommands([{ id: 'tab.preview', label: 'Preview', category: 'Tabs', action }]);
    await renderWithLocale(<PaletteHarness />);

    const opener = screen.getByRole('button', { name: 'Open palette' });
    await user.click(opener);
    await user.type(screen.getByRole('combobox', { name: 'Search commands' }), 'preview');
    await user.keyboard('{Enter}');

    expect(action).toHaveBeenCalledOnce();
    await waitFor(() => expect(opener).toHaveFocus());

    await user.click(opener);
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('Recent')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(opener).toHaveFocus());
  });
});

function PaletteHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open palette
      </button>
      <CommandPalette open={open} onClose={() => setOpen(false)} />
    </>
  );
}
