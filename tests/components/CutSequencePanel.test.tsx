import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import type { CutRect, CutSheet } from '../../src/engine/types';
import { CutSequencePanel } from '../../src/components/optimizer/CutSequencePanel';
import { useCabinetStore } from '../../src/store/cabinet-store';

function rect(partId: string, x: number, y: number, width: number, length: number): CutRect {
  return { partId, label: partId, x, y, width, length, grainVertical: true };
}

function sheet(parts: CutRect[]): CutSheet {
  return {
    sheetIndex: 0,
    material: 'melamine-16',
    thickness: 16,
    sheetWidth: 1000,
    sheetLength: 1000,
    parts,
    yieldPercent: 0,
  };
}

async function openPanel(sheets: CutSheet[], cutMode: 'freeform' | 'guillotine') {
  useCabinetStore.setState({ sawKerf: 3, config: { ...DEFAULT_CONFIG, cutMode } });
  render(<CutSequencePanel sheets={sheets} filePrefix="test" />);
  await userEvent.setup().click(screen.getByRole('button', { name: 'Cut sequence (panel saw)' }));
}

describe('CutSequencePanel', () => {
  it('labels freeform output as a layout rather than an executable sequence', async () => {
    await openPanel([sheet([rect('a', 0, 0, 400, 300)])], 'freeform');
    expect(screen.getByText(/nesting layout only, not a verified cut order/)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('lists numbered guillotine steps with assumptions and a diagram', async () => {
    await openPanel([sheet([rect('a', 0, 0, 400, 300), rect('b', 0, 303, 400, 300)])], 'guillotine');
    expect(
      screen.getByText('Blade kerf is 3 mm and is taken on the far side of each measurement.'),
    ).toBeInTheDocument();
    expect(screen.getByText('1. Crosscut the 1000×1000 mm panel at 300 mm (stage 1)')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Sheet 1 cut diagram with \d+ numbered cuts/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download instructions' })).toBeInTheDocument();
  });

  it('flags a layout that is not realizable with through cuts', async () => {
    const pinwheel = sheet([
      rect('n', 0, 0, 600, 400),
      rect('e', 603, 0, 397, 600),
      rect('s', 400, 603, 600, 397),
      rect('w', 0, 403, 397, 597),
    ]);
    await openPanel([pinwheel], 'guillotine');
    expect(screen.getByText('This layout cannot be cut with edge-to-edge cuts only.')).toBeInTheDocument();
  });
});
