import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/engine/materials/materials';
import { ToastContainer } from '../../src/app/ToastContainer';
import { WorkspaceHome } from '../../src/features/workspace/WorkspaceHome';
import { useCabinetStore } from '../../src/store/cabinet-store';
import { dispatchBrowserEvent } from '../../src/store/platform-boundary';
import { useToastStore } from '../../src/store/toast-store';
import {
  deleteProject,
  duplicateProject,
  exportProjectsBundle,
  listProjects,
  restoreProject,
  type SavedProject,
} from '../../src/utils/project-storage';

vi.mock('../../src/utils/project-storage', () => ({
  deleteProject: vi.fn(),
  duplicateProject: vi.fn(),
  exportProjectsBundle: vi.fn(),
  listProjects: vi.fn(),
  restoreProject: vi.fn(),
}));

const projects: SavedProject[] = [
  {
    id: 'project-alpha',
    name: 'Alpha Workshop',
    savedAt: '2026-09-29T10:00:00.000Z',
    cabinets: [{ name: 'Alpha Cabinet', config: { ...DEFAULT_CONFIG } }],
  },
  {
    id: 'project-zulu',
    name: 'Zulu Workshop',
    savedAt: '2026-09-29T11:00:00.000Z',
    cabinets: [{ name: 'Zulu Cabinet', config: { ...DEFAULT_CONFIG } }],
  },
];

function renderWorkspaceHome() {
  const onOpenExamples = vi.fn();
  const onOpenProjects = vi.fn();
  const onOpenTemplates = vi.fn();
  render(
    <>
      <WorkspaceHome
        onOpenExamples={onOpenExamples}
        onOpenProjects={onOpenProjects}
        onOpenTemplates={onOpenTemplates}
      />
      <ToastContainer />
    </>,
  );
  return { onOpenExamples, onOpenProjects, onOpenTemplates };
}

describe('WorkspaceHome', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listProjects).mockResolvedValue(projects);
    vi.mocked(deleteProject).mockResolvedValue(undefined);
    vi.mocked(duplicateProject).mockResolvedValue(projects[0]);
    vi.mocked(exportProjectsBundle).mockResolvedValue(undefined);
    vi.mocked(restoreProject).mockResolvedValue(undefined);
    useToastStore.setState({ toasts: [] });
    useCabinetStore.setState({
      projectName: 'Current Workshop',
      cabinets: [{ name: 'Current Cabinet', config: { ...DEFAULT_CONFIG } }],
      activeCabinetIndex: 0,
      activeTab: 'workspace',
      config: { ...DEFAULT_CONFIG },
    });
  });

  it('opens the most recent project and exposes the remaining projects', async () => {
    const user = userEvent.setup();
    renderWorkspaceHome();

    await user.click(await screen.findByRole('button', { name: 'Open Alpha Workshop' }));

    expect(useCabinetStore.getState().projectName).toBe('Alpha Workshop');
    expect(useCabinetStore.getState().cabinets[0].name).toBe('Alpha Cabinet');
    expect(useCabinetStore.getState().activeTab).toBe('configurator');
    expect(screen.getByRole('button', { name: 'Continue Zulu Workshop' })).toBeInTheDocument();
  });

  it('filters projects by name', async () => {
    const user = userEvent.setup();
    renderWorkspaceHome();
    const search = await screen.findByRole('searchbox', { name: 'Search projects…' });

    await user.type(search, 'Alpha');

    expect(screen.getByText('Alpha Workshop')).toBeInTheDocument();
    expect(screen.queryByText('Zulu Workshop')).not.toBeInTheDocument();
  });

  it('refreshes when another project workflow changes saved projects', async () => {
    renderWorkspaceHome();
    await screen.findByRole('button', { name: 'Continue Zulu Workshop' });
    const addedProject: SavedProject = {
      id: 'project-bravo',
      name: 'Bravo Workshop',
      savedAt: '2026-09-29T12:00:00.000Z',
      cabinets: [{ name: 'Bravo Cabinet', config: { ...DEFAULT_CONFIG } }],
    };
    vi.mocked(listProjects).mockResolvedValue([...projects, addedProject]);

    dispatchBrowserEvent('projects:changed');

    expect(await screen.findByRole('button', { name: 'Continue Bravo Workshop' })).toBeInTheDocument();
  });

  it('shows storage health and exports a backup of all saved projects', async () => {
    const user = userEvent.setup();
    renderWorkspaceHome();

    expect(await screen.findByRole('status', { name: /Storage usage is unavailable/i })).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Export backup' }));

    await waitFor(() => expect(exportProjectsBundle).toHaveBeenCalledWith(projects));
    expect(await screen.findByText('Exported 2 project(s)')).toBeInTheDocument();
  });

  it('disables backup export when there are no saved projects', async () => {
    vi.mocked(listProjects).mockResolvedValueOnce([]);
    renderWorkspaceHome();

    expect(await screen.findByRole('button', { name: 'Export backup' })).toBeDisabled();
  });

  it('surfaces backup export failures', async () => {
    vi.mocked(listProjects)
      .mockResolvedValueOnce(projects)
      .mockRejectedValueOnce(new Error('backup source unavailable'));
    renderWorkspaceHome();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Export backup' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not complete the project action: backup source unavailable',
    );
  });

  it('duplicates a project and offers an undo after deletion', async () => {
    const user = userEvent.setup();
    renderWorkspaceHome();
    await screen.findByRole('button', { name: 'Duplicate Alpha Workshop' });

    await user.click(screen.getByRole('button', { name: 'Duplicate Alpha Workshop' }));
    await waitFor(() => expect(duplicateProject).toHaveBeenCalledWith('project-alpha'));
    await user.click(screen.getByRole('button', { name: 'Delete Alpha Workshop' }));
    await waitFor(() => expect(deleteProject).toHaveBeenCalledWith('project-alpha'));

    await user.click(screen.getByRole('button', { name: 'Undo' }));

    expect(restoreProject).toHaveBeenCalledWith(projects[0]);
    expect(await screen.findByText('Project restored')).toBeInTheDocument();
  });

  it('opens the existing examples, template, and project-manager flows', async () => {
    const user = userEvent.setup();
    const { onOpenExamples, onOpenTemplates } = renderWorkspaceHome();
    await screen.findByRole('button', { name: 'Continue Zulu Workshop' });

    await user.click(screen.getByRole('button', { name: 'Browse examples' }));
    await user.click(screen.getByRole('button', { name: 'Choose a template' }));

    expect(onOpenExamples).toHaveBeenCalledOnce();
    expect(onOpenTemplates).toHaveBeenCalledOnce();
  });

  it('surfaces saved-project loading errors', async () => {
    vi.mocked(listProjects).mockRejectedValueOnce(new Error('project storage unavailable'));
    renderWorkspaceHome();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not complete the project action: project storage unavailable',
    );
  });
});
