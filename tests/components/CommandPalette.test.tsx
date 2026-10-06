import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../../src/App';
import { useCabinetStore } from '../../src/store/cabinet-store';
import { clearRecentCommands, getRecentCommandIds } from '../../src/utils/command-palette';

describe('CommandPalette', () => {
  beforeEach(() => {
    clearRecentCommands();
    useCabinetStore.getState().resetConfig();
    useCabinetStore.getState().setActiveTab('configurator');
  });

  it('opens a searched calculator directly and lists it in recent commands', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.keyboard('{Control>}k{/Control}');
    const search = await screen.findByRole('combobox', { name: 'Search commands and actions...' }, { timeout: 5000 });
    await user.type(search, 'calculator.shelf-deflection');
    await user.keyboard('{Enter}');

    expect(useCabinetStore.getState().activeTab).toBe('calculators');
    expect(getRecentCommandIds()).toContain('calculator.shelf-deflection');

    const triggers = screen.getAllByRole('button', { name: 'Command Palette' });
    await user.click(triggers[triggers.length - 1]);
    expect(screen.getByRole('group', { name: 'Recent commands' })).toHaveTextContent('Shelf Sag Calculator');
  });

  it('opens with Ctrl+K, filters commands, runs the selected command, and closes', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Skip' }));

    await user.keyboard('{Control>}k{/Control}');
    const search = await screen.findByRole('combobox', { name: 'Search commands and actions...' }, { timeout: 5000 });
    expect(search).toHaveFocus();
    await user.type(search, 'calculators');
    await user.keyboard('{Enter}');

    expect(useCabinetStore.getState().activeTab).toBe('calculators');
    expect(screen.queryByRole('dialog', { name: 'Command Palette' })).not.toBeInTheDocument();
  });

  it('opens from the Header and restores trigger focus after Escape', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    const triggers = screen.getAllByRole('button', { name: 'Command Palette' });
    const trigger = triggers[triggers.length - 1];

    await user.click(trigger);
    expect(
      await screen.findByRole('combobox', { name: 'Search commands and actions...' }, { timeout: 5000 }),
    ).toHaveFocus();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: 'Command Palette' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('does not intercept Ctrl+K while a dimension field is being edited', async () => {
    const user = userEvent.setup();
    render(
      <>
        <input aria-label="Editable field" />
        <App />
      </>,
    );
    const input = screen.getByRole('textbox', { name: 'Editable field' });

    await user.click(input);
    await user.keyboard('{Control>}k{/Control}');

    expect(screen.queryByRole('dialog', { name: 'Command Palette' })).not.toBeInTheDocument();
  });
});
