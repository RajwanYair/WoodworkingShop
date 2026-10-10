import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { HardwareCatalogImportPanel } from '../../src/components/configurator/HardwareCatalogImportPanel';
import { HARDWARE_CATALOG_SCHEMA_VERSION, type HardwareItem } from '../../src/engine/hardware-catalog';
import { useCustomHardwareStore } from '../../src/store/custom-hardware-store';

const existingHardware: HardwareItem = {
  id: 'existing-handle',
  name: 'Existing Handle',
  category: 'handle',
  sku: 'OLD-01',
  manufacturer: 'Wood Shop',
  unitPrice: 2,
  packSize: 1,
  description: 'Existing pull',
  tags: [],
};

const importedHardware: HardwareItem = {
  id: 'new-hinge',
  name: 'Soft-Close Hinge',
  category: 'hinge',
  sku: 'HINGE-01',
  manufacturer: 'Workshop Supply',
  unitPrice: 3.5,
  packSize: 2,
  description: 'Compact hinge',
  tags: ['soft-close'],
};

describe('HardwareCatalogImportPanel', () => {
  beforeEach(() => {
    useCustomHardwareStore.setState({ items: [existingHardware] });
  });

  it('previews and replaces the catalog only after validating a JSON file', async () => {
    const user = userEvent.setup();
    render(<HardwareCatalogImportPanel />);

    const file = new File(
      [JSON.stringify({ schemaVersion: HARDWARE_CATALOG_SCHEMA_VERSION, items: [importedHardware] })],
      'hardware.json',
      { type: 'application/json' },
    );
    await user.upload(screen.getByLabelText('Catalog JSON file'), file);

    expect(await screen.findByText('Soft-Close Hinge')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /replace all custom hardware/i }));
    await user.click(screen.getByRole('button', { name: 'Import catalog' }));

    expect(useCustomHardwareStore.getState().items).toEqual([importedHardware]);
    expect(await screen.findByText('1 hardware items imported.')).toBeInTheDocument();
  });

  it('rejects malformed catalog files and leaves stored hardware unchanged', async () => {
    const user = userEvent.setup();
    render(<HardwareCatalogImportPanel />);

    const file = new File(
      [
        JSON.stringify({
          schemaVersion: HARDWARE_CATALOG_SCHEMA_VERSION,
          items: [{ ...importedHardware, packSize: 0 }],
        }),
      ],
      'invalid-hardware.json',
      { type: 'application/json' },
    );
    await user.upload(screen.getByLabelText('Catalog JSON file'), file);

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid hardware item at index 0');
    expect(useCustomHardwareStore.getState().items).toEqual([existingHardware]);
  });

  it('cancels a validated catalog preview without changing stored hardware', async () => {
    const user = userEvent.setup();
    render(<HardwareCatalogImportPanel />);

    const file = new File(
      [JSON.stringify({ schemaVersion: HARDWARE_CATALOG_SCHEMA_VERSION, items: [importedHardware] })],
      'hardware.json',
      { type: 'application/json' },
    );
    await user.upload(screen.getByLabelText('Catalog JSON file'), file);

    expect(await screen.findByText('Soft-Close Hinge')).toBeInTheDocument();
    expect(useCustomHardwareStore.getState().items).toEqual([existingHardware]);
    await user.click(screen.getByRole('button', { name: 'Cancel import' }));

    expect(screen.queryByText('Soft-Close Hinge')).not.toBeInTheDocument();
    expect(useCustomHardwareStore.getState().items).toEqual([existingHardware]);
  });
});
