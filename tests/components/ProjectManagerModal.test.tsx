import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/engine/materials/materials';
import { ToastContainer } from '../../src/app/ToastContainer';
import { ProjectManagerModal } from '../../src/features/workspace/ProjectManagerModal';
import { useCabinetStore } from '../../src/store/cabinet-store';
import { useToastStore } from '../../src/store/toast-store';
import {
  deleteProject,
  listProjects,
  restoreProject,
  saveProject,
  type SavedProject,
} from '../../src/utils/project-storage';

vi.mock('../../src/utils/project-storage', () => ({
  deleteProject: vi.fn(),
  exportProjectJson: vi.fn(),
  importProjectJson: vi.fn(),
  listProjects: vi.fn(),
  restoreProject: vi.fn(),
  saveProject: vi.fn(),
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

describe('ProjectManagerModal', () => {
  beforeEach(() => {
    vi.mocked(listProjects).mockResolvedValue(projects);
    vi.mocked(deleteProject).mockResolvedValue(undefined);
    vi.mocked(restoreProject).mockResolvedValue(undefined);
    vi.mocked(saveProject).mockResolvedValue(projects[0]);
    useToastStore.setState({ toasts: [] });
    const config = { ...DEFAULT_CONFIG };
    useCabinetStore.setState({
      projectName: 'Current Workshop',
      cabinets: [{ name: 'Current Cabinet', config }],
      activeCabinetIndex: 0,
      config,
    });
  });

  it('filters saved projects and loads the selected project', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ProjectManagerModal onClose={onClose} />);

    await screen.findByText('Alpha Workshop');
    const search = screen.getByRole('searchbox', { name: /search projects/i });
    await user.type(search, 'Alpha');

    expect(screen.getByText('Alpha Workshop')).toBeInTheDocument();
    expect(screen.queryByText('Zulu Workshop')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Load' }));

    expect(useCabinetStore.getState().projectName).toBe('Alpha Workshop');
    expect(useCabinetStore.getState().cabinets[0].name).toBe('Alpha Cabinet');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('saves the current cabinet under the edited project name', async () => {
    const user = userEvent.setup();
    render(<ProjectManagerModal onClose={vi.fn()} />);

    const nameInput = screen.getByPlaceholderText('Project name…');
    await user.clear(nameInput);
    await user.type(nameInput, 'New Workshop');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(saveProject).toHaveBeenCalledWith('New Workshop', expect.any(Array)));
    expect(useCabinetStore.getState().projectName).toBe('New Workshop');
  });

  it('offers a direct save action when no projects exist', async () => {
    const user = userEvent.setup();
    vi.mocked(listProjects).mockResolvedValueOnce([]);
    render(<ProjectManagerModal onClose={vi.fn()} />);

    const saveAction = await screen.findByRole('button', { name: 'Save current project' });
    await user.click(saveAction);
    expect(screen.getByPlaceholderText('Project name…')).toHaveFocus();
  });

  it('clears the project filter from the no-results state', async () => {
    const user = userEvent.setup();
    render(<ProjectManagerModal onClose={vi.fn()} />);
    const search = screen.getByRole('searchbox', { name: /search projects/i });
    await user.type(search, 'missing');

    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(search).toHaveValue('');
    expect(await screen.findByText('Alpha Workshop')).toBeInTheDocument();
  });

  it('offers an undo action after deleting a saved project', async () => {
    const user = userEvent.setup();
    vi.mocked(listProjects).mockResolvedValueOnce([projects[0]]);
    render(
      <>
        <ProjectManagerModal onClose={vi.fn()} />
        <ToastContainer />
      </>,
    );
    await screen.findByText('Alpha Workshop');

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(deleteProject).toHaveBeenCalledWith('project-alpha'));
    await user.click(await screen.findByRole('button', { name: 'Undo' }));

    expect(restoreProject).toHaveBeenCalledWith(projects[0]);
    expect(await screen.findByText('Project restored')).toBeInTheDocument();
  });
});
