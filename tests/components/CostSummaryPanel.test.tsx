import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CostSummaryPanel } from '../../src/components/configurator/CostSummaryPanel';
import { useCabinetStore } from '../../src/store/cabinet-store';
import { DEFAULT_CONFIG } from '../../src/engine/materials';

describe('CostSummaryPanel', () => {
  beforeEach(() => {
    const config = { ...DEFAULT_CONFIG };
    useCabinetStore.setState({ config, cabinets: [{ name: 'Cabinet 1', config }], activeCabinetIndex: 0 });
  });

  it('shows the cost breakdown and exports it as CSV', async () => {
    const user = userEvent.setup();
    let downloadedFileName = '';
    const anchor = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloadedFileName = this.download;
    });
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:cost-summary');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    render(<CostSummaryPanel />);

    await user.click(screen.getByRole('button', { name: /Cost Summary/ }));
    const table = screen.getByRole('table', { name: 'Cost breakdown table' });
    expect(table).toHaveTextContent('Materials');
    expect(table).toHaveTextContent(useCabinetStore.getState().cost.totalCost.toFixed(2));

    await user.click(screen.getByRole('button', { name: 'Export CSV' }));

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(anchor).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:cost-summary');
    expect(downloadedFileName).toBe('cost-summary.csv');
  });
});
