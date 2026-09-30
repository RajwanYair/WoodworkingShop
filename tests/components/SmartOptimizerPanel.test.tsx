import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SmartOptimizerPanel } from '../../src/components/optimizer/SmartOptimizerPanel';
import { useCabinetStore } from '../../src/store/cabinet-store';
import { findOptimizations } from '../../src/engine/smart-optimizer';

vi.mock('../../src/engine/smart-optimizer', () => ({ findOptimizations: vi.fn() }));

describe('SmartOptimizerPanel', () => {
  beforeEach(() => {
    vi.mocked(findOptimizations).mockReturnValue([]);
  });

  it('requires a selected strategy and displays the empty result state', async () => {
    const user = userEvent.setup();
    render(<SmartOptimizerPanel />);

    const findButton = screen.getByRole('button', { name: 'Find Optimizations' });
    const optimizeDepth = screen.getByRole('checkbox', { name: 'Optimize Depth' });
    for (const strategy of ['Optimize Depth', 'Co-Nest Strips', 'Adjust Width', 'Adjust Height', 'Material Swap']) {
      await user.click(screen.getByRole('checkbox', { name: strategy }));
    }
    expect(findButton).toBeDisabled();

    await user.click(optimizeDepth);
    await user.click(findButton);

    expect(await screen.findByText('No improvements found within tolerance')).toBeInTheDocument();
    expect(findOptimizations).toHaveBeenCalledWith(useCabinetStore.getState().config, {
      strategies: ['reduce-depth'],
      tolerance: 20,
    });
  });
});
