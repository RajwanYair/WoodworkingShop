import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { Header } from '../../src/components/layout/Header';
import { useCabinetStore } from '../../src/store/cabinet-store';

describe('Header', () => {
  beforeEach(() => {
    useCabinetStore.setState({ activeTab: 'configurator', darkMode: false });
  });

  it('renders app title', () => {
    render(<Header />);
    expect(screen.getByText('Cabinet Planner')).toBeInTheDocument();
  });

  it('renders all four tab buttons', () => {
    render(<Header />);
    expect(screen.getAllByText(/configure/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/preview/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/cut sheets/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/export pdf/i).length).toBeGreaterThanOrEqual(1);
  });

  it('highlights the active tab', () => {
    render(<Header />);
    const configureButtons = screen.getAllByText(/configure/i);
    // At least one button should have the active class
    const hasActive = configureButtons.some((btn) => btn.className.includes('bg-wood-600'));
    expect(hasActive).toBe(true);
  });

  it('switches tab on click', () => {
    render(<Header />);
    const previewBtns = screen.getAllByText(/preview/i);
    fireEvent.click(previewBtns[0]);
    expect(useCabinetStore.getState().activeTab).toBe('preview');
  });

  it('renders undo/redo buttons', () => {
    render(<Header />);
    const undoButtons = screen.getAllByLabelText('Undo');
    expect(undoButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders dark mode toggle', () => {
    render(<Header />);
    // Button uses SVG icon now — verify by aria-label
    const darkBtns = screen.getAllByLabelText(/dark mode|light mode/i);
    expect(darkBtns.length).toBeGreaterThanOrEqual(1);
  });

  it('renders language toggle', () => {
    render(<Header />);
    expect(screen.getAllByText('עברית').length).toBeGreaterThanOrEqual(1);
  });

  // ── Keyboard tab navigation (Sprint 22 — Phase 4 keyboard-only workflow) ──

  it('active tab button has tabIndex=0; others have tabIndex=-1 (roving tabindex)', () => {
    render(<Header />);
    const tabButtons = screen.getAllByRole('tab');
    const active = tabButtons.find((b) => b.getAttribute('aria-selected') === 'true');
    const inactive = tabButtons.filter((b) => b.getAttribute('aria-selected') !== 'true');
    expect(active).toBeDefined();
    expect(active!.tabIndex).toBe(0);
    inactive.forEach((b) => expect(b.tabIndex).toBe(-1));
  });

  it('ArrowRight moves focus to the next tab', () => {
    render(<Header />);
    // Start on configurator (index 0). ArrowRight should move to preview (index 1).
    const tabButtons = screen.getAllByRole('tab');
    fireEvent.keyDown(tabButtons[0], { key: 'ArrowRight' });
    expect(useCabinetStore.getState().activeTab).toBe('preview');
  });

  it('ArrowLeft wraps from first tab to last tab', () => {
    render(<Header />);
    const tabButtons = screen.getAllByRole('tab');
    // configurator is first; ArrowLeft should wrap to pdf (last)
    fireEvent.keyDown(tabButtons[0], { key: 'ArrowLeft' });
    expect(useCabinetStore.getState().activeTab).toBe('pdf');
  });

  it('Home key navigates to the first tab', () => {
    useCabinetStore.setState({ activeTab: 'assembly' });
    render(<Header />);
    const tabButtons = screen.getAllByRole('tab');
    const assemblyTab = tabButtons.find((b) => b.getAttribute('aria-selected') === 'true')!;
    fireEvent.keyDown(assemblyTab, { key: 'Home' });
    expect(useCabinetStore.getState().activeTab).toBe('configurator');
  });

  it('End key navigates to the last tab', () => {
    render(<Header />);
    const tabButtons = screen.getAllByRole('tab');
    fireEvent.keyDown(tabButtons[0], { key: 'End' });
    expect(useCabinetStore.getState().activeTab).toBe('pdf');
  });
});
