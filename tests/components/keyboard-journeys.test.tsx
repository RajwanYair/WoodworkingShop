import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import { downloadBomCsv } from '../../src/utils/bom-export';
import { useCabinetStore } from '../../src/store/cabinet-store';
import type { CabinetState } from '../../src/store/cabinet-store';

vi.mock('../../src/utils/bom-export', () => ({ downloadBomCsv: vi.fn() }));

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
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
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
    expect(await screen.findByText('Ctrl + L', {}, { timeout: 15000 })).toBeInTheDocument();

    await user.keyboard('?');
    expect(screen.queryByText('Ctrl + L')).not.toBeInTheDocument();
  });

  it('lists Ctrl+K in the keyboard shortcuts modal', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.keyboard('?');

    expect(await screen.findByText('Ctrl + K', {}, { timeout: 15000 })).toBeInTheDocument();
  });

  it('loads the BOM exporter when Ctrl+E is pressed', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.keyboard('{Control>}e{/Control}');

    await screen.findByText('BOM exported');
    expect(downloadBomCsv).toHaveBeenCalledTimes(1);
  });

  it('opens the command palette with Ctrl+K and invokes a filtered tab command', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.keyboard('{Control>}k{/Control}');
    const search = await screen.findByRole('combobox', { name: /Search commands/ }, { timeout: 15000 });
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
    await user.type(
      await screen.findByRole('combobox', { name: /Search commands/ }, { timeout: 15000 }),
      'Add cabinet',
    );
    await user.keyboard('{Enter}');

    expect(useCabinetStore.getState().cabinets).toHaveLength(initialCount + 1);
  });

  it('opens and expands a calculator from the command palette', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.keyboard('{Control>}k{/Control}');
    await user.type(
      await screen.findByRole('combobox', { name: /Search commands/ }, { timeout: 15000 }),
      'Finish Calculator',
    );
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
