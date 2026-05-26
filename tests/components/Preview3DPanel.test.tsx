import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Preview3DPanel } from '../../src/components/preview/Preview3DPanel';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import { useCabinetStore } from '../../src/store/cabinet-store';

// ---------------------------------------------------------------------------
// Mock canvas 2D context (jsdom does not implement it)
// ---------------------------------------------------------------------------

const mockCtx = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  beginPath: vi.fn(),
  rect: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  strokeRect: vi.fn(),
  getExtension: vi.fn(() => null),
};

HTMLCanvasElement.prototype.getContext = vi.fn((type: string) => {
  if (type === '2d') return mockCtx as unknown as CanvasRenderingContext2D;
  return null;
}) as unknown as typeof HTMLCanvasElement.prototype.getContext;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

beforeEach(() => {
  useCabinetStore.setState({
    config: { ...DEFAULT_CONFIG },
    darkMode: false,
    units: 'metric',
  });
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Preview3DPanel', () => {
  it('renders the panel heading', () => {
    render(<Preview3DPanel />);
    expect(screen.getByText(/Interactive 3D Preview/i)).toBeInTheDocument();
  });

  it('renders renderer tier badge', () => {
    render(<Preview3DPanel />);
    // Tier badge (NONE by default in jsdom — no WebGPU/WebGL2)
    expect(screen.getAllByText(/NONE|WEBGL2|WEBGPU/i).length).toBeGreaterThan(0);
  });

  it('renders the canvas element', () => {
    render(<Preview3DPanel />);
    // canvas has aria-label describing mesh count
    expect(screen.getByLabelText(/parts?/i, { selector: 'canvas' })).toBeInTheDocument();
  });

  it('renders zoom in and zoom out buttons', () => {
    render(<Preview3DPanel />);
    expect(screen.getByLabelText(/Zoom in/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Zoom out/i)).toBeInTheDocument();
  });

  it('renders reset camera button', () => {
    render(<Preview3DPanel />);
    expect(screen.getByText(/Reset camera/i)).toBeInTheDocument();
  });

  it('renders explode view slider', () => {
    render(<Preview3DPanel />);
    expect(screen.getByLabelText(/Explode view/i)).toBeInTheDocument();
  });

  it('renders wireframe checkbox', () => {
    render(<Preview3DPanel />);
    expect(screen.getByLabelText(/Wireframe/i)).toBeInTheDocument();
  });

  it('renders edge banding checkbox', () => {
    render(<Preview3DPanel />);
    expect(screen.getByLabelText(/Edge banding/i)).toBeInTheDocument();
  });

  it('clicking zoom in does not throw', () => {
    render(<Preview3DPanel />);
    fireEvent.click(screen.getByLabelText(/Zoom in/i));
    // Panel still rendered
    expect(screen.getByText(/Interactive 3D Preview/i)).toBeInTheDocument();
  });

  it('clicking zoom out does not throw', () => {
    render(<Preview3DPanel />);
    fireEvent.click(screen.getByLabelText(/Zoom out/i));
    expect(screen.getByText(/Interactive 3D Preview/i)).toBeInTheDocument();
  });

  it('clicking reset camera does not throw', () => {
    render(<Preview3DPanel />);
    fireEvent.click(screen.getByText(/Reset camera/i));
    expect(screen.getByText(/Interactive 3D Preview/i)).toBeInTheDocument();
  });

  it('toggleing wireframe checkbox does not throw', () => {
    render(<Preview3DPanel />);
    const checkbox = screen.getByLabelText(/Wireframe/i);
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('scene info line mentions the renderer tier', () => {
    render(<Preview3DPanel />);
    // The scene info paragraph should contain "Renderer:"
    expect(screen.getAllByText(/Renderer:/i).length).toBeGreaterThan(0);
  });
});
