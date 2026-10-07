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

async function uploadJsonFile(
  user: ReturnType<typeof userEvent.setup>,
  buttonName: RegExp,
  fileName: string,
  contents: string,
) {
  const inputClick = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
  await user.click(screen.getByRole('button', { name: buttonName }));
  const input = inputClick.mock.contexts.find(
    (context): context is HTMLInputElement => context instanceof HTMLInputElement,
  );
  if (!input) throw new Error('Import file input was not opened');
  await user.upload(input, new File([contents], fileName, { type: 'application/json' }));
  return input;
}

describe('SaveLoadPanel', () => {
  beforeEach(() => {
    vi.mocked(loadSavedConfigs).mockResolvedValue([]);
    vi.mocked(saveConfig).mockResolvedValue(savedConfig);
    const config = { ...DEFAULT_CONFIG };
    useCabinetStore.setState({
      config,
      cabinets: [{ name: 'Cabinet 1', config }],
      activeCabinetIndex: 0,
      projectName: '',
      projectNotes: '',
    });
    useToastStore.setState({ toasts: [] });
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

  it('updates the saved-cabinet section expanded state when toggled', async () => {
    const user = userEvent.setup();
    render(<SaveLoadPanel />);
    const toggle = screen.getByRole('button', { name: 'My Saved Cabinets' });

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows success feedback after loading a saved configuration', async () => {
    vi.mocked(loadSavedConfigs).mockResolvedValue([savedConfig]);
    const user = userEvent.setup();
    render(<SaveLoadPanel />);

    await user.click(screen.getByRole('button', { name: 'My Saved Cabinets' }));
    await screen.findByText('Tall Cabinet');
    await user.click(screen.getByRole('button', { name: 'Load' }));

    expect(useToastStore.getState().toasts).toEqual(
      expect.arrayContaining([expect.objectContaining({ message: 'Configuration loaded', type: 'success' })]),
    );
  });

  it('saves the entered name when Enter is pressed', async () => {
    const user = userEvent.setup();
    render(<SaveLoadPanel />);
    const nameInput = screen.getByPlaceholderText('Cabinet name…');
    await user.type(nameInput, 'Entry cabinet{Enter}');

    await waitFor(() => expect(saveConfig).toHaveBeenCalledWith('Entry cabinet', expect.any(Object)));
  });

  it('clears the save name and shows success feedback after saving', async () => {
    const user = userEvent.setup();
    render(<SaveLoadPanel />);
    const nameInput = screen.getByPlaceholderText('Cabinet name…');
    await user.type(nameInput, 'Entry cabinet');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(nameInput).toHaveValue(''));
    expect(useToastStore.getState().toasts).toEqual(
      expect.arrayContaining([expect.objectContaining({ message: 'Configuration saved', type: 'success' })]),
    );
  });

  it('synchronizes and clears the browser title with the project name', async () => {
    const user = userEvent.setup();
    render(<SaveLoadPanel />);
    const projectName = screen.getByRole('textbox', { name: 'Project Name' });

    await user.type(projectName, 'Workshop plan');
    await waitFor(() => expect(document.title).toBe('Workshop plan — WoodworkingShop'));
    await user.clear(projectName);
    await waitFor(() => expect(document.title).toBe('WoodworkingShop'));
  });

  it('updates project notes in the shared project state', async () => {
    const user = userEvent.setup();
    render(<SaveLoadPanel />);
    const notes = screen.getByRole('textbox', { name: 'Project Notes' });
    await user.type(notes, 'Use birch plywood for the shelves');

    expect(useCabinetStore.getState().projectNotes).toBe('Use birch plywood for the shelves');
  });

  it('limits project names and notes to their documented lengths', () => {
    render(<SaveLoadPanel />);

    expect(screen.getByRole('textbox', { name: 'Project Name' })).toHaveAttribute('maxLength', '80');
    expect(screen.getByRole('textbox', { name: 'Project Notes' })).toHaveAttribute('maxLength', '1000');
  });

  it('exports all project cabinets with project name and notes', async () => {
    const user = userEvent.setup();
    const cabinets = [
      { name: 'Base cabinet', config: { ...DEFAULT_CONFIG, width: 600 } },
      { name: 'Wall cabinet', config: { ...DEFAULT_CONFIG, width: 900 } },
    ];
    useCabinetStore.setState({ cabinets, projectName: 'Kitchen plan', projectNotes: 'North wall' });
    const download = vi.spyOn(saveLoadJson, 'triggerJsonDownload').mockImplementation(() => {});
    render(<SaveLoadPanel />);

    await user.click(screen.getByRole('button', { name: /Export Project/ }));

    expect(download).toHaveBeenCalledWith(
      expect.objectContaining({
        projectName: 'Kitchen plan',
        projectNotes: 'North wall',
        cabinets: expect.arrayContaining([
          expect.objectContaining({ name: 'Base cabinet' }),
          expect.objectContaining({ name: 'Wall cabinet' }),
        ]),
      }),
      'Kitchen plan.project.json',
    );
  });

  it('rejects project export when the cabinet list is empty', async () => {
    const user = userEvent.setup();
    useCabinetStore.setState({ cabinets: [] });
    const download = vi.spyOn(saveLoadJson, 'triggerJsonDownload').mockImplementation(() => {});
    render(<SaveLoadPanel />);

    await user.click(screen.getByRole('button', { name: /Export Project/ }));

    expect(download).not.toHaveBeenCalled();
    expect(useToastStore.getState().toasts).toEqual(
      expect.arrayContaining([expect.objectContaining({ message: 'Invalid configuration file', type: 'error' })]),
    );
  });

  it('uses a dimension-based filename when the active cabinet has a blank name', async () => {
    const user = userEvent.setup();
    const config = { ...DEFAULT_CONFIG, width: 777, height: 888, depth: 333 };
    useCabinetStore.setState({ cabinets: [{ name: '   ', config }], config });
    const download = vi.spyOn(saveLoadJson, 'triggerJsonDownload').mockImplementation(() => {});
    render(<SaveLoadPanel />);

    await user.click(screen.getByRole('button', { name: /Export Cabinet/ }));

    expect(download).toHaveBeenCalledWith(expect.any(Object), 'cabinet-777x888x333.cabinet.json');
  });

  it('imports a project with multiple cabinets and metadata', async () => {
    const user = userEvent.setup();
    useToastStore.setState({ toasts: [] });
    render(<SaveLoadPanel />);
    const payload = {
      version: 1,
      projectName: 'Imported kitchen',
      projectNotes: 'Keep the existing handles',
      cabinets: [
        { name: 'Base cabinet', config: { ...DEFAULT_CONFIG, width: 720 } },
        { name: 'Wall cabinet', config: { ...DEFAULT_CONFIG, width: 840 } },
      ],
    };

    await uploadJsonFile(user, /Import JSON/, 'kitchen.project.json', JSON.stringify(payload));

    await waitFor(() => expect(useCabinetStore.getState().cabinets).toHaveLength(2));
    expect(useCabinetStore.getState().config.width).toBe(720);
    expect(useCabinetStore.getState().projectName).toBe('Imported kitchen');
    expect(useCabinetStore.getState().projectNotes).toBe('Keep the existing handles');
    expect(useToastStore.getState().toasts).toEqual(
      expect.arrayContaining([expect.objectContaining({ message: 'Configuration imported', type: 'success' })]),
    );
  });

  it('preserves project metadata when an imported project omits optional fields', async () => {
    const user = userEvent.setup();
    useCabinetStore.setState({ projectName: 'Current project', projectNotes: 'Current notes' });
    render(<SaveLoadPanel />);
    const payload = {
      version: 1,
      cabinets: [{ name: 'Imported cabinet', config: { ...DEFAULT_CONFIG, width: 735 } }],
    };

    await uploadJsonFile(user, /Import JSON/, 'partial.project.json', JSON.stringify(payload));

    await waitFor(() => expect(useCabinetStore.getState().config.width).toBe(735));
    expect(useCabinetStore.getState().projectName).toBe('Current project');
    expect(useCabinetStore.getState().projectNotes).toBe('Current notes');
  });

  it('imports a wrapped single-cabinet export', async () => {
    const user = userEvent.setup();
    render(<SaveLoadPanel />);
    const payload = saveLoadJson.buildCabinetExport({
      name: 'Imported cabinet',
      config: { ...DEFAULT_CONFIG, width: 825 },
    });

    await uploadJsonFile(user, /Import JSON/, 'cabinet.cabinet.json', JSON.stringify(payload));

    await waitFor(() => expect(useCabinetStore.getState().config.width).toBe(825));
    expect(useToastStore.getState().toasts).toEqual(
      expect.arrayContaining([expect.objectContaining({ message: 'Configuration imported', type: 'success' })]),
    );
  });

  it('imports a legacy raw cabinet configuration', async () => {
    const user = userEvent.setup();
    render(<SaveLoadPanel />);
    const config = { ...DEFAULT_CONFIG, width: 860 };

    await uploadJsonFile(user, /Import JSON/, 'legacy.json', JSON.stringify(config));

    await waitFor(() => expect(useCabinetStore.getState().config.width).toBe(860));
  });

  it('clears the JSON file selection after importing a configuration', async () => {
    const user = userEvent.setup();
    render(<SaveLoadPanel />);
    const config = { ...DEFAULT_CONFIG, width: 915 };

    const input = await uploadJsonFile(user, /Import JSON/, 'repeatable.json', JSON.stringify(config));

    await waitFor(() => expect(useCabinetStore.getState().config.width).toBe(915));
    expect(input).toHaveValue('');
  });

  it('reports malformed JSON without changing the current configuration', async () => {
    const user = userEvent.setup();
    const width = useCabinetStore.getState().config.width;
    render(<SaveLoadPanel />);

    await uploadJsonFile(user, /Import JSON/, 'broken.json', '{ invalid json');

    await waitFor(() =>
      expect(useToastStore.getState().toasts).toEqual(
        expect.arrayContaining([expect.objectContaining({ message: 'Invalid configuration file', type: 'error' })]),
      ),
    );
    expect(useCabinetStore.getState().config.width).toBe(width);
  });

  it('rejects an invalid JSON shape without changing the current project', async () => {
    const user = userEvent.setup();
    const width = useCabinetStore.getState().config.width;
    render(<SaveLoadPanel />);

    await uploadJsonFile(user, /Import JSON/, 'invalid.json', JSON.stringify({ version: 1, cabinets: [] }));

    await waitFor(() =>
      expect(useToastStore.getState().toasts).toEqual(
        expect.arrayContaining([expect.objectContaining({ message: 'Invalid configuration file', type: 'error' })]),
      ),
    );
    expect(useCabinetStore.getState().config.width).toBe(width);
  });

  it('uses the native share sheet with project title and current URL', async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, share, clipboard: { writeText } });
    useCabinetStore.setState({ projectName: 'Workshop plan' });
    render(<SaveLoadPanel />);

    await user.click(screen.getByRole('button', { name: 'Share Link' }));

    expect(share).toHaveBeenCalledWith({ title: 'Workshop plan — WoodworkingShop', url: window.location.href });
    expect(writeText).not.toHaveBeenCalled();
  });

  it('falls back to clipboard when the native share sheet is dismissed', async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockRejectedValue(new Error('Share dismissed'));
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, share, clipboard: { writeText } });
    render(<SaveLoadPanel />);

    await user.click(screen.getByRole('button', { name: 'Share Link' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(window.location.href));
    expect(useToastStore.getState().toasts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: 'Shareable link copied to clipboard', type: 'success' }),
      ]),
    );
  });

  it('copies the current URL and confirms when native sharing is unavailable', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    render(<SaveLoadPanel />);

    await user.click(screen.getByRole('button', { name: 'Share Link' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(window.location.href));
    expect(useToastStore.getState().toasts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: 'Shareable link copied to clipboard', type: 'success' }),
      ]),
    );
  });

  it('shows the dedicated failure message when clipboard sharing fails', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockRejectedValue(new Error('Clipboard unavailable'));
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    render(<SaveLoadPanel />);

    await user.click(screen.getByRole('button', { name: 'Share Link' }));

    await waitFor(() =>
      expect(useToastStore.getState().toasts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Could not copy link — please copy the URL from the address bar',
            type: 'error',
          }),
        ]),
      ),
    );
  });

  it('exports available saved projects as a bundle and confirms the count', async () => {
    const user = userEvent.setup();
    const project: projectStorage.SavedProject = {
      id: 'project-1',
      name: 'Kitchen',
      savedAt: '2026-09-30T10:00:00.000Z',
      cabinets: [{ name: 'Base cabinet', config: { ...DEFAULT_CONFIG } }],
    };
    vi.mocked(projectStorage.listProjects).mockResolvedValue([project]);
    vi.mocked(projectStorage.exportProjectsBundle).mockResolvedValue(undefined);
    render(<SaveLoadPanel />);

    await user.click(screen.getByRole('button', { name: /Export Saved Projects Bundle/ }));

    await waitFor(() => expect(projectStorage.exportProjectsBundle).toHaveBeenCalledWith([project]));
    expect(useToastStore.getState().toasts).toEqual(
      expect.arrayContaining([expect.objectContaining({ message: 'Exported 1 project(s)', type: 'success' })]),
    );
  });

  it('opens the bundle file input from the import-bundle action', async () => {
    const user = userEvent.setup();
    const inputClick = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    render(<SaveLoadPanel />);

    await user.click(screen.getByRole('button', { name: /Import Bundle/ }));

    const input = inputClick.mock.contexts.find(
      (context): context is HTMLInputElement => context instanceof HTMLInputElement,
    );
    expect(input?.accept).toBe('.json,.cabinet-projects.json');
  });

  it('imports a saved-project bundle and confirms the imported count', async () => {
    const user = userEvent.setup();
    vi.mocked(projectStorage.importProjectsBundle).mockResolvedValue([
      {
        id: 'imported-1',
        name: 'Imported project',
        savedAt: '2026-09-30T10:00:00.000Z',
        cabinets: [{ name: 'Imported cabinet', config: { ...DEFAULT_CONFIG } }],
      },
      {
        id: 'imported-2',
        name: 'Second project',
        savedAt: '2026-09-30T10:00:00.000Z',
        cabinets: [{ name: 'Second cabinet', config: { ...DEFAULT_CONFIG } }],
      },
    ]);
    render(<SaveLoadPanel />);

    await uploadJsonFile(user, /Import Bundle/, 'projects.cabinet-projects.json', '{"projects":[]}');

    await waitFor(() => expect(projectStorage.importProjectsBundle).toHaveBeenCalledWith(expect.any(File)));
    expect(useToastStore.getState().toasts).toEqual(
      expect.arrayContaining([expect.objectContaining({ message: 'Imported 2 project(s)', type: 'success' })]),
    );
  });

  it('reports a rejected bundle import and clears the selected file', async () => {
    const user = userEvent.setup();
    vi.mocked(projectStorage.importProjectsBundle).mockRejectedValue(new Error('Invalid bundle'));
    render(<SaveLoadPanel />);

    const input = await uploadJsonFile(user, /Import Bundle/, 'broken.cabinet-projects.json', '{ invalid');

    await waitFor(() =>
      expect(useToastStore.getState().toasts).toEqual(
        expect.arrayContaining([expect.objectContaining({ message: 'Invalid configuration file', type: 'error' })]),
      ),
    );
    expect(input).toHaveValue('');
  });
});
