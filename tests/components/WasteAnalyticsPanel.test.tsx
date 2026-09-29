import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { WasteAnalyticsPanel } from '../../src/components/optimizer/WasteAnalyticsPanel';
import { makeOptimizationResult } from '../helpers';

describe('WasteAnalyticsPanel', () => {
  it('shows the waste rating and detailed material recovery metrics', async () => {
    const user = userEvent.setup();
    render(<WasteAnalyticsPanel result={makeOptimizationResult()} />);

    const toggle = screen.getByRole('button', { name: /Waste Analytics/ });
    expect(toggle).toHaveTextContent('Poor · 94.0%');
    await user.click(toggle);

    expect(screen.getByText('melamine-18')).toBeInTheDocument();
    expect(screen.getByText('By Material')).toBeInTheDocument();
    expect(screen.getByText('Worst Performing Sheets')).toBeInTheDocument();
    expect(screen.getByText(/1 sheet\(s\) have enough remaining area/)).toBeInTheDocument();
  });
});
