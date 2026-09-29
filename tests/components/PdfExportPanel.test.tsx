import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { pdfMock } = vi.hoisted(() => ({
  pdfMock: vi.fn(() => ({ toBlob: vi.fn().mockResolvedValue(new Blob(['pdf'])) })),
}));

vi.mock('@react-pdf/renderer', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@react-pdf/renderer')>()),
  pdf: pdfMock,
}));

import { PdfExportPanel } from '../../src/components/pdf/PdfExportPanel';

describe('PdfExportPanel', () => {
  beforeEach(() => {
    pdfMock.mockClear();
  });

  it('passes selected page options to the PDF document and downloads the result', async () => {
    const user = userEvent.setup();
    let downloadedFileName = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloadedFileName = this.download;
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:pdf-export');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    render(<PdfExportPanel />);

    await user.click(screen.getByRole('checkbox', { name: 'Include cover page' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Page size' }), 'LETTER');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Orientation' }), 'landscape');
    await user.click(screen.getByRole('button', { name: 'Generate PDF' }));

    expect(pdfMock).toHaveBeenCalledWith(
      expect.objectContaining({
        props: expect.objectContaining({ includeCover: false, pageSize: 'LETTER', orientation: 'landscape' }),
      }),
    );
    expect(downloadedFileName).toMatch(/\.pdf$/);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:pdf-export');
  });
});
