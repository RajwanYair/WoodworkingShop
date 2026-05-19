import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TouchGestureTutorial } from '../../src/components/layout/TouchGestureTutorial';

const TOURED_KEY = 'woodworkingshop:preview-toured';

// jsdom provides window.localStorage but not the bare `localStorage` global.
// Stub it so component code that calls localStorage.getItem/setItem works.
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
vi.stubGlobal('localStorage', localStorageMock);

describe('TouchGestureTutorial', () => {
  beforeEach(() => {
    localStorageMock.clear();
    // Simulate a touch device
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 1, configurable: true });
  });

  it('shows overlay on first visit on touch device', () => {
    render(<TouchGestureTutorial />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does not show when already toured', () => {
    localStorageMock.setItem(TOURED_KEY, '1');
    render(<TouchGestureTutorial />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('dismisses and sets flag when "Got it" is clicked', () => {
    render(<TouchGestureTutorial />);
    fireEvent.click(screen.getByRole('button', { name: /got it/i }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(localStorageMock.getItem(TOURED_KEY)).toBe('1');
  });

  it('dismisses via close button', () => {
    render(<TouchGestureTutorial />);
    fireEvent.click(screen.getByLabelText(/dismiss gesture tutorial/i));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(localStorageMock.getItem(TOURED_KEY)).toBe('1');
  });

  it('does not show on non-touch device', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, configurable: true });
    render(<TouchGestureTutorial />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders all four gesture hints', () => {
    render(<TouchGestureTutorial />);
    expect(screen.getByText(/pinch/i)).toBeInTheDocument();
    expect(screen.getByText(/drag|pan/i)).toBeInTheDocument();
    expect(screen.getByText(/double.tap|reset zoom/i)).toBeInTheDocument();
    expect(screen.getByText(/swipe/i)).toBeInTheDocument();
  });
});
