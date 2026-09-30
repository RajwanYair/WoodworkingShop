import { render, screen, within } from '@testing-library/react';
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
  it('groups sheets with the same material and thickness into one quantity row', () => {
    render(
      <MaterialSummaryPanel
        sheets={[makeCutSheet(), makeCutSheet({ sheetIndex: 1 })]}
        materialPriceOverrides={{}}
        sheetSizeOverrides={{}}
        setSheetSizeOverride={vi.fn()}
        t={translate}
        lang="en"
      />,
    );

    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows).toHaveLength(2);
    expect(rows[1]).toHaveTextContent('×2');
  });

  it('keeps different materials in separate summary rows', () => {
    render(
      <MaterialSummaryPanel
        sheets={[makeCutSheet(), makeCutSheet({ sheetIndex: 1, material: 'plywood-18' })]}
        materialPriceOverrides={{}}
        sheetSizeOverrides={{}}
        setSheetSizeOverride={vi.fn()}
        t={translate}
        lang="en"
      />,
    );

    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent('Melamine 18 mm');
    expect(rows[2]).toHaveTextContent('Birch Plywood 18 mm');
  });

  it('uses an overridden price when calculating grouped material cost', () => {
    render(
      <MaterialSummaryPanel
        sheets={[makeCutSheet(), makeCutSheet({ sheetIndex: 1 })]}
        materialPriceOverrides={{ 'melamine-18': 210 }}
        sheetSizeOverrides={{}}
        setSheetSizeOverride={vi.fn()}
        t={translate}
        lang="en"
      />,
    );

    expect(within(screen.getByRole('table')).getByText('₪420')).toBeInTheDocument();
  });

  it('shows no estimated cost when the overridden material price is zero', () => {
    render(
      <MaterialSummaryPanel
        sheets={[makeCutSheet()]}
        materialPriceOverrides={{ 'melamine-18': 0 }}
        sheetSizeOverrides={{}}
        setSheetSizeOverride={vi.fn()}
        t={translate}
        lang="en"
      />,
    );

    expect(within(screen.getByRole('table')).getByText('—')).toBeInTheDocument();
  });

  it('renders nothing when there are no cut sheets', () => {
    const { container } = render(
      <MaterialSummaryPanel
        sheets={[]}
        materialPriceOverrides={{}}
        sheetSizeOverrides={{}}
        setSheetSizeOverride={vi.fn()}
        t={translate}
        lang="en"
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('collapses and reopens the material table', async () => {
    const user = userEvent.setup();
    render(
      <MaterialSummaryPanel
        sheets={[makeCutSheet()]}
        materialPriceOverrides={{}}
        sheetSizeOverrides={{}}
        setSheetSizeOverride={vi.fn()}
        t={translate}
        lang="en"
      />,
    );

    const toggle = screen.getByRole('button', { name: /Material Usage Summary/ });
    await user.click(toggle);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    await user.click(toggle);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('opens the size editor with the saved override dimensions', async () => {
    const user = userEvent.setup();
    render(
      <MaterialSummaryPanel
        sheets={[makeCutSheet()]}
        materialPriceOverrides={{}}
        sheetSizeOverrides={{ 'melamine-18': { width: 1300, length: 2500 } }}
        setSheetSizeOverride={vi.fn()}
        t={translate}
        lang="en"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Override sheet size' }));
    expect(screen.getByRole('spinbutton', { name: 'Sheet width mm' })).toHaveValue(1300);
    expect(screen.getByRole('spinbutton', { name: 'Sheet length mm' })).toHaveValue(2500);
  });

  it('cancels a sheet-size edit without changing the override', async () => {
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

    await user.click(screen.getByRole('button', { name: 'Override sheet size' }));
    await user.clear(screen.getByRole('spinbutton', { name: 'Sheet width mm' }));
    await user.type(screen.getByRole('spinbutton', { name: 'Sheet width mm' }), '1300');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(setSheetSizeOverride).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Override sheet size' })).toBeInTheDocument();
  });

  it('rejects a zero sheet width when applying an override', async () => {
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

    await user.click(screen.getByRole('button', { name: 'Override sheet size' }));
    await user.clear(screen.getByRole('spinbutton', { name: 'Sheet width mm' }));
    await user.type(screen.getByRole('spinbutton', { name: 'Sheet width mm' }), '0');
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(setSheetSizeOverride).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Override sheet size' })).toBeInTheDocument();
  });

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
