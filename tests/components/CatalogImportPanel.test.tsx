import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogImportPanel } from '../../src/components/configurator/CatalogImportPanel';
import { useCustomMaterialsStore } from '../../src/store/custom-materials-store';

const communityCatalog = {
  schemaVersion: '1.0',
  generatedAt: '2026-09-29T10:00:00.000Z',
  materials: [
    {
      id: 'birch-ply-18',
      name: 'Birch Plywood',
      supplier: 'North Mill',
      pricePerSqM: 24,
      currency: 'USD',
      thickness: 18,
      color: '#d4a86c',
      hasGrain: true,
      submittedAt: '2026-09-29T09:00:00.000Z',
      votes: 4,
    },
  ],
};

describe('CatalogImportPanel', () => {
  beforeEach(() => {
    useCustomMaterialsStore.setState({ materials: [] });
  });

  it('previews a fetched catalog and adds the selected material to the library', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(communityCatalog))));
    render(<CatalogImportPanel />);

    await user.type(screen.getByLabelText('Catalog URL'), 'https://example.test/catalog.json');
    await user.click(screen.getByRole('button', { name: 'Import' }));

    const materialCheckbox = await screen.findByRole('checkbox', { name: /birch plywood/i });
    expect(materialCheckbox).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Add selected to my materials' }));

    expect(useCustomMaterialsStore.getState().materials).toMatchObject([
      { key: 'cat-birch-ply-18', name: { en: 'Birch Plywood' }, thickness: 18, category: 'panel' },
    ]);
    expect(await screen.findByText('1 material added')).toBeInTheDocument();
  });

  it('shows a fetch error without changing the existing materials', async () => {
    const user = userEvent.setup();
    const existingMaterial = {
      key: 'existing-ply',
      name: { en: 'Existing Ply', he: 'Existing Ply' },
      thickness: 18,
      sheetWidth: 1220,
      sheetLength: 2440,
      pricePerSheet: 100,
      category: 'panel' as const,
      color: '#c8a86b',
      hasGrain: false,
      densityKgM3: 680,
    };
    useCustomMaterialsStore.setState({ materials: [existingMaterial] });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    render(<CatalogImportPanel />);

    await user.type(screen.getByLabelText('Catalog URL'), 'https://example.test/catalog.json');
    await user.click(screen.getByRole('button', { name: 'Import' }));

    expect(
      await screen.findByText(/Failed to fetch catalog: Network error fetching catalog: offline/),
    ).toBeInTheDocument();
    expect(useCustomMaterialsStore.getState().materials).toEqual([existingMaterial]);
  });
});
