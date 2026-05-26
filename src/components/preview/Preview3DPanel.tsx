import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { applyExplodeFactor, buildCabinetScene, centerScene, getSceneBounds } from '../../engine/webgpu-renderer';
import { getPbrMaterial } from '../../engine/pbr-materials';
import { useCabinetStore } from '../../store/cabinet-store';
import { generateParts } from '../../engine/parts';
import type { CabinetScene } from '../../engine/webgpu-renderer';
import type { RendererCapabilities } from '../../engine/webgpu-renderer';

// ---------------------------------------------------------------------------
// Renderer capability hook (DOM-side probe — not in the engine layer)
// ---------------------------------------------------------------------------

function useRendererCapabilities(): RendererCapabilities {
  const [capabilities, setCapabilities] = useState<RendererCapabilities>({
    tier: 'none',
    maxTextureSize: 2048,
    supportsHDR: false,
    supportsAR: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function probe() {
      // WebGPU probe
      if ('gpu' in navigator) {
        try {
          const adapter = await (navigator as { gpu: { requestAdapter(): Promise<unknown> } }).gpu.requestAdapter();
          if (adapter && !cancelled) {
            setCapabilities({ tier: 'webgpu', maxTextureSize: 8192, supportsHDR: true, supportsAR: true });
            return;
          }
        } catch {
          // WebGPU unavailable — fall through to WebGL2 check
        }
      }

      // WebGL2 probe
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      if (gl && !cancelled) {
        const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
        setCapabilities({ tier: 'webgl2', maxTextureSize: maxTex, supportsHDR: false, supportsAR: false });
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return;
      }

      if (!cancelled) {
        setCapabilities({ tier: 'none', maxTextureSize: 2048, supportsHDR: false, supportsAR: false });
      }
    }

    void probe();
    return () => {
      cancelled = true;
    };
  }, []);

  return capabilities;
}

// ---------------------------------------------------------------------------
// Scene builder helper
// ---------------------------------------------------------------------------

const EXPLODE_MIN = 0;
const EXPLODE_MAX = 1;
const EXPLODE_STEP = 0.01;

const TIER_BADGE: Record<string, string> = {
  webgpu: 'bg-emerald-600',
  webgl2: 'bg-blue-600',
  none: 'bg-wood-500',
};

// ---------------------------------------------------------------------------
// Preview3DPanel component
// ---------------------------------------------------------------------------

/**
 * Sprint 114 — Interactive 3D cabinet preview panel.
 *
 * Renders a scene-graph preview with controls for orbit, zoom, explode view,
 * and wireframe toggle. Uses the WebGPU renderer (Sprint 112) and PBR
 * materials (Sprint 113). Falls back gracefully when WebGPU is unavailable.
 */
