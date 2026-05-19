import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { CabinetPreview } from '../../src/components/preview/CabinetPreview';
import { useCabinetStore } from '../../src/store/cabinet-store';
import { DEFAULT_CONFIG } from '../../src/engine/materials';

describe('CabinetPreview — isometric 3D view', () => {
  beforeEach(() => {
    useCabinetStore.setState({
      config: { ...DEFAULT_CONFIG, drawerCount: 2, doorStyle: 'none' },
      darkMode: false,
      units: 'metric',
    });
  });

  it('renders without crashing', () => {
    render(<CabinetPreview />);
    // The view buttons should be visible
    expect(screen.getByText(/3D/i)).toBeInTheDocument();
  });

  it('shows 3D isometric SVG when 3D tab is active', () => {
    render(<CabinetPreview />);
    // Click the 3D button
    const btn3d = screen.getByText(/3D/i);
    fireEvent.click(btn3d);
    // The SVG should have the isometric aria-label
    expect(screen.getByLabelText('3D isometric cabinet drawing')).toBeInTheDocument();
  });

  it('isometric SVG contains polygon elements for drawer depth (Sprint 174)', () => {
    render(<CabinetPreview />);
    fireEvent.click(screen.getByText(/3D/i));
    const svg = screen.getByLabelText('3D isometric cabinet drawing');
    // Sprint 174 adds top/right faces per drawer — expect more polygons than doors-only view
    const polygons = svg.querySelectorAll('polygon');
    // Each drawer now produces 3 polygons (top face, right face, front face) + handle = 4 elements
    // 2 drawers × 3 polygons min
    expect(polygons.length).toBeGreaterThanOrEqual(6);
  });
});
