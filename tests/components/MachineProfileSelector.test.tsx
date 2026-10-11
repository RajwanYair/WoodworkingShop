import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MachineProfileSelector } from '../../src/components/assembly/MachineProfileSelector';
import { MACHINE_PROFILES } from '../../src/engine/machine-profiles';

describe('MachineProfileSelector', () => {
  it('restores the saved profile and persists selected machine settings', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    localStorage.setItem('cabinet-planner:machine-profile', 'shapeoko-3');
    render(<MachineProfileSelector onSelect={onSelect} />);

    const profileSelect = screen.getByRole('combobox', { name: 'Select machine profile' });
    expect(profileSelect).toHaveValue('shapeoko-3');
    expect(screen.getByText(MACHINE_PROFILES['shapeoko-3'].description)).toBeInTheDocument();

    await user.selectOptions(profileSelect, 'genmitsu-3018');

    expect(localStorage.getItem('cabinet-planner:machine-profile')).toBe('genmitsu-3018');
    expect(onSelect).toHaveBeenCalledWith(MACHINE_PROFILES['genmitsu-3018']);
    expect(screen.getByText(MACHINE_PROFILES['genmitsu-3018'].description)).toBeInTheDocument();
    expect(screen.getByText('10,000')).toBeInTheDocument();
  });
});
