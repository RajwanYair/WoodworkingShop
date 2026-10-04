import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import { useCabinetStore } from '../../src/store/cabinet-store';
import type { CabinetState } from '../../src/store/cabinet-store';

beforeAll(() => {
  if (typeof window !== 'undefined' && !window.localStorage) {
    const store: Record<string, string> = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
        removeItem: (k: string) => {
          delete store[k];
        },
        clear: () => {
          Object.keys(store).forEach((k) => delete store[k]);
        },
      },
      writable: true,
    });
  }
});

describe('keyboard journeys — sprint 252', () => {
  beforeEach(() => {
    useCabinetStore.getState().resetConfig();
    useCabinetStore.getState().setActiveTab('configurator');
    if (useCabinetStore.getState().darkMode) {
      useCabinetStore.getState().toggleDarkMode();
    }
  });

  it.each([
    { key: '1', tab: 'configurator' },
    { key: '2', tab: 'preview' },
    { key: '3', tab: 'optimizer' },
    { key: '4', tab: 'assembly' },
    { key: '5', tab: 'pdf' },
    { key: '6', tab: 'calculators' },
  ] as const)('switches to $tab using Alt+$key', async ({ key, tab }) => {
    const user = userEvent.setup();
    render(<App />);

    await user.keyboard(`{Alt>}${key}{/Alt}`);

    expect(useCabinetStore.getState().activeTab).toBe(tab as CabinetState['activeTab']);
  });

  it('toggles dark mode using Alt+D and Alt+Shift+D', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(useCabinetStore.getState().darkMode).toBe(false);
    await user.keyboard('{Alt>}d{/Alt}');
    expect(useCabinetStore.getState().darkMode).toBe(true);

    await user.keyboard('{Alt>}D{/Alt}');
    expect(useCabinetStore.getState().darkMode).toBe(false);
  });

  it('opens and closes shortcuts modal with ?', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.keyboard('?');
    expect(screen.getByText('Ctrl + L')).toBeInTheDocument();

    await user.keyboard('?');
    expect(screen.queryByText('Ctrl + L')).not.toBeInTheDocument();
  });

  it('opens the command palette with Ctrl+K and invokes a filtered tab command', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.keyboard('{Control>}k{/Control}');
    const search = screen.getByRole('combobox', { name: 'Search commands' });
    await user.type(search, 'preview');
    await user.keyboard('{Enter}');

    expect(useCabinetStore.getState().activeTab).toBe('preview');
    expect(screen.queryByRole('dialog', { name: 'Command palette' })).not.toBeInTheDocument();
  });

  it('adds a cabinet from the command palette', async () => {
    const user = userEvent.setup();
    render(<App />);
    const initialCount = useCabinetStore.getState().cabinets.length;

    await user.keyboard('{Control>}k{/Control}');
    await user.type(screen.getByRole('combobox', { name: 'Search commands' }), 'Add cabinet');
    await user.keyboard('{Enter}');

    expect(useCabinetStore.getState().cabinets).toHaveLength(initialCount + 1);
  });

  it('opens and expands a calculator from the command palette', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.keyboard('{Control>}k{/Control}');
    await user.type(screen.getByRole('combobox', { name: 'Search commands' }), 'Finish Calculator');
    await user.keyboard('{Enter}');

    expect(useCabinetStore.getState().activeTab).toBe('calculators');
    expect(await screen.findByRole('button', { expanded: true }, { timeout: 10_000 })).toBeInTheDocument();
  });

  it('does not open the command palette when Ctrl+K is pressed in an input', async () => {
    const user = userEvent.setup();
    render(<App />);

    const languageSelect = screen.getAllByRole('combobox', { name: /language/i })[0];
    await user.click(languageSelect);
    await user.keyboard('{Control>}k{/Control}');

    expect(screen.queryByRole('dialog', { name: 'Command palette' })).not.toBeInTheDocument();
  });
});
