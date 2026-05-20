/**
 * Sprint 86 — Ctrl+Shift+N adds a new cabinet keyboard shortcut.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

vi.mock('zustand/middleware', async (importActual) => {
  const actual = await importActual<typeof import('zustand/middleware')>();
  return { ...actual, persist: (fn: unknown) => fn };
});

import App from '../../src/App';
import { useCabinetStore } from '../../src/store/cabinet-store';
import { useToastStore } from '../../src/store/toast-store';

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

vi.mock('../../src/workers/cut-optimizer.worker?worker', () => ({
  default: class MockWorker {
    onmessage: ((e: MessageEvent) => void) | null = null;
    postMessage() {}
    terminate() {}
  },
}));
vi.mock('../../src/workers/bom-export.worker?worker', () => ({
  default: class MockWorker {
    onmessage: ((e: MessageEvent) => void) | null = null;
    postMessage() {}
    terminate() {}
  },
}));
vi.mock('../../src/workers/dxf-export.worker?worker', () => ({
  default: class MockWorker {
    onmessage: ((e: MessageEvent) => void) | null = null;
    postMessage() {}
    terminate() {}
  },
}));

describe('Ctrl+Shift+N — add cabinet shortcut (Sprint 86)', () => {
  beforeEach(() => {
    useCabinetStore.setState({
      cabinets: [{ name: 'Cabinet 1', config: useCabinetStore.getState().config }],
      activeCabinetIndex: 0,
    });
    useToastStore.setState({ toasts: [] });
  });

  it('Ctrl+Shift+N adds a new cabinet to the store', () => {
    render(<App />);
    const before = useCabinetStore.getState().cabinets.length;
    fireEvent.keyDown(window, { key: 'N', ctrlKey: true, shiftKey: true });
    const after = useCabinetStore.getState().cabinets.length;
    expect(after).toBe(before + 1);
  });

  it('Ctrl+Shift+n (lowercase) also triggers the shortcut', () => {
    render(<App />);
    const before = useCabinetStore.getState().cabinets.length;
    fireEvent.keyDown(window, { key: 'n', ctrlKey: true, shiftKey: true });
    expect(useCabinetStore.getState().cabinets.length).toBe(before + 1);
  });

  it('shows a success toast after adding a cabinet', () => {
    render(<App />);
    fireEvent.keyDown(window, { key: 'N', ctrlKey: true, shiftKey: true });
    const toasts = useToastStore.getState().toasts;
    expect(toasts.some((t) => t.type === 'success')).toBe(true);
  });

  it('ShortcutsModal lists Ctrl+Shift+N', () => {
    render(<App />);
    // Open shortcuts modal with '?'
    fireEvent.keyDown(window, { key: '?' });
    expect(screen.getByText('Ctrl + Shift + N')).toBeInTheDocument();
  });
});
