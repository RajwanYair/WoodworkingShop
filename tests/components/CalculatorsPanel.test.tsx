import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { CalculatorsPanel } from '../../src/components/configurator/CalculatorsPanel';

describe('CalculatorsPanel', () => {
  it('starts collapsed and expands only selected calculator on demand', async () => {
    const user = userEvent.setup();
    render(<CalculatorsPanel />);

    const toggles = screen.getAllByRole('button').filter((button) => button.hasAttribute('aria-expanded'));
    expect(toggles.length).toBeGreaterThan(0);
    toggles.forEach((toggle) => expect(toggle.getAttribute('aria-expanded')).toBe('false'));
    expect(screen.queryByLabelText(/finish type/i)).not.toBeInTheDocument();

    const finishToggle = screen.getByRole('button', { name: /finish calculator/i });
    await user.click(finishToggle);
    expect(finishToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText(/finish type/i)).toBeInTheDocument();

    const faceFrameToggle = screen.getByRole('button', { name: /face frame calculator/i });
    await user.click(faceFrameToggle);
    expect(faceFrameToggle).toHaveAttribute('aria-expanded', 'true');

    const expandedToggles = screen.getAllByRole('button').filter((button) => {
      return button.getAttribute('aria-expanded') === 'true';
    });
    expect(expandedToggles.length).toBe(2);

    await user.click(finishToggle);
    expect(finishToggle).toHaveAttribute('aria-expanded', 'false');
  });
});
