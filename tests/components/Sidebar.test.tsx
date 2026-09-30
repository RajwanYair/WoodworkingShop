import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Sidebar } from '../../src/components/layout/Sidebar';

describe('Sidebar', () => {
  it('opens the mobile summary dialog and closes it with Escape', async () => {
    const user = userEvent.setup();
    render(<Sidebar />);

    await user.click(screen.getByRole('button', { name: 'Toggle summary panel' }));
    expect(screen.getByRole('dialog', { name: 'Cabinet summary' })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: 'Cabinet summary' })).not.toBeInTheDocument();
  });
});
