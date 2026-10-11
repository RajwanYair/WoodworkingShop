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

  it('sums actual area when grouped sheets have different dimensions', () => {
    render(
      <MaterialSummaryPanel
        sheets={[makeCutSheet(), makeCutSheet({ sheetIndex: 1, sheetWidth: 1220, sheetLength: 610 })]}
        materialPriceOverrides={{}}
        sheetSizeOverrides={{}}
        setSheetSizeOverride={vi.fn()}
        t={translate}
        lang="en"
      />,
    );

    expect(within(screen.getByRole('table')).getByText('3.72 m²')).toBeInTheDocument();
  });

  it('keeps sheets with the same material but different thicknesses in separate rows', () => {
    render(
      <MaterialSummaryPanel
        sheets={[makeCutSheet(), makeCutSheet({ sheetIndex: 1, thickness: 16 })]}
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
    expect(rows[2]).toHaveTextContent('Melamine 18 mm 16 mm');
  });

  it('applies price overrides independently to each material row', () => {
    render(
      <MaterialSummaryPanel
        sheets={[makeCutSheet(), makeCutSheet({ sheetIndex: 1, material: 'plywood-18' })]}
        materialPriceOverrides={{ 'melamine-18': 90, 'plywood-18': 120 }}
        sheetSizeOverrides={{}}
        setSheetSizeOverride={vi.fn()}
        t={translate}
        lang="en"
      />,
    );

    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(within(rows[1]!).getByText('₪90')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('₪120')).toBeInTheDocument();
  });

  it('uses the catalog price when no material override is present', () => {
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

    expect(within(screen.getByRole('table')).getByText('₪165')).toBeInTheDocument();
  });

  it('renders the selected locale for each material name', () => {
    render(
      <MaterialSummaryPanel
        sheets={[makeCutSheet()]}
        materialPriceOverrides={{}}
        sheetSizeOverrides={{}}
        setSheetSizeOverride={vi.fn()}
        t={translate}
        lang="he"
      />,
    );

    expect(within(screen.getByRole('table')).getByText(/מלמין 18 מ"מ/)).toBeInTheDocument();
  });

  it('shows the catalog sheet dimensions when no override exists', () => {
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

    expect(within(screen.getByRole('table')).getByText('1220×2440')).toBeInTheDocument();
  });

  it('displays an existing sheet-size override in the summary row', () => {
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

    expect(within(screen.getByRole('table')).getByText('1300×2500')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset to default size' })).toBeInTheDocument();
  });

  it('resets an existing sheet-size override to the catalog default', async () => {
    const user = userEvent.setup();
    const setSheetSizeOverride = vi.fn();
    render(
      <MaterialSummaryPanel
        sheets={[makeCutSheet()]}
        materialPriceOverrides={{}}
        sheetSizeOverrides={{ 'melamine-18': { width: 1300, length: 2500 } }}
        setSheetSizeOverride={setSheetSizeOverride}
        t={translate}
        lang="en"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Reset to default size' }));

    expect(setSheetSizeOverride).toHaveBeenCalledWith('melamine-18', null);
  });

  it('opens a new edit with the catalog sheet dimensions', async () => {
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

    await user.click(screen.getByRole('button', { name: 'Override sheet size' }));

    expect(screen.getByRole('spinbutton', { name: 'Sheet width mm' })).toHaveValue(1220);
    expect(screen.getByRole('spinbutton', { name: 'Sheet length mm' })).toHaveValue(2440);
  });

  it('applies a sheet-size edit to the selected material row only', async () => {
    const user = userEvent.setup();
    const setSheetSizeOverride = vi.fn();
    render(
      <MaterialSummaryPanel
        sheets={[makeCutSheet(), makeCutSheet({ sheetIndex: 1, material: 'plywood-18' })]}
        materialPriceOverrides={{}}
        sheetSizeOverrides={{}}
        setSheetSizeOverride={setSheetSizeOverride}
        t={translate}
        lang="en"
      />,
    );
    const plywoodRow = within(screen.getByRole('table')).getByRole('row', { name: /Birch Plywood 18 mm/ });

    await user.click(within(plywoodRow).getByRole('button', { name: 'Override sheet size' }));
    await user.clear(screen.getByRole('spinbutton', { name: 'Sheet width mm' }));
    await user.type(screen.getByRole('spinbutton', { name: 'Sheet width mm' }), '1300');
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(setSheetSizeOverride).toHaveBeenCalledWith('plywood-18', { width: 1300, length: 2440 });
  });

  it.each([
    { dimension: 'width', inputName: 'Sheet width mm' },
    { dimension: 'length', inputName: 'Sheet length mm' },
  ])('rejects an empty sheet $dimension when applying an override', async ({ inputName }) => {
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
    await user.clear(screen.getByRole('spinbutton', { name: inputName }));
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(setSheetSizeOverride).not.toHaveBeenCalled();
  });

  it.each([
    { dimension: 'width', inputName: 'Sheet width mm', value: '100' },
    { dimension: 'width', inputName: 'Sheet width mm', value: '5000' },
    { dimension: 'length', inputName: 'Sheet length mm', value: '100' },
    { dimension: 'length', inputName: 'Sheet length mm', value: '5000' },
  ])('accepts the $dimension boundary value $value mm', async ({ inputName, value }) => {
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
    const width = screen.getByRole('spinbutton', { name: 'Sheet width mm' });
    const length = screen.getByRole('spinbutton', { name: 'Sheet length mm' });
    const input = inputName === 'Sheet width mm' ? width : length;
    await user.clear(input);
    await user.type(input, value);
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(setSheetSizeOverride).toHaveBeenCalledWith('melamine-18', {
      width: inputName === 'Sheet width mm' ? Number(value) : 1220,
      length: inputName === 'Sheet length mm' ? Number(value) : 2440,
    });
  });

  it('accepts fractional dimensions within the supported range', async () => {
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
    const width = screen.getByRole('spinbutton', { name: 'Sheet width mm' });
    const length = screen.getByRole('spinbutton', { name: 'Sheet length mm' });
    await user.clear(width);
    await user.type(width, '1220.5');
    await user.clear(length);
    await user.type(length, '2440.5');
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(setSheetSizeOverride).toHaveBeenCalledWith('melamine-18', { width: 1220.5, length: 2440.5 });
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

  it.each([
    { dimension: 'width', value: '99' },
    { dimension: 'width', value: '5001' },
    { dimension: 'width', value: '1' },
    { dimension: 'width', value: '-1' },
    { dimension: 'length', value: '99' },
    { dimension: 'length', value: '5001' },
    { dimension: 'length', value: '1' },
    { dimension: 'length', value: '-1' },
  ])('rejects sheet $dimension $value outside the supported range', async ({ dimension, value }) => {
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
    const inputName = dimension === 'width' ? 'Sheet width mm' : 'Sheet length mm';
    const input = screen.getByRole('spinbutton', { name: inputName });
    await user.clear(input);
    await user.type(input, value);
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(setSheetSizeOverride).not.toHaveBeenCalled();
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
