import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GcodePreviewModal } from '../../src/components/optimizer/GcodePreviewModal';
import { makeCutSheet } from '../helpers';

describe('GcodePreviewModal', () => {
  it('applies a machine preset and downloads the regenerated G-code', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onDownload = vi.fn();
    render(
      <GcodePreviewModal sheet={makeCutSheet()} filename="cabinet.nc" onClose={onClose} onDownload={onDownload} />,
    );

    expect(screen.getByRole('img', { name: 'G-code Toolpath Preview' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'CNC Options' }));
    await user.click(screen.getByRole('button', { name: 'Shapeoko 3' }));
    expect(screen.getByRole('spinbutton', { name: 'Feed (mm/min)' })).toHaveValue(2000);

    await user.click(screen.getByRole('button', { name: 'Download' }));
    expect(onDownload).toHaveBeenCalledWith(expect.stringContaining('F2000'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
