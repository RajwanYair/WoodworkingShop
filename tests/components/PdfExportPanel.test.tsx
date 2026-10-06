import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as projectStorage from '../../src/utils/project-storage';
import { useCabinetStore } from '../../src/store/cabinet-store';
import { useToastStore } from '../../src/store/toast-store';

const { pdfMock } = vi.hoisted(() => ({
  pdfMock: vi.fn(() => ({ toBlob: vi.fn().mockResolvedValue(new Blob(['pdf'])) })),
}));

vi.mock('@react-pdf/renderer', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@react-pdf/renderer')>()),
  pdf: pdfMock,
}));

import { PdfExportPanel } from '../../src/components/pdf/PdfExportPanel';

function ActiveTabHarness() {
  const activeTab = useCabinetStore((state) => state.activeTab);
  return activeTab === 'pdf' ? <PdfExportPanel /> : <div>Another tab</div>;
}

describe('PdfExportPanel', () => {
  let originalActiveTab: ReturnType<typeof useCabinetStore.getState>['activeTab'];

  beforeEach(() => {
    pdfMock.mockClear();
    originalActiveTab = useCabinetStore.getState().activeTab;
  });

  afterEach(() => {
    useCabinetStore.setState({ activeTab: originalActiveTab });
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

  it('reports a render failure and re-enables PDF generation', async () => {
    const user = userEvent.setup();
    pdfMock.mockReturnValueOnce({ toBlob: vi.fn().mockRejectedValue(new Error('render failed')) });
    useToastStore.setState({ toasts: [] });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<PdfExportPanel />);

    await user.click(screen.getByRole('button', { name: 'Generate PDF' }));

    await waitFor(() => {
      expect(useToastStore.getState().toasts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'PDF generation failed — check your connection and try again',
            type: 'error',
          }),
        ]),
      );
    });
    expect(await screen.findByRole('button', { name: 'Generate PDF' })).toBeEnabled();
  });

  it('accepts only one PDF render during a rapid double submission', async () => {
    const user = userEvent.setup();
    let resolveBlob: (blob: Blob) => void = () => {};
    const toBlob = vi.fn(
      () =>
        new Promise<Blob>((resolve) => {
          resolveBlob = resolve;
        }),
    );
    pdfMock.mockReturnValueOnce({ toBlob });
    const downloadClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<PdfExportPanel />);

    await user.dblClick(screen.getByRole('button', { name: 'Generate PDF' }));

    expect(pdfMock).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Generating…' })).toBeDisabled();
    await act(async () => resolveBlob(new Blob(['pdf'])));
    expect(downloadClick).toHaveBeenCalledOnce();
  });

  it('does not download a generated PDF after navigation unmounts the panel', async () => {
    const user = userEvent.setup();
    let resolveBlob: (blob: Blob) => void = () => {};
    pdfMock.mockReturnValueOnce({
      toBlob: vi.fn(
        () =>
          new Promise<Blob>((resolve) => {
            resolveBlob = resolve;
          }),
      ),
    });
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:pdf-export');
    useCabinetStore.setState({ activeTab: 'pdf' });
    render(<ActiveTabHarness />);

    await user.click(screen.getByRole('button', { name: 'Generate PDF' }));
    expect(screen.getByRole('button', { name: 'Generating…' })).toBeDisabled();

    act(() => useCabinetStore.getState().setActiveTab('configurator'));
    expect(screen.getByText('Another tab')).toBeInTheDocument();
    await act(async () => resolveBlob(new Blob(['pdf'])));

    expect(createObjectUrl).not.toHaveBeenCalled();
  });

  it('exports the current project settings and reports success', async () => {
    const user = userEvent.setup();
    const settings = {
      sawKerf: 3,
      materialPriceOverrides: { 'melamine-18': 210 },
      edgeBandingRate: 5,
      hardwarePriceOverrides: { H01: 8 },
      hardwareQtyOverrides: { H01: 4 },
      sheetSizeOverrides: { 'melamine-18': { width: 1200, length: 2400 } },
      labourRate: 90,
      labourHours: 2.5,
      finishCost: 35,
    };
    useCabinetStore.setState({ ...settings, projectName: 'Workshop plan' });
    useToastStore.setState({ toasts: [] });
    const exportSpy = vi.spyOn(projectStorage, 'exportSettingsJson').mockImplementation(() => {});
    render(<PdfExportPanel />);

    await user.click(screen.getByRole('button', { name: 'Export Project Settings' }));

    expect(exportSpy).toHaveBeenCalledWith(settings, 'Workshop plan');
    expect(useToastStore.getState().toasts).toEqual(
      expect.arrayContaining([expect.objectContaining({ message: 'Project settings exported', type: 'success' })]),
    );
    exportSpy.mockRestore();
  });

  it('imports valid project settings and applies them to the cabinet store', async () => {
    const user = userEvent.setup();
    useCabinetStore.setState({ sawKerf: 6, edgeBandingRate: 3 });
    useToastStore.setState({ toasts: [] });
    const settings = {
      sawKerf: 2.5,
      materialPriceOverrides: { 'melamine-18': 190 },
      edgeBandingRate: 4,
      hardwarePriceOverrides: {},
      hardwareQtyOverrides: {},
      sheetSizeOverrides: {},
      labourRate: 80,
      labourHours: 1.5,
      finishCost: 20,
    };
    const fileInputClick = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    render(<PdfExportPanel />);
    await user.click(screen.getByRole('button', { name: 'Import Project Settings' }));
    const fileInput = fileInputClick.mock.contexts.find(
      (context): context is HTMLInputElement => context instanceof HTMLInputElement,
    );
    if (!fileInput) throw new Error('Project settings file input was not opened');
    const file = new File([JSON.stringify(settings)], 'workshop.cabinet-settings.json', {
      type: 'application/json',
    });
    Object.defineProperty(file, 'text', { value: () => Promise.resolve(JSON.stringify(settings)) });

    await user.upload(fileInput, file);

    await waitFor(() => expect(useCabinetStore.getState().sawKerf).toBe(2.5));
    expect(useCabinetStore.getState().edgeBandingRate).toBe(4);
    expect(useCabinetStore.getState().materialPriceOverrides).toEqual({ 'melamine-18': 190 });
    expect(useToastStore.getState().toasts).toEqual(
      expect.arrayContaining([expect.objectContaining({ message: 'Project settings applied', type: 'success' })]),
    );
  });

  it('rejects malformed settings without changing current optimizer settings', async () => {
    const user = userEvent.setup();
    useCabinetStore.setState({ sawKerf: 6, edgeBandingRate: 7 });
    useToastStore.setState({ toasts: [] });
    const fileInputClick = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    render(<PdfExportPanel />);
    await user.click(screen.getByRole('button', { name: 'Import Project Settings' }));
    const fileInput = fileInputClick.mock.contexts.find(
      (context): context is HTMLInputElement => context instanceof HTMLInputElement,
    );
    if (!fileInput) throw new Error('Project settings file input was not opened');
    const file = new File(['not json'], 'broken.cabinet-settings.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', { value: () => Promise.resolve('not json') });

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(useToastStore.getState().toasts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: 'Could not import settings — invalid file', type: 'error' }),
        ]),
      );
    });
    expect(useCabinetStore.getState().sawKerf).toBe(6);
    expect(useCabinetStore.getState().edgeBandingRate).toBe(7);
  });

  it('exports a full-project PDF containing each configured cabinet', async () => {
    const user = userEvent.setup();
    const current = useCabinetStore.getState();
    const cabinets = [
      { name: 'Base cabinet', config: { ...current.config, width: 600 } },
      { name: 'Wall cabinet', config: { ...current.config, width: 800 } },
    ];
    useCabinetStore.setState({ cabinets, projectName: 'Kitchen plan' });
    let downloadedFileName = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloadedFileName = this.download;
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:project-pdf');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    render(<PdfExportPanel />);

    await user.click(screen.getByRole('button', { name: 'Export Full Project (2 cabinets)' }));

    await waitFor(() => expect(downloadedFileName).toBe('Kitchen-plan-2-cabinets-18-parts.pdf'));
    expect(pdfMock).toHaveBeenCalledWith(
      expect.objectContaining({
        props: expect.objectContaining({
          cabinetCount: 2,
          allCabinetsData: expect.arrayContaining([
            expect.objectContaining({ name: 'Base cabinet' }),
            expect.objectContaining({ name: 'Wall cabinet' }),
          ]),
        }),
      }),
    );
  });
});
