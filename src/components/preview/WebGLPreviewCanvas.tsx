import { useEffect, useRef } from 'react';
import { isWebGLAvailable, probeWebGLTier } from '../../engine/webgl-probe';
import type { CabinetConfig } from '../../engine/types';

interface WebGLPreviewCanvasProps {
  config: CabinetConfig;
  /** Canvas width in CSS pixels (default: 320). */
  width?: number;
  /** Canvas height in CSS pixels (default: 240). */
  height?: number;
  className?: string;
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
 * Build a solid box geometry centred at origin.
 * Returns interleaved [x, y, z, r, g, b] per vertex, wound for TRIANGLES.
 */
function buildBox(w: number, h: number, d: number): Float32Array {
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

  // 6 faces: [indices, faceColor]
  const faces: Array<{ idx: [number, number, number, number]; color: Vec3 }> = [
    { idx: [4, 5, 6, 7], color: [0.76, 0.6, 0.42] }, // front — warm oak
    { idx: [1, 0, 3, 2], color: [0.55, 0.42, 0.28] }, // back — shadow
    { idx: [0, 4, 7, 3], color: [0.65, 0.5, 0.35] }, // left
    { idx: [5, 1, 2, 6], color: [0.65, 0.5, 0.35] }, // right
    { idx: [3, 7, 6, 2], color: [0.85, 0.7, 0.52] }, // top — highlight
    { idx: [0, 1, 5, 4], color: [0.45, 0.35, 0.22] }, // bottom — shadow
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
 * Used for Phase 7 evaluation of WebGL material-texture previews.
 * Falls back to a descriptive message when WebGL is unavailable.
 */
export function WebGLPreviewCanvas({ config, width = 320, height = 240, className }: WebGLPreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
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

    const geometry = buildBox(nw, nh, nd);

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

    let angle = 0.4; // Initial y-rotation in radians
    const ROTATION_SPEED = 0.006;
    const VERTEX_COUNT = geometry.length / 6;

    function draw() {
      if (!gl) return;
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniform1f(uAngleY, angle);
      gl.drawArrays(gl.TRIANGLES, 0, VERTEX_COUNT);
      angle += ROTATION_SPEED;
      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      gl.deleteBuffer(buf);
      gl.deleteProgram(program);
    };
  }, [config.width, config.height, config.depth, width, height]);

  const tier = probeWebGLTier();

  if (tier === 'unavailable') {
    return (
      <div
        className={`flex items-center justify-center rounded border border-wood-200 dark:border-wood-700 bg-wood-50 dark:bg-wood-800 text-wood-400 dark:text-wood-500 text-sm ${className ?? ''}`}
        style={{ width, height }}
        aria-label="3D preview unavailable — WebGL not supported"
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
      className={`rounded border border-wood-200 dark:border-wood-700 ${className ?? ''}`}
      aria-label={`3D cabinet preview — ${config.width}×${config.height}×${config.depth} mm`}
      data-testid="webgl-preview-canvas"
    />
  );
}
