import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import { ProjectManagerModal } from '../../src/components/layout/ProjectManagerModal';
import { useCabinetStore } from '../../src/store/cabinet-store';
import {
  importProjectJson,
  listProjects,
  previewProjectJson,
  saveProject,
  type SavedProject,
} from '../../src/utils/project-storage';

vi.mock('../../src/utils/project-storage', () => ({
  deleteProject: vi.fn(),
  exportProjectJson: vi.fn(),
  importProjectJson: vi.fn(),
  listProjects: vi.fn(),
  previewProjectJson: vi.fn(),
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
    vi.mocked(saveProject).mockResolvedValue(projects[0]);
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

  it('previews an imported project without persisting it until confirmation', async () => {
    const user = userEvent.setup();
    const importedProject: SavedProject = {
      id: 'preview-project',
      name: 'Imported Workshop',
      savedAt: '2026-09-30T10:00:00.000Z',
      cabinets: [{ name: 'Imported Cabinet', config: { ...DEFAULT_CONFIG } }],
    };
    vi.mocked(importProjectJson).mockResolvedValue(importedProject);
    vi.mocked(previewProjectJson).mockResolvedValue(importedProject);
    render(<ProjectManagerModal onClose={vi.fn()} />);

    await user.upload(
      screen.getByLabelText('Import JSON'),
      new File([JSON.stringify(importedProject)], 'workshop.json', { type: 'application/json' }),
    );

    expect(await screen.findByText('Imported Workshop')).toBeInTheDocument();
    expect(importProjectJson).not.toHaveBeenCalled();
    expect(useCabinetStore.getState().projectName).toBe('Current Workshop');
    expect(useCabinetStore.getState().cabinets[0].name).toBe('Current Cabinet');

    await user.click(screen.getByRole('button', { name: 'Cancel import' }));
    expect(importProjectJson).not.toHaveBeenCalled();
    expect(screen.queryByText('Imported Workshop')).not.toBeInTheDocument();

    await user.upload(
      screen.getByLabelText('Import JSON'),
      new File([JSON.stringify(importedProject)], 'workshop.json', { type: 'application/json' }),
    );
    await user.click(screen.getByRole('button', { name: 'Confirm import' }));
    await waitFor(() => expect(importProjectJson).toHaveBeenCalledWith(expect.any(File)));
  });
});
