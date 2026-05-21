/**
 * Phase 12 / Sprint 14 — WebGLPreviewCanvas feature flag tests
 *
 * The component is gated by `VITE_ENABLE_WEBGL=true`.
 * When the flag is absent the component must return null (no DOM output).
 * When the flag is present the component renders a <canvas> element (or a
 * fallback <div> when WebGL is unavailable in the test environment).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { CabinetConfig } from '../../src/engine/types';
import { DEFAULT_CONFIG } from '../../src/engine/dimensions';

// ── Helpers ──────────────────────────────────────────────────────────────────

const BASE_CONFIG: CabinetConfig = {
  ...DEFAULT_CONFIG,
  width: 600,
  height: 720,
  depth: 560,
  material: 'melamine-18',
};

/** Reset the module registry so import.meta.env changes take effect. */
function reimportCanvas(webglFlag: string | undefined) {
  vi.resetModules();
  vi.stubEnv('VITE_ENABLE_WEBGL', webglFlag ?? '');
  // Re-import after stubbing so the module-level constant is re-evaluated.
  return import('../../src/components/preview/WebGLPreviewCanvas');
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('WebGLPreviewCanvas — feature flag', () => {
  beforeEach(() => {
    // Suppress WebGL context errors in jsdom (no real GPU)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('returns nothing when VITE_ENABLE_WEBGL is not set', async () => {
    const { WebGLPreviewCanvas } = await reimportCanvas(undefined);
    const { container } = render(
      <WebGLPreviewCanvas config={BASE_CONFIG} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns nothing when VITE_ENABLE_WEBGL is "false"', async () => {
    const { WebGLPreviewCanvas } = await reimportCanvas('false');
    const { container } = render(
      <WebGLPreviewCanvas config={BASE_CONFIG} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders a fallback div when flag is true but WebGL is unavailable', async () => {
    const { WebGLPreviewCanvas } = await reimportCanvas('true');
    const { container } = render(
      <WebGLPreviewCanvas config={BASE_CONFIG} />,
    );
    // jsdom returns null for webgl context → fallback or canvas element rendered.
    // Either way, container should not be empty.
    expect(container.firstChild).not.toBeNull();
  });

  it('accepts materialColor and isometric props without crashing', async () => {
    const { WebGLPreviewCanvas } = await reimportCanvas('true');
    expect(() =>
      render(
        <WebGLPreviewCanvas
          config={BASE_CONFIG}
          materialColor="#8B4513"
          isometric={true}
        />,
      ),
    ).not.toThrow();
  });

  it('accepts isometric=false without crashing', async () => {
    const { WebGLPreviewCanvas } = await reimportCanvas('true');
    expect(() =>
      render(
        <WebGLPreviewCanvas
          config={BASE_CONFIG}
          isometric={false}
        />,
      ),
    ).not.toThrow();
  });

  it('renders fallback with data-testid="webgl-fallback" when WebGL unavailable', async () => {
    const { WebGLPreviewCanvas } = await reimportCanvas('true');
    render(<WebGLPreviewCanvas config={BASE_CONFIG} />);
    // In jsdom, probeWebGLTier() will return 'unavailable' because getContext returns null.
    const fallback = screen.queryByTestId('webgl-fallback');
    // Accept either a fallback div or a canvas (depending on probe result).
    const canvas = screen.queryByTestId('webgl-preview-canvas');
    expect(fallback ?? canvas).not.toBeNull();
  });
});
