import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MaterialSummaryPanel } from '../../src/components/optimizer/optimizer-material-summary-panel';
import { makeCutSheet } from '../helpers';

const labels: Record<string, string> = {
  'optimizer.materialSummary': 'Material Usage Summary',
  'optimizer.materialSummaryMaterial': 'Material',
  'optimizer.materialSummarySheets': 'Sheets',
  'optimizer.materialSummaryArea': 'Total Area',
  'optimizer.materialSummaryCost': 'Est. Cost',
  'optimizer.sheetSize': 'Sheet Size (mm)',
  'optimizer.sheetSizeEdit': 'Override sheet size',
  'optimizer.sheetSizeReset': 'Reset to default size',
  'optimizer.apply': 'Apply',
  'common.cancel': 'Cancel',
};

const translate = (key: string) => labels[key] ?? key;

describe('MaterialSummaryPanel', () => {
  it('edits and resets a material sheet-size override', async () => {
    const user = userEvent.setup();
    const setSheetSizeOverride = vi.fn();
    render(
      <MaterialSummaryPanel
        sheets={[makeCutSheet()]}
        materialPriceOverrides={{}}
        sheetSizeOverrides={{}}
        setSheetSizeOverride={setSheetSizeOverride}
        t={translate}
        lang="en"
      />,
    );

    expect(screen.getByRole('table')).toHaveTextContent('×1');
    await user.click(screen.getByRole('button', { name: 'Override sheet size' }));
    const width = screen.getByRole('spinbutton', { name: 'Sheet width mm' });
    const length = screen.getByRole('spinbutton', { name: 'Sheet length mm' });
    await user.clear(width);
    await user.type(width, '1300');
    await user.clear(length);
    await user.type(length, '2500');
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(setSheetSizeOverride).toHaveBeenCalledWith('melamine-18', { width: 1300, length: 2500 });
  });
});
