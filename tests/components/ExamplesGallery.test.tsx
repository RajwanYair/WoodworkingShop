import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/engine/materials/materials';
import { ExamplesGallery } from '../../src/features/workspace/ExamplesGallery';
import { EXAMPLE_PROJECTS } from '../../src/engine/project/examples';
import { useCabinetStore } from '../../src/store/cabinet-store';

describe('ExamplesGallery', () => {
  it('lists every example project by its translated name', () => {
    render(<ExamplesGallery onClose={() => {}} />);
    expect(screen.getByText('Kitchen Base Run')).toBeInTheDocument();
    expect(screen.getByText('Workshop Storage')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Use this example:/ })).toHaveLength(EXAMPLE_PROJECTS.length);
  });

  it('loads the selected example into the store and closes the gallery', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const config = { ...DEFAULT_CONFIG };
    useCabinetStore.setState({
      projectName: 'Current Workshop',
      cabinets: [{ name: 'Current Cabinet', config }],
      activeCabinetIndex: 0,
      config,
    });

    render(<ExamplesGallery onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Use this example: Wardrobe' }));

    expect(useCabinetStore.getState().cabinets).toHaveLength(1);
    expect(useCabinetStore.getState().cabinets[0].name).toBe('Wardrobe');
    expect(useCabinetStore.getState().projectName).toBe('Wardrobe');
    expect(onClose).toHaveBeenCalledOnce();
  });
});
