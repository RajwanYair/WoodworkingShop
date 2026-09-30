import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SaveLoadPanel } from '../../src/components/configurator/SaveLoadPanel';
import { useCabinetStore } from '../../src/store/cabinet-store';
import { deleteSavedConfig, loadSavedConfigs, saveConfig, type SavedConfig } from '../../src/utils/local-storage';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import * as projectStorage from '../../src/utils/project-storage';
import * as saveLoadJson from '../../src/components/configurator/save-load-json';
import { useToastStore } from '../../src/store/toast-store';

vi.mock('../../src/utils/local-storage', () => ({
  deleteSavedConfig: vi.fn(),
  loadSavedConfigs: vi.fn(),
  saveConfig: vi.fn(),
}));

vi.mock('../../src/utils/project-storage', () => ({
  exportProjectsBundle: vi.fn(),
  importProjectsBundle: vi.fn(),
  listProjects: vi.fn(),
}));

const savedConfig: SavedConfig = {
  id: 'saved-config',
  name: 'Tall Cabinet',
  config: { ...DEFAULT_CONFIG, width: 800 },
  savedAt: '2026-09-29T10:00:00.000Z',
};

describe('SaveLoadPanel', () => {
  beforeEach(() => {
    vi.mocked(loadSavedConfigs).mockResolvedValue([]);
    vi.mocked(saveConfig).mockResolvedValue(savedConfig);
    const config = { ...DEFAULT_CONFIG };
    useCabinetStore.setState({ config, cabinets: [{ name: 'Cabinet 1', config }], activeCabinetIndex: 0 });
  });

  it('loads a saved configuration from the expanded list', async () => {
    vi.mocked(loadSavedConfigs).mockResolvedValue([savedConfig]);
    const user = userEvent.setup();
    render(<SaveLoadPanel />);

    await user.click(screen.getByRole('button', { name: 'My Saved Cabinets' }));
    await screen.findByText('Tall Cabinet');
    await user.click(screen.getByRole('button', { name: 'Load' }));

    expect(useCabinetStore.getState().config.width).toBe(800);
  });

  it('saves with a dimensions-based name when the name field is blank', async () => {
    const user = userEvent.setup();
    render(<SaveLoadPanel />);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    const defaultName = `${DEFAULT_CONFIG.width}×${DEFAULT_CONFIG.height}×${DEFAULT_CONFIG.depth}`;
    await waitFor(() => expect(saveConfig).toHaveBeenCalledWith(defaultName, expect.any(Object)));
  });

  it('deletes a saved configuration and refreshes the expanded list', async () => {
    vi.mocked(loadSavedConfigs).mockResolvedValueOnce([savedConfig]).mockResolvedValueOnce([]);
    vi.mocked(deleteSavedConfig).mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<SaveLoadPanel />);

    await user.click(screen.getByRole('button', { name: 'My Saved Cabinets' }));
    await screen.findByText('Tall Cabinet');
    await user.click(screen.getByTitle('Delete'));

    expect(deleteSavedConfig).toHaveBeenCalledWith('saved-config');
    expect(await screen.findByText('No saved configurations')).toBeInTheDocument();
  });

  it('trims a custom name before saving the current configuration', async () => {
    const user = userEvent.setup();
    render(<SaveLoadPanel />);

    await user.type(screen.getByPlaceholderText('Cabinet name…'), '  Workshop base  ');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(saveConfig).toHaveBeenCalledWith('Workshop base', expect.any(Object)));
  });

  it('exports the currently selected cabinet with its name and dimensions', async () => {
    const user = userEvent.setup();
    const cabinets = [
      { name: 'Base cabinet', config: { ...DEFAULT_CONFIG, width: 600 } },
      { name: 'Wall cabinet', config: { ...DEFAULT_CONFIG, width: 950 } },
    ];
    useCabinetStore.setState({ cabinets, activeCabinetIndex: 1, config: cabinets[1].config });
    const downloadSpy = vi.spyOn(saveLoadJson, 'triggerJsonDownload').mockImplementation(() => {});
    render(<SaveLoadPanel />);

    await user.click(screen.getByRole('button', { name: /Export Cabinet/ }));

    expect(downloadSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        cabinet: expect.objectContaining({
          name: 'Wall cabinet',
          config: expect.objectContaining({ width: 950 }),
        }),
      }),
      'Wall cabinet.cabinet.json',
    );
    downloadSpy.mockRestore();
  });

  it('reports when there are no saved projects available for bundle export', async () => {
    const user = userEvent.setup();
    vi.mocked(projectStorage.listProjects).mockResolvedValue([]);
    useToastStore.setState({ toasts: [] });
    render(<SaveLoadPanel />);

    await user.click(screen.getByRole('button', { name: /Export Saved Projects Bundle/ }));

    await waitFor(() => {
      expect(useToastStore.getState().toasts).toEqual(
        expect.arrayContaining([expect.objectContaining({ message: 'No saved projects to export', type: 'info' })]),
      );
    });
    expect(projectStorage.exportProjectsBundle).not.toHaveBeenCalled();
  });
});
