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
    const hasActive = configureButtons.some((btn) => btn.className.includes('bg-wood-500'));
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
    // Should find moon emoji for light mode
    expect(screen.getAllByText('🌙').length).toBeGreaterThanOrEqual(1);
  });

  it('renders language toggle', () => {
    render(<Header />);
    expect(screen.getAllByText('עב').length).toBeGreaterThanOrEqual(1);
  });
});
