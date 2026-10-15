import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COMMAND_ACTION_EVENT } from '../../src/app/command-registry';
import { HelpButton, OnboardingManager } from '../../src/app/OnboardingOverlay';
import { getCommand } from '../../src/utils/command-palette';

const showPopoverDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover');
const hidePopoverDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'hidePopover');

describe('guided onboarding tour', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', {
      configurable: true,
      value(this: HTMLElement) {
        this.removeAttribute('popover');
      },
    });
    Object.defineProperty(HTMLElement.prototype, 'hidePopover', {
      configurable: true,
      value() {},
    });
  });

  afterEach(() => {
    if (showPopoverDescriptor) Object.defineProperty(HTMLElement.prototype, 'showPopover', showPopoverDescriptor);
    else Reflect.deleteProperty(HTMLElement.prototype, 'showPopover');
    if (hidePopoverDescriptor) Object.defineProperty(HTMLElement.prototype, 'hidePopover', hidePopoverDescriptor);
    else Reflect.deleteProperty(HTMLElement.prototype, 'hidePopover');
    window.localStorage.clear();
    document.documentElement.dir = 'ltr';
  });

  it('supports keyboard navigation, focus containment, and dismissal', async () => {
    const user = userEvent.setup();
    render(<OnboardingManager />);

    const dialog = await screen.findByRole('dialog', { name: 'Configure your cabinet' });
    expect(within(dialog).getByRole('status')).toHaveAttribute('aria-label', 'Step 1 of 3');

    await user.keyboard('{Tab}');
    expect(within(dialog).getByRole('button', { name: 'Next' })).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(await screen.findByRole('dialog', { name: 'Optimise cut sheets' })).toBeInTheDocument();
    await user.keyboard('{Tab}');
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Back' })).toHaveFocus();
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(window.localStorage.getItem('onboarding-seen')).toBe('1');
  });

  it('registers the Help command and reopens the tour on request', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem('onboarding-seen', '1');
    const execute = vi.fn();
    window.addEventListener(COMMAND_ACTION_EVENT, execute);
    const view = render(
      <>
        <HelpButton />
        <OnboardingManager />
      </>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(getCommand('help.onboarding')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Help' }));
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ detail: 'help.open' }));

    window.localStorage.removeItem('onboarding-seen');
    window.dispatchEvent(new Event('show-onboarding'));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    view.unmount();
    window.removeEventListener(COMMAND_ACTION_EVENT, execute);
  });

  it('keeps the tour dialog accessible in an RTL document', async () => {
    document.documentElement.dir = 'rtl';
    const view = render(<OnboardingManager />);
    const dialog = await screen.findByRole('dialog', { name: 'Configure your cabinet' });
    const results = await axe.run(view.container, {
      rules: {
        'color-contrast': { enabled: false },
        region: { enabled: false },
      },
    });

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-describedby');
    expect(
      results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical'),
    ).toEqual([]);
  });
});
