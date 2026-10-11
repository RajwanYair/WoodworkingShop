import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import { generateParts } from '../../src/engine/parts';
import { HardwareTable, PartsTable } from '../../src/components/optimizer/Tables';
import { useCabinetStore } from '../../src/store/cabinet-store';
import { makeHardwareItem } from '../helpers';

describe('PartsTable', () => {
  beforeEach(() => {
    useCabinetStore.setState({ parts: generateParts(DEFAULT_CONFIG) });
  });

  it('filters by material and restores all rows when All materials is selected', async () => {
    const user = userEvent.setup();
    const parts = useCabinetStore.getState().parts;
    const materialKeys = [...new Set(parts.map((part) => part.material))];
    expect(materialKeys.length).toBeGreaterThan(1);

    render(<PartsTable />);
    const table = screen.getByRole('table');
    const filter = screen.getByRole('combobox', { name: 'Filter by material' });
    const chosenMaterial = materialKeys[0];
    const originalRowCount = parts.length;

    await user.selectOptions(filter, chosenMaterial);
    expect(within(table).getAllByRole('row')).toHaveLength(
      parts.filter((part) => part.material === chosenMaterial).length + 1,
    );

    await user.selectOptions(filter, '');
    expect(within(table).getAllByRole('row')).toHaveLength(originalRowCount + 1);
  });

  it('searches part names and sorts dimensions in both directions', async () => {
    const user = userEvent.setup();
    render(<PartsTable />);
    const table = screen.getByRole('table');
    const search = screen.getByRole('searchbox', { name: 'Search parts' });

    await user.type(search, 'Top Panel');
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(within(table).getByText('Top Panel')).toBeInTheDocument();
    await user.clear(search);

    const lengthHeader = screen.getByRole('columnheader', { name: /Length/ });
    const lengthSort = within(lengthHeader).getByRole('button');
    await user.click(lengthSort);
    expect(lengthHeader).toHaveAttribute('aria-sort', 'ascending');

    const ascendingLengths = within(table)
      .getAllByRole('row')
      .slice(1)
      .map((row) => Number(within(row).getAllByRole('cell')[4].textContent));
    expect(ascendingLengths).toEqual([...ascendingLengths].sort((left, right) => left - right));

    await user.click(lengthSort);
    expect(lengthHeader).toHaveAttribute('aria-sort', 'descending');
    const descendingLengths = within(table)
      .getAllByRole('row')
      .slice(1)
      .map((row) => Number(within(row).getAllByRole('cell')[4].textContent));
    expect(descendingLengths).toEqual([...descendingLengths].sort((left, right) => right - left));
  });
});

describe('HardwareTable', () => {
  const hardware = [
    makeHardwareItem({ id: 'H02', name: { en: 'Zinc Screw', he: 'Zinc Screw' }, qty: 4 }),
    makeHardwareItem({
      id: 'H01',
      name: { en: 'Alpha Hinge', he: 'Alpha Hinge' },
      qty: 2,
      supplierName: 'Blum',
      supplierUrl: 'https://example.com/hinge',
    }),
  ];

  beforeEach(() => {
    useCabinetStore.setState({
      hardware: hardware.map((item) => structuredClone(item)),
      hardwareQtyOverrides: {},
    });
  });

  it('searches hardware names and supplier details', async () => {
    const user = userEvent.setup();
    render(<HardwareTable />);
    const table = screen.getByRole('table');
    const search = screen.getByRole('searchbox', { name: 'Search hardware' });

    await user.type(search, 'Blum');
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(within(table).getByText('Alpha Hinge')).toBeInTheDocument();
    expect(within(table).queryByText('Zinc Screw')).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, 'no matching hardware');
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(within(table).getByText('No matching rows')).toBeInTheDocument();
  });

  it('updates and clears a quantity override through the accessible quantity input', async () => {
    const user = userEvent.setup();
    render(<HardwareTable />);
    const quantity = screen.getByRole('spinbutton', { name: 'Quantity for Alpha Hinge' });

    await user.click(quantity);
    await user.keyboard('{Control>}a{/Control}7');
    expect(useCabinetStore.getState().hardwareQtyOverrides.H01).toBe(7);
    expect(quantity).toHaveValue(7);

    await user.click(quantity);
    await user.keyboard('{Control>}a{/Control}2');
    expect(useCabinetStore.getState().hardwareQtyOverrides).not.toHaveProperty('H01');
    expect(quantity).toHaveValue(2);
  });

  it('sorts by effective quantity after a user override', async () => {
    const user = userEvent.setup();
    useCabinetStore.setState({
      hardware: [
        ...hardware.map((item) => structuredClone(item)),
        makeHardwareItem({ id: 'H03', name: { en: 'Maple Pin', he: 'Maple Pin' }, qty: 6 }),
      ],
    });
    render(<HardwareTable />);
    const table = screen.getByRole('table');

    const quantity = screen.getByRole('spinbutton', { name: 'Quantity for Alpha Hinge' });
    await user.click(quantity);
    await user.keyboard('{Control>}a{/Control}9');
    const quantityHeader = screen.getByRole('columnheader', { name: /Qty/ });
    await user.click(within(quantityHeader).getByRole('button'));

    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((row) => Number(within(row).getByRole('spinbutton').getAttribute('value')))).toEqual([4, 6, 9]);
  });
});