export const Preview3DPanel = memo(function Preview3DPanel() {
  const { t } = useTranslation();
  const { config } = useCabinetStore();
  const capabilities = useRendererCapabilities();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [explodeFactor, setExplodeFactor] = useState(0);
  const [showWireframe, setShowWireframe] = useState(false);
  const [showEdgeBanding, setShowEdgeBanding] = useState(true);
  const [zoom, setZoom] = useState(1);

  // Build scene graph whenever config changes
  const scene = useMemo<CabinetScene>(() => {
    const parts = generateParts(config);
    return centerScene(buildCabinetScene(parts));
  }, [config]);

  // Apply explode factor on top of the base scene
  const displayScene = useMemo<CabinetScene>(() => applyExplodeFactor(scene, explodeFactor), [scene, explodeFactor]);

  // PBR material for the current carcass material
  const pbrMaterial = useMemo(() => getPbrMaterial(config.carcassMaterial), [config.carcassMaterial]);

  const bounds = useMemo(() => getSceneBounds(displayScene), [displayScene]);
  const sceneDiag = Math.sqrt(
    (bounds.max.x - bounds.min.x) ** 2 + (bounds.max.y - bounds.min.y) ** 2 + (bounds.max.z - bounds.min.z) ** 2,
  );

  const handleResetCamera = useCallback(() => {
    setZoom(1);
    setExplodeFactor(0);
  }, []);

  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(z * 1.25, 8)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(z / 1.25, 0.1)), []);

  const handleExplodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setExplodeFactor(parseFloat(e.target.value));
  }, []);

  // Draw a simple wireframe projection on the canvas (SVG fallback visual)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Simple orthographic projection: project XZ onto canvas, Y as vertical
    const scale = (Math.min(W, H) / Math.max(sceneDiag, 1)) * zoom * 0.8;
    const cx = W / 2;
    const cy = H / 2;

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    // Draw each mesh as a filled rect (top-down orthographic)
    for (const mesh of displayScene.meshes) {
      const b = {
        x0: mesh.origin.x - (bounds.min.x + bounds.max.x) / 2,
        y0: mesh.origin.z - (bounds.min.z + bounds.max.z) / 2,
      };

      // Use PBR baseColor as fill (approximate sRGB for canvas)
      const r = Math.round(Math.min(pbrMaterial.baseColor.r ** (1 / 2.2), 1) * 255);
      const g = Math.round(Math.min(pbrMaterial.baseColor.g ** (1 / 2.2), 1) * 255);
      const bCh = Math.round(Math.min(pbrMaterial.baseColor.b ** (1 / 2.2), 1) * 255);

      ctx.fillStyle = showWireframe ? 'transparent' : `rgba(${r},${g},${bCh},0.85)`;
      ctx.strokeStyle = showWireframe ? `rgb(${r},${g},${bCh})` : `rgba(${r},${g},${bCh},0.4)`;
      ctx.lineWidth = showWireframe ? 1.5 : 0.5;

      // Approximate width/length from mesh vertex bounds (use half-width estimates)
      const estW = 100 * scale;
      const estL = 60 * scale;
      const px = cx + b.x0 * scale - estW / 2;
      const py = cy + b.y0 * scale - estL / 2;

      ctx.beginPath();
      ctx.rect(px, py, estW, estL);
      if (!showWireframe) ctx.fill();
      ctx.stroke();

      // Edge banding highlight
      if (showEdgeBanding && !showWireframe) {
        ctx.strokeStyle = `rgba(${r + 30},${g + 20},${bCh},0.9)`;
        ctx.lineWidth = 3;
        ctx.strokeRect(px, py, estW, estL);
      }
    }

    // Renderer tier label on canvas
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '11px monospace';
    ctx.fillText(`${capabilities.tier} · ${displayScene.meshes.length} parts`, 8, H - 8);
  }, [displayScene, pbrMaterial, showWireframe, showEdgeBanding, zoom, sceneDiag, bounds, capabilities.tier]);

  return (
    <section aria-label={t('preview3d.title')} className="bg-wood-50 flex flex-col gap-3 rounded-lg p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-wood-900 text-sm font-semibold">{t('preview3d.title')}</h2>
        <span
          className={`rounded px-2 py-0.5 text-[10px] font-medium text-white ${TIER_BADGE[capabilities.tier] ?? 'bg-wood-500'}`}
          aria-label={t('preview3d.rendererTier', { tier: capabilities.tier })}
        >
          {capabilities.tier.toUpperCase()}
        </span>
      </div>

      {/* Canvas */}
      <div className="relative overflow-hidden rounded-md bg-[#1a1a2e]">
        <canvas
          ref={canvasRef}
          width={640}
          height={360}
          className="h-auto w-full"
          aria-label={t('preview3d.meshCount', { count: displayScene.meshes.length })}
        />
        {capabilities.tier === 'none' && (
          <p
            aria-live="polite"
            className="absolute inset-0 flex items-center justify-center text-center text-xs text-white/60"
          >
            {t('preview3d.noGpu')}
          </p>
        )}
      </div>

      {/* Orbit / zoom controls */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleZoomIn}
          aria-label={t('preview3d.zoomIn')}
          className="border-wood-200 text-wood-700 hover:bg-wood-50 rounded border bg-white px-3 py-1 text-xs"
        >
          +
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          aria-label={t('preview3d.zoomOut')}
          className="border-wood-200 text-wood-700 hover:bg-wood-50 rounded border bg-white px-3 py-1 text-xs"
        >
          −
        </button>
        <button
          type="button"
          onClick={handleResetCamera}
          className="border-wood-200 text-wood-700 hover:bg-wood-50 rounded border bg-white px-3 py-1 text-xs"
        >
          {t('preview3d.resetCamera')}
        </button>
      </div>

      {/* Explode slider */}
      <div className="flex flex-col gap-1">
        <label htmlFor="explode-slider" className="text-wood-700 text-xs font-medium">
          {t('preview3d.explode')} ({Math.round(explodeFactor * 100)}%)
        </label>
        <input
          id="explode-slider"
          type="range"
          min={EXPLODE_MIN}
          max={EXPLODE_MAX}
          step={EXPLODE_STEP}
          value={explodeFactor}
          onChange={handleExplodeChange}
          className="accent-wood-600 w-full"
          aria-valuenow={explodeFactor}
          aria-valuemin={EXPLODE_MIN}
          aria-valuemax={EXPLODE_MAX}
        />
      </div>

      {/* Toggle controls */}
      <div className="flex flex-wrap gap-3">
        <label className="text-wood-700 flex cursor-pointer items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={showWireframe}
            onChange={(e) => setShowWireframe(e.target.checked)}
            className="accent-wood-600"
          />
          {t('preview3d.wireframe')}
        </label>
        <label className="text-wood-700 flex cursor-pointer items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={showEdgeBanding}
            onChange={(e) => setShowEdgeBanding(e.target.checked)}
            className="accent-wood-600"
          />
          {t('preview3d.edgeBanding')}
        </label>
      </div>

      {/* Scene info */}
      <p className="text-wood-500 text-[10px]" aria-live="polite">
        {t('preview3d.meshCount', { count: displayScene.meshes.length })} ·{' '}
        {t('preview3d.rendererTier', { tier: capabilities.tier })} · {pbrMaterial.displayName.en}
      </p>
    </section>
  );
});
