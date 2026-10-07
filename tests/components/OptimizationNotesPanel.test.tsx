import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OptimizationNotesPanel } from '../../src/components/optimizer/OptimizationNotesPanel';
import type { OptimizationSuggestion } from '../../src/engine/types';
import { useCabinetStore } from '../../src/store/cabinet-store';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import { makeOptimizationResult } from '../helpers';
import { findOptimizations } from '../../src/engine/smart-optimizer';

vi.mock('../../src/engine/smart-optimizer', () => ({ findOptimizations: vi.fn() }));

const suggestion: OptimizationSuggestion = {
  originalConfig: { ...DEFAULT_CONFIG },
  optimizedConfig: { ...DEFAULT_CONFIG, width: 850 },
  originalResult: makeOptimizationResult(),
  optimizedResult: makeOptimizationResult({ overallYield: 98 }),
  savings: { sheetsRemoved: 0, yieldImprovement: 4, wasteReduced: 80_000 },
  strategy: 'adjust-width',
  explanation: { en: 'A narrower cabinet improves sheet yield.', he: 'רוחב צר יותר משפר את ניצולת הלוחות.' },
  score: 1,
};

describe('OptimizationNotesPanel', () => {
  beforeEach(() => {
    const config = { ...DEFAULT_CONFIG };
    useCabinetStore.setState({ config, cabinets: [{ name: 'Cabinet 1', config }], activeCabinetIndex: 0 });
    vi.mocked(findOptimizations).mockReturnValue([suggestion]);
  });

  it('applies a suggestion and allows dismissed suggestions to be restored', async () => {
    const user = userEvent.setup();
    render(<OptimizationNotesPanel />);

    await screen.findByText('A narrower cabinet improves sheet yield.');
    expect(screen.getByText(/0\.080 m²/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(useCabinetStore.getState().config.width).toBe(850);
    expect(screen.queryByText('A narrower cabinet improves sheet yield.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Restore dismissed suggestions' }));
    expect(await screen.findByText('A narrower cabinet improves sheet yield.')).toBeInTheDocument();
  });
});
