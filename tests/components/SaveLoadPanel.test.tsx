import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SaveLoadPanel } from '../../src/components/configurator/SaveLoadPanel';
import { useCabinetStore } from '../../src/store/cabinet-store';
import { loadSavedConfigs, saveConfig, type SavedConfig } from '../../src/utils/local-storage';
import { DEFAULT_CONFIG } from '../../src/engine/materials';

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
});
