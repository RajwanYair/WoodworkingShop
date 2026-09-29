/**
 * Sprint 82 — CabinetSelector part count badge.
 *
 * Verifies that each cabinet tab in the selector shows a badge with the
 * number of generated parts for that cabinet's config.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { CabinetSelector } from '../../src/components/configurator/CabinetSelector';
import { useCabinetStore } from '../../src/store/cabinet-store';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import { generateParts } from '../../src/engine';

function seedSingle() {
  useCabinetStore.setState({
    cabinets: [{ name: 'Base Unit', config: { ...DEFAULT_CONFIG } }],
    activeCabinetIndex: 0,
  });
}

function seedMulti() {
  const cfgA = { ...DEFAULT_CONFIG };
  const cfgB = { ...DEFAULT_CONFIG, shelfCount: 3 };
  useCabinetStore.setState({
    cabinets: [
      { name: 'Cabinet A', config: cfgA },
      { name: 'Cabinet B', config: cfgB },
    ],
    activeCabinetIndex: 0,
  });
}

describe('CabinetSelector — part count badge (Sprint 82)', () => {
  beforeEach(() => {
    seedSingle();
  });

  it('renders a part count badge on the single-cabinet button', () => {
    seedSingle();
    render(<CabinetSelector />);
    const expectedCount = generateParts(DEFAULT_CONFIG).length;
    // Badge has aria-label "N parts"
    expect(screen.getByLabelText(`${expectedCount} parts`)).toBeInTheDocument();
  });

  it('part count badge value matches generateParts output length', () => {
    seedSingle();
    render(<CabinetSelector />);
    const expectedCount = generateParts(DEFAULT_CONFIG).length;
    const badge = screen.getByLabelText(`${expectedCount} parts`);
    expect(badge.textContent).toBe(`(${expectedCount})`);
  });

  it('each cabinet tab has its own badge in multi-cabinet mode', () => {
    seedMulti();
    render(<CabinetSelector />);
    const cfgA = { ...DEFAULT_CONFIG };
    const cfgB = { ...DEFAULT_CONFIG, shelfCount: 3 };
    const countA = generateParts(cfgA).length;
    const countB = generateParts(cfgB).length;
    if (countA !== countB) {
      expect(screen.getByLabelText(`${countA} parts`)).toBeInTheDocument();
      expect(screen.getByLabelText(`${countB} parts`)).toBeInTheDocument();
    } else {
      // Same count — both badges present (two elements with same aria-label)
      expect(screen.getAllByLabelText(`${countA} parts`)).toHaveLength(2);
    }
  });

  it('badges show correct count when a different shelfCount config is used', () => {
    const cfgWithShelves = { ...DEFAULT_CONFIG, shelfCount: 5 };
    useCabinetStore.setState({
      cabinets: [{ name: 'Shelf Cabinet', config: cfgWithShelves }],
      activeCabinetIndex: 0,
    });
    render(<CabinetSelector />);
    const expectedCount = generateParts(cfgWithShelves).length;
    expect(screen.getByLabelText(`${expectedCount} parts`)).toBeInTheDocument();
  });

  it('adds, renames by keyboard, and removes a cabinet through its controls', async () => {
    const user = userEvent.setup();
    seedSingle();
    render(<CabinetSelector />);

    await user.click(screen.getByRole('button', { name: /add/i }));
    expect(useCabinetStore.getState().cabinets).toHaveLength(2);

    const addedName = useCabinetStore.getState().cabinets[1].name;
    const partCount = generateParts(DEFAULT_CONFIG).length;
    await user.dblClick(screen.getByRole('button', { name: `${addedName}${partCount} parts` }));
    const nameInput = screen.getByRole('textbox', { name: 'Cabinet name' });
    await user.clear(nameInput);
    await user.type(nameInput, 'Workshop Base');
    await user.keyboard('{Enter}');
    expect(useCabinetStore.getState().cabinets[1].name).toBe('Workshop Base');

    await user.click(screen.getByRole('button', { name: /remove workshop base/i }));
    expect(useCabinetStore.getState().cabinets).toHaveLength(1);
  });
});
