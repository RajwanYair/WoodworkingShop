import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GcodePreviewModal } from '../../src/components/optimizer/GcodePreviewModal';
import { makeCutRect, makeCutSheet } from '../helpers';

let originalShowModal: PropertyDescriptor | undefined;
let showModalMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
  showModalMock = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
    within(this).getAllByRole('button', { name: 'Dismiss' })[1]?.focus();
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: showModalMock,
  });
});

afterEach(() => {
  if (originalShowModal) {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShowModal);
  } else {
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  }
});

function renderModal(sheet = makeCutSheet()) {
  const onClose = vi.fn();
  const onDownload = vi.fn();
  render(<GcodePreviewModal sheet={sheet} filename="cabinet.nc" onClose={onClose} onDownload={onDownload} />);
  return { onClose, onDownload };
}

async function openCncOptions(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'CNC Options' }));
}

describe('GcodePreviewModal', () => {
  it('opens a native dialog and restores focus to its trigger when dismissed', async () => {
    const user = userEvent.setup();

    function ModalHarness() {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <>
          <button onClick={() => setIsOpen(true)}>Open G-code preview</button>
          {isOpen && (
            <GcodePreviewModal
              sheet={makeCutSheet()}
              filename="cabinet.nc"
              onClose={() => setIsOpen(false)}
              onDownload={vi.fn()}
            />
          )}
        </>
      );
    }

    render(<ModalHarness />);
    const trigger = screen.getByRole('button', { name: 'Open G-code preview' });
    await user.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'G-code Toolpath Preview' });
    expect(dialog.tagName).toBe('DIALOG');
    expect(showModalMock).toHaveBeenCalledOnce();

    await user.click(screen.getAllByRole('button', { name: 'Dismiss' })[1]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes when the native dialog receives a cancel event', () => {
    const { onClose } = renderModal();
    const dialog = screen.getByRole('dialog', { name: 'G-code Toolpath Preview' });
    const cancelEvent = new Event('cancel', { cancelable: true });

    fireEvent(dialog, cancelEvent);

    expect(onClose).toHaveBeenCalledOnce();
    expect(cancelEvent.defaultPrevented).toBe(true);
  });

  it('closes when the native dialog backdrop is clicked', () => {
    const { onClose } = renderModal();

    fireEvent.click(screen.getAllByRole('button', { name: 'Dismiss' })[0]);

    expect(onClose).toHaveBeenCalledOnce();
  });

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

  it.each([
    { preset: 'Shapeoko 3', feed: 2000, plunge: 500, safeZ: 5, passDepth: 2, toolDiameter: 6 },
    { preset: 'X-Carve 1000', feed: 1800, plunge: 500, safeZ: 5, passDepth: 2, toolDiameter: 6 },
    { preset: 'Genmitsu 3018 Pro', feed: 800, plunge: 300, safeZ: 5, passDepth: 1, toolDiameter: 3.175 },
  ])(
    'applies all $preset settings to the generated file',
    async ({ preset, feed, plunge, safeZ, passDepth, toolDiameter }) => {
      const user = userEvent.setup();
      const { onDownload } = renderModal();
      await openCncOptions(user);
      await user.click(screen.getByRole('button', { name: preset }));

      expect(screen.getByRole('spinbutton', { name: 'Feed (mm/min)' })).toHaveValue(feed);
      expect(screen.getByRole('spinbutton', { name: 'Plunge (mm/min)' })).toHaveValue(plunge);
      expect(screen.getByRole('spinbutton', { name: 'Safe Z (mm)' })).toHaveValue(safeZ);
      expect(screen.getByRole('spinbutton', { name: 'Pass depth (mm)' })).toHaveValue(passDepth);
      expect(screen.getByRole('spinbutton', { name: 'Tool Ø (mm)' })).toHaveValue(toolDiameter);

      await user.click(screen.getByRole('button', { name: 'Download' }));
      expect(onDownload).toHaveBeenCalledWith(expect.stringContaining(`Feed: ${feed} mm/min`));
    },
  );

  it.each([
    { label: 'Feed (mm/min)', value: '2200', output: 'F2200' },
    { label: 'Plunge (mm/min)', value: '450', output: 'F450' },
    { label: 'Safe Z (mm)', value: '9', output: 'G0 Z9.0 ; retract' },
    { label: 'Pass depth (mm)', value: '2', output: 'G1 Z-2.00 F600' },
    { label: 'Tool Ø (mm)', value: '4', output: 'Tool diameter: 4 mm' },
  ])('uses a positive $label edit in the downloaded G-code', async ({ label, value, output }) => {
    const user = userEvent.setup();
    const { onDownload } = renderModal();
    await openCncOptions(user);
    const field = screen.getByRole('spinbutton', { name: label });
    await user.clear(field);
    await user.type(field, value);
    await user.click(screen.getByRole('button', { name: 'Download' }));

    expect(onDownload).toHaveBeenCalledWith(expect.stringContaining(output));
  });

  it.each([
    { label: 'Feed (mm/min)', expectedOutput: 'Feed: 1500 mm/min' },
    { label: 'Plunge (mm/min)', expectedOutput: 'F600' },
    { label: 'Safe Z (mm)', expectedOutput: 'G0 Z5.0 ; retract' },
    { label: 'Pass depth (mm)', expectedOutput: 'G1 Z-3.00 F600' },
    { label: 'Tool Ø (mm)', expectedOutput: 'Tool diameter: 6 mm' },
  ])('rejects zero for $label without changing generated G-code', async ({ label, expectedOutput }) => {
    const user = userEvent.setup();
    const { onDownload } = renderModal();
    await openCncOptions(user);
    const field = screen.getByRole('spinbutton', { name: label });
    await user.clear(field);
    await user.type(field, '0');
    await user.click(screen.getByRole('button', { name: 'Download' }));

    expect(onDownload).toHaveBeenCalledWith(expect.stringContaining(expectedOutput));
  });

  it.each([
    { label: 'Feed (mm/min)', initial: 1500 },
    { label: 'Plunge (mm/min)', initial: 600 },
    { label: 'Safe Z (mm)', initial: 5 },
    { label: 'Pass depth (mm)', initial: 3 },
    { label: 'Tool Ø (mm)', initial: 6 },
  ])('rejects an empty value for $label and retains its previous value', async ({ label, initial }) => {
    const user = userEvent.setup();
    renderModal();
    await openCncOptions(user);
    const field = screen.getByRole('spinbutton', { name: label });
    await user.clear(field);
    await user.tab();

    expect(field).toHaveValue(initial);
  });

  it('rejects a positive value below the numeric minimum', async () => {
    const user = userEvent.setup();
    const { onDownload } = renderModal();
    await openCncOptions(user);
    const passDepth = screen.getByRole('spinbutton', { name: 'Pass depth (mm)' });
    await user.clear(passDepth);
    await user.type(passDepth, '0.05');
    await user.tab();

    expect(passDepth).toHaveValue(3);
    await user.click(screen.getByRole('button', { name: 'Download' }));
    expect(onDownload).toHaveBeenCalledWith(expect.stringContaining('G1 Z-3.00 F600'));
  });

  it('expands and collapses CNC options with the accessible disclosure state', async () => {
    const user = userEvent.setup();
    renderModal();
    const options = screen.getByRole('button', { name: 'CNC Options' });

    expect(options).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('spinbutton', { name: 'Feed (mm/min)' })).not.toBeInTheDocument();
    await user.click(options);
    expect(options).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('spinbutton', { name: 'Feed (mm/min)' })).toBeInTheDocument();
    await user.click(options);
    expect(options).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('spinbutton', { name: 'Feed (mm/min)' })).not.toBeInTheDocument();
  });

  it('marks manually edited preset values as custom', async () => {
    const user = userEvent.setup();
    renderModal();
    await openCncOptions(user);
    await user.click(screen.getByRole('button', { name: 'Shapeoko 3' }));
    expect(screen.getAllByText('Shapeoko 3')).toHaveLength(2);

    const feed = screen.getByRole('spinbutton', { name: 'Feed (mm/min)' });
    await user.clear(feed);
    await user.type(feed, '2200');

    expect(screen.getAllByText('Shapeoko 3')).toHaveLength(1);
  });

  it('emits a tool-change pause between parts when enabled', async () => {
    const user = userEvent.setup();
    const sheet = makeCutSheet({
      parts: [makeCutRect({ partId: 'P01' }), makeCutRect({ partId: 'P02', x: 500 })],
    });
    const { onDownload } = renderModal(sheet);
    await openCncOptions(user);
    await user.click(screen.getByRole('checkbox', { name: 'Emit M6 tool-change between parts' }));
    await user.click(screen.getByRole('button', { name: 'Download' }));

    expect(onDownload).toHaveBeenCalledWith(expect.stringContaining('M6 T1 ; tool change'));
  });

  it('omits tool-change commands by default', async () => {
    const user = userEvent.setup();
    const sheet = makeCutSheet({
      parts: [makeCutRect({ partId: 'P01' }), makeCutRect({ partId: 'P02', x: 500 })],
    });
    const { onDownload } = renderModal(sheet);
    await user.click(screen.getByRole('button', { name: 'Download' }));

    expect(onDownload).toHaveBeenCalledWith(expect.not.stringContaining('M6 T1'));
  });

  it('marks arc-mode edits custom while keeping rectangular toolpaths linear', async () => {
    const user = userEvent.setup();
    const { onDownload } = renderModal();
    await openCncOptions(user);
    await user.click(screen.getByRole('button', { name: 'Shapeoko 3' }));
    await user.click(screen.getByRole('checkbox', { name: 'Arc moves (G2/G3)' }));

    expect(screen.getByText('Custom')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Download' }));

    expect(onDownload).toHaveBeenCalledWith(expect.not.stringMatching(/\bG[23]\b/));
  });

  it('closes without downloading when the user dismisses the preview', async () => {
    const user = userEvent.setup();
    const { onClose, onDownload } = renderModal();
    await user.click(screen.getAllByRole('button', { name: 'Dismiss' })[1]);

    expect(onClose).toHaveBeenCalledOnce();
    expect(onDownload).not.toHaveBeenCalled();
  });
});
