/**
 * Sprint 71 — Ctrl+L keyboard shortcut copies share link to clipboard.
 */
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import App from '../../src/App';
import { useCabinetStore } from '../../src/store/cabinet-store';

beforeAll(() => {
  if (typeof window !== 'undefined' && !window.localStorage) {
    const store: Record<string, string> = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => { store[k] = v; },
        removeItem: (k: string) => { delete store[k]; },
        clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
      },
      writable: true,
    });
  }
});

describe('Ctrl+L share link shortcut — Sprint 71', () => {
  beforeEach(() => {
    useCabinetStore.getState().resetConfig();
  });

  it('Ctrl+L calls navigator.clipboard.writeText', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(<App />);
    await act(async () => {
      fireEvent.keyDown(window, { key: 'l', ctrlKey: true });
    });
    expect(writeText).toHaveBeenCalledTimes(1);
  });

  it('Ctrl+L passes a URL string to clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(<App />);
    await act(async () => {
      fireEvent.keyDown(window, { key: 'l', ctrlKey: true });
    });
    const arg: string = writeText.mock.calls[0][0];
    expect(typeof arg).toBe('string');
    expect(arg.length).toBeGreaterThan(0);
  });

  it('Ctrl+L entry appears in ShortcutsModal', () => {
    render(<App />);
    act(() => {
      fireEvent.keyDown(window, { key: '?' });
    });
    expect(screen.getByText('Ctrl + L')).toBeInTheDocument();
  });

  it('capital Ctrl+L also triggers clipboard write', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(<App />);
    await act(async () => {
      fireEvent.keyDown(window, { key: 'L', ctrlKey: true });
    });
    expect(writeText).toHaveBeenCalledTimes(1);
  });
});
