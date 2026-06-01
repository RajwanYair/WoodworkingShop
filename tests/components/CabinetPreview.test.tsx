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

describe('CabinetPreview — project cabinet switching and centre supports', () => {
  beforeEach(() => {
    useCabinetStore.setState({
      cabinets: [
        { name: 'Cabinet 1', config: { ...DEFAULT_CONFIG, width: 600, shelfCentreSupports: 0 } },
        { name: 'Cabinet 2', config: { ...DEFAULT_CONFIG, width: 900, shelfCentreSupports: 2 } },
      ],
      activeCabinetIndex: 0,
      config: { ...DEFAULT_CONFIG, width: 600, shelfCentreSupports: 0 },
      darkMode: false,
      units: 'metric',
    });
  });

  it('renders centre support overlays when configured', () => {
    useCabinetStore.setState({
      config: { ...DEFAULT_CONFIG, shelfCentreSupports: 2 },
    });
    render(<CabinetPreview />);
    const svg = screen.getByLabelText('Cabinet drawing');
    const dashedCount = (svg.innerHTML.match(/stroke-dasharray/g) ?? []).length;
    expect(dashedCount).toBeGreaterThanOrEqual(2);
  });
});

// ── Sprint 76 — W×H×D dimension label strip ────────────────────────────────
describe('CabinetPreview — dimension label strip (Sprint 76)', () => {
  beforeEach(() => {
    useCabinetStore.setState({
      config: { ...DEFAULT_CONFIG, width: 600, height: 720, depth: 580, doorStyle: 'none', drawerCount: 0 },
      darkMode: false,
      units: 'metric',
    });
  });

  it('renders the dimension summary paragraph', () => {
    render(<CabinetPreview />);
    const label = screen.getByRole('paragraph');
    expect(label).toBeInTheDocument();
  });

  it('contains all three dimensions: W, H, D', () => {
    render(<CabinetPreview />);
    const label = screen.getByRole('paragraph');
    expect(label.textContent).toMatch(/W/);
    expect(label.textContent).toMatch(/H/);
    expect(label.textContent).toMatch(/D/);
  });

  it('shows the config width value (600 mm)', () => {
    render(<CabinetPreview />);
    const label = screen.getByRole('paragraph');
    expect(label.textContent).toContain('600');
  });

  it('shows the config height value (720 mm)', () => {
    render(<CabinetPreview />);
    const label = screen.getByRole('paragraph');
    expect(label.textContent).toContain('720');
  });

  it('shows the config depth value (580 mm)', () => {
    render(<CabinetPreview />);
    const label = screen.getByRole('paragraph');
    expect(label.textContent).toContain('580');
  });
});

// ── Sprint 89 — door / drawer count indicator pills ─────────────────────────
describe('CabinetPreview — door/drawer count pills (Sprint 89)', () => {
  it('shows door count pill when doorCount > 0', () => {
    useCabinetStore.setState({
      config: { ...DEFAULT_CONFIG, doorCount: 2, drawerCount: 0, doorStyle: 'flat' },
      darkMode: false,
      units: 'metric',
    });
    render(<CabinetPreview />);
    expect(screen.getByText(/2.*doors/i)).toBeInTheDocument();
  });

  it('shows drawer count pill when drawerCount > 0', () => {
    useCabinetStore.setState({
      config: { ...DEFAULT_CONFIG, doorStyle: 'none', drawerCount: 3 },
      darkMode: false,
      units: 'metric',
    });
    render(<CabinetPreview />);
    expect(screen.getByText(/3.*drawers/i)).toBeInTheDocument();
  });

  it('shows both pills when both counts > 0', () => {
    useCabinetStore.setState({
      config: { ...DEFAULT_CONFIG, doorCount: 1, drawerCount: 2, doorStyle: 'flat' },
      darkMode: false,
      units: 'metric',
    });
    render(<CabinetPreview />);
    expect(screen.getByText(/1.*doors/i)).toBeInTheDocument();
    expect(screen.getByText(/2.*drawers/i)).toBeInTheDocument();
  });

  it('hides pills when both counts are 0', () => {
    useCabinetStore.setState({
      config: { ...DEFAULT_CONFIG, doorStyle: 'none', drawerCount: 0 },
      darkMode: false,
      units: 'metric',
    });
    render(<CabinetPreview />);
    expect(screen.queryByText(/doors/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/drawers/i)).not.toBeInTheDocument();
  });
});
