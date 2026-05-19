import { render, screen, fireEvent, within } from '@testing-library/react';
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
    // Use within() to query inside the SVG via Testing Library
    const polygons = within(svg as HTMLElement).queryAllByRole('img', { hidden: true });
    // Fall back to title-based count: polygons don't have ARIA roles in SVG,
    // so assert the SVG contains polygon tags via innerHTML
    const polyCount = (svg.innerHTML.match(/<polygon/g) ?? []).length;
    // Each drawer now produces 3 polygons (top face, right face, front face) + handle = 4 elements
    // 2 drawers × 3 polygons min
    expect(polyCount + polygons.length).toBeGreaterThanOrEqual(6);
  });
});
