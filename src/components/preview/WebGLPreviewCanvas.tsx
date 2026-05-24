import { useEffect, useRef } from 'react';
import { isWebGLAvailable, probeWebGLTier } from '../../engine/webgl-probe';
import type { CabinetConfig } from '../../engine/types';

/** Phase 12 / Sprint 14 — feature flag guard. Component renders nothing when the flag is absent. */
const WEBGL_ENABLED = import.meta.env.VITE_ENABLE_WEBGL === 'true';

interface WebGLPreviewCanvasProps {
  config: CabinetConfig;
  /** Canvas width in CSS pixels (default: 320). */
  width?: number;
  /** Canvas height in CSS pixels (default: 240). */
  height?: number;
  className?: string;
  /**
   * Phase 12 / Sprint 14 — material base colour as a CSS hex string (e.g. '#b4884a').
   * Face colours are derived by multiplying the base RGB by per-face brightness factors.
   */
  materialColor?: string;
  /**
   * Phase 12 / Sprint 14 — when true, render a static isometric pose instead of
   * animating a continuous y-axis rotation.
   */
  isometric?: boolean;
}

// ── Minimal WebGL helpers ────────────────────────────────────────────────────

function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext, vsSource: string, fsSource: string): WebGLProgram | null {
  const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

// ── Shaders ──────────────────────────────────────────────────────────────────

/**
 * Vertex shader: applies a simple perspective projection + y-axis rotation
 * so the cabinet box appears in a 3/4 isometric-like view.
 */
const VS = `
  attribute vec3 aPos;
  attribute vec3 aColor;
  varying vec3 vColor;

  uniform float uAspect;
  uniform float uAngleY;

  void main() {
    float cy = cos(uAngleY);
    float sy = sin(uAngleY);
    float x = aPos.x * cy - aPos.z * sy;
    float z = aPos.x * sy + aPos.z * cy;

    // Slight tilt around x axis for pseudo-isometric look
    float angleX = 0.35;
    float cx = cos(angleX);
    float sx = sin(angleX);
    float y = aPos.y * cx - z * sx;
    float zz = aPos.y * sx + z * cx;

    // Perspective divide
    float fov = 1.8;
    float depth = zz + 3.5;
    gl_Position = vec4(x * fov / (depth * uAspect), y * fov / depth, 0.0, 1.0);
    vColor = aColor;
  }
`;

const FS = `
  precision mediump float;
  varying vec3 vColor;
  void main() {
    gl_FragColor = vec4(vColor, 1.0);
  }
`;

// ── Box geometry helpers ─────────────────────────────────────────────────────

type Vec3 = [number, number, number];

/**
 * Phase 12 / Sprint 14 — convert a CSS hex colour string to an [r, g, b] triple in [0, 1] range.
 * Falls back to a warm oak colour if the input is not a valid 6-digit hex.
 */
function hexToRgbFloat(hex: string): Vec3 {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return [0.76, 0.6, 0.42]; // warm oak fallback
  const n = parseInt(clean, 16);
  return [((n >> 16) & 0xff) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255];
}

/**
 * Build a solid box geometry centred at origin.
 * Returns interleaved [x, y, z, r, g, b] per vertex, wound for TRIANGLES.
 * @param matColorHex — material hex colour; face brightness is derived from it.
 */
function buildBox(w: number, h: number, d: number, matColorHex = '#c2924a'): Float32Array {
  // Half-extents
  const hw = w / 2;
  const hh = h / 2;
  const hd = d / 2;

  // 8 corners
  const corners: Vec3[] = [
    [-hw, -hh, -hd],
    [hw, -hh, -hd],
    [hw, hh, -hd],
    [-hw, hh, -hd],
    [-hw, -hh, hd],
    [hw, -hh, hd],
    [hw, hh, hd],
    [-hw, hh, hd],
  ];

  // 6 faces: [indices, brightness multiplier]
  const base = hexToRgbFloat(matColorHex);
  const tint = (m: number): Vec3 => [Math.min(1, base[0] * m), Math.min(1, base[1] * m), Math.min(1, base[2] * m)];

  const faces: Array<{ idx: [number, number, number, number]; color: Vec3 }> = [
    { idx: [4, 5, 6, 7], color: tint(1.0) }, // front — base
    { idx: [1, 0, 3, 2], color: tint(0.72) }, // back — shadow
    { idx: [0, 4, 7, 3], color: tint(0.85) }, // left
    { idx: [5, 1, 2, 6], color: tint(0.85) }, // right
    { idx: [3, 7, 6, 2], color: tint(1.12) }, // top — highlight
    { idx: [0, 1, 5, 4], color: tint(0.6) }, // bottom — shadow
  ];

  const verts: number[] = [];
  for (const { idx, color } of faces) {
    const [a, b, c, d] = idx.map((i) => corners[i]);
    // Two triangles per quad
    for (const v of [a, b, c, a, c, d]) {
      verts.push(...v, ...color);
    }
  }

  return new Float32Array(verts);
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Lightweight WebGL canvas that renders a simplified 3-D box approximating
 * the configured cabinet.  Rotates slowly on the y-axis to show depth.
 *
 * Phase 12 / Sprint 14:
 * - Feature-flagged via `VITE_ENABLE_WEBGL=true` (returns null when absent).
 * - Per-material colour derived from `materialColor` prop.
 * - `isometric` prop switches to a static isometric angle instead of animation.
 * - Falls back to an SVG placeholder when WebGL is unavailable in the browser.
 */
export function WebGLPreviewCanvas({
  config,
  width = 320,
  height = 240,
  className,
  materialColor,
  isometric = false,
}: WebGLPreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    // Phase 12 / Sprint 14 — feature flag guard inside the effect so hook
    // order is always stable (unconditional useEffect call).
    if (!WEBGL_ENABLED) return;

    const canvas = canvasRef.current;
    if (!canvas || !isWebGLAvailable()) return;

    const gl = canvas.getContext('webgl') as WebGLRenderingContext | null;
    if (!gl) return;

    const program = createProgram(gl, VS, FS);
    if (!program) return;

    // Normalise cabinet dimensions to [-1, 1] range
    const maxDim = Math.max(config.width, config.height, config.depth);
    const nw = config.width / maxDim;
    const nh = config.height / maxDim;
    const nd = config.depth / maxDim;

    const geometry = buildBox(nw, nh, nd, materialColor ?? '#c2924a');

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, geometry, gl.STATIC_DRAW);

    const stride = 6 * 4; // 6 floats * 4 bytes
    const aPos = gl.getAttribLocation(program, 'aPos');
    const aColor = gl.getAttribLocation(program, 'aColor');
    const uAspect = gl.getUniformLocation(program, 'uAspect');
    const uAngleY = gl.getUniformLocation(program, 'uAngleY');

    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(aColor);
    gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, stride, 12);

    gl.useProgram(program);
    gl.uniform1f(uAspect, width / height);

    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.97, 0.95, 0.92, 1.0);

    // Phase 12 / Sprint 14 — isometric mode: fixed 30° y-angle, no animation.
    const ISO_ANGLE = Math.PI / 6; // 30°
    let angle = isometric ? ISO_ANGLE : 0.4;
    const ROTATION_SPEED = 0.006;
    const VERTEX_COUNT = geometry.length / 6;

    function draw() {
      if (!gl) return;
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniform1f(uAngleY, angle);
      gl.drawArrays(gl.TRIANGLES, 0, VERTEX_COUNT);
      if (!isometric) {
        angle += ROTATION_SPEED;
        rafRef.current = requestAnimationFrame(draw);
      }
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      gl.deleteBuffer(buf);
      gl.deleteProgram(program);
    };
  }, [config.width, config.height, config.depth, width, height, materialColor, isometric]);

  // Phase 12 / Sprint 14 — feature flag post-hook guard (hooks always called above).
  if (!WEBGL_ENABLED) return null;

  const tier = probeWebGLTier();

  if (tier === 'unavailable') {
    return (
      <div
        className={`border-wood-200 dark:border-wood-700 bg-wood-50 dark:bg-wood-800 text-wood-400 dark:text-wood-500 flex items-center justify-center rounded border text-sm ${className ?? ''}`}
        style={{ width, height }}
        aria-label="3D preview unavailable — WebGL not supported"
        data-testid="webgl-fallback"
      >
        3D preview requires WebGL
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`border-wood-200 dark:border-wood-700 rounded border ${className ?? ''}`}
      aria-label={`3D cabinet preview — ${config.width}×${config.height}×${config.depth} mm`}
      data-testid="webgl-preview-canvas"
    />
  );
}
