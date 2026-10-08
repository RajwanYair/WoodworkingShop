import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Header } from '../../src/components/layout/Header';
import { MobileTabBar } from '../../src/components/layout/MobileTabBar';
import { transitionTab } from '../../src/components/layout/transition-tab';
import { useCabinetStore } from '../../src/store/cabinet-store';

const originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
const originalViewTransition = Object.getOwnPropertyDescriptor(document, 'startViewTransition');

function setReducedMotionPreference(matches: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => ({ matches })),
  });
}

function addViewTransition() {
  const startViewTransition = vi.fn((update: () => void) => update());
  Object.defineProperty(document, 'startViewTransition', {
    configurable: true,
    value: startViewTransition,
  });
  return startViewTransition;
}

describe('tab transitions', () => {
  beforeEach(() => {
    useCabinetStore.setState({ activeTab: 'configurator' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalMatchMedia) {
      Object.defineProperty(window, 'matchMedia', originalMatchMedia);
    } else {
      Reflect.deleteProperty(window, 'matchMedia');
    }
    if (originalViewTransition) {
      Object.defineProperty(document, 'startViewTransition', originalViewTransition);
    } else {
      Reflect.deleteProperty(document, 'startViewTransition');
    }
  });

  it('runs the update immediately when the View Transition API is unavailable', () => {
    setReducedMotionPreference(false);
    const update = vi.fn();

    transitionTab(update);

    expect(update).toHaveBeenCalledOnce();
  });

  it('skips the animation when reduced motion is preferred', () => {
    setReducedMotionPreference(true);
    const startViewTransition = addViewTransition();
    const update = vi.fn();

    transitionTab(update);

    expect(startViewTransition).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledOnce();
  });

  it('switches desktop tabs inside a native view transition', async () => {
    setReducedMotionPreference(false);
    const startViewTransition = addViewTransition();
    const user = userEvent.setup();
    render(<Header />);

    await user.click(screen.getByRole('tab', { name: /preview/i }));

    expect(startViewTransition).toHaveBeenCalledOnce();
    expect(useCabinetStore.getState().activeTab).toBe('preview');
  });

  it('switches mobile tabs inside a native view transition', async () => {
    setReducedMotionPreference(false);
    const startViewTransition = addViewTransition();
    const user = userEvent.setup();
    render(<MobileTabBar />);

    await user.click(screen.getByRole('button', { name: 'Preview' }));

    expect(startViewTransition).toHaveBeenCalledOnce();
    expect(useCabinetStore.getState().activeTab).toBe('preview');
  });
});
