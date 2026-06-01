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
});
