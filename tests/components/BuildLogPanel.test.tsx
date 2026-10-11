import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { BuildLogPanel } from '../../src/components/assembly/BuildLogPanel';
import { useCabinetStore } from '../../src/store/cabinet-store';

describe('BuildLogPanel', () => {
  beforeEach(() => {
    useCabinetStore.getState().clearBuildLog();
  });

  it('saves notes with Ctrl+Enter, returns focus, and clears the log', async () => {
    const user = userEvent.setup();
    render(<BuildLogPanel />);

    await user.click(screen.getByRole('button', { name: /Build Log/ }));
    expect(screen.getByText('No notes yet. Log steps, adjustments, or observations.')).toBeInTheDocument();

    const editor = screen.getByRole('textbox', { name: 'Add a build note…' });
    await user.type(editor, 'Hinges aligned');
    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(useCabinetStore.getState().buildLog.map((entry) => entry.text)).toEqual(['Hinges aligned']);
    expect(editor).toHaveValue('');
    expect(editor).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Clear all entries' }));
    expect(useCabinetStore.getState().buildLog).toEqual([]);
    expect(screen.getByText('No notes yet. Log steps, adjustments, or observations.')).toBeInTheDocument();
  });
});
