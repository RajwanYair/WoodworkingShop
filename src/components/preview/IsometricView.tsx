import { formatDim } from '../../utils/units';
import type { UnitSystem } from '../../utils/units';
import { getMaterialTexture } from '../../engine/material-textures';

// ─── Isometric 3D view ───

/** Isometric projection helpers: convert (x, y, z) → SVG (sx, sy).
 *  Uses standard 30° isometric angles: cos30 ≈ 0.866, sin30 = 0.5 */
function iso(x: number, y: number, z: number): [number, number] {
  const sx = (x - z) * 0.866;
  const sy = (x + z) * 0.5 - y;
  return [sx, sy];
}

function isoQuad(
  p1: [number, number, number],
  p2: [number, number, number],
  p3: [number, number, number],
  p4: [number, number, number],
): string {
  const pts = [p1, p2, p3, p4].map(([x, y, z]) => iso(x, y, z));
  return pts.map(([sx, sy]) => `${sx},${sy}`).join(' ');
}

export function IsometricView({
  w,
  h,
  d,
  thick,
  bt,
  color,
  materialId,
  shelfPositions,
  centreSupportCount,
  hasDoors,
  doorStyle,
  doorCount,
  doorReveal,
  doorWidth,
  doorHeight,
  drawerCount,
  drawerHeights,
  kickHeight,
  showDims,
  units,
}: {
  w: number;
  h: number;
  d: number;
  thick: number;
  bt: number;
  color: string;
  /** Sprint 69 — optional texture atlas ID; when set, SVG pattern fills replace flat colour. */
  materialId?: string;
  shelfPositions: number[];
  centreSupportCount: number;
  hasDoors: boolean;
  doorStyle: string;
  doorCount: number;
  doorReveal: number;
  doorWidth: number;
  doorHeight: number;
  drawerCount: number;
  drawerHeights: number[];
  kickHeight: number;
  showDims: boolean;
  units: UnitSystem;
}) {
  const sc = 0.18; // scale
  const W = w * sc;
  const H = h * sc;
  const D = d * sc;
  const T = thick * sc;
  const BT = bt * sc;
  const KH = kickHeight * sc;

  // Compute SVG bounding box from iso projection
  const corners: [number, number, number][] = [
    [0, 0, 0],
    [W, 0, 0],
    [0, H, 0],
    [W, H, 0],
    [0, 0, D],
    [W, 0, D],
    [0, H, D],
    [W, H, D],
  ];
  const projected = corners.map(([x, y, z]) => iso(x, y, z));
  const minX = Math.min(...projected.map((p) => p[0]));
  const maxX = Math.max(...projected.map((p) => p[0]));
  const minY = Math.min(...projected.map((p) => p[1]));
  const maxY = Math.max(...projected.map((p) => p[1]));
  const pad = showDims ? 60 : 30;
  const vw = maxX - minX + pad * 2;
  const vh = maxY - minY + pad * 2;
  const ox = -minX + pad;
  const oy = -minY + pad;

  // Sprint 69 — material texture atlas: pattern fills fall back to brightness-adjusted colours
  const tex = materialId ? getMaterialTexture(materialId) : undefined;
  const topFill = tex ? 'url(#iso-tex-top)' : adjustBrightness(color, 20);
  const sideFill = tex ? 'url(#iso-tex-side)' : adjustBrightness(color, -30);
  const frontFill = tex ? 'url(#iso-tex-front)' : color;
  const interiorFill = adjustBrightness(color, -50);

  // Derive drawer front height strips (distributed from bottom above kick)
  const bottomY = KH;
  const interiorH = H - 2 * T - KH;
  const drawerFronts: { y: number; fh: number }[] = [];
  if (drawerCount > 0 && !hasDoors) {
    const totalSpecified = drawerHeights.reduce((s, v) => s + v, 0);
    if (drawerHeights.length >= drawerCount && totalSpecified > 0) {
      let y = bottomY + T;
      for (let i = 0; i < drawerCount; i++) {
        const fh = (drawerHeights[i] / totalSpecified) * interiorH * sc;
        drawerFronts.push({ y, fh });
        y += fh;
      }
    } else {
      const fh = (interiorH * sc) / drawerCount;
      for (let i = 0; i < drawerCount; i++) {
        drawerFronts.push({ y: bottomY + T + i * fh, fh });
      }
    }
  }

  // Grain lines count for top face
  const grainStep = Math.max(W / 6, 4);

  return (
    <svg
      viewBox={`0 0 ${vw} ${vh}`}
      role="img"
      aria-label="3D isometric cabinet drawing"
      className="border-wood-200 dark:border-wood-700 dark:bg-wood-800 text-wood-600 dark:text-wood-200 max-h-125 w-full max-w-lg rounded border bg-white"
    >
      <defs>
        <filter id="iso-shadow" x="-8%" y="-5%" width="120%" height="120%">
          <feDropShadow dx="3" dy="5" stdDeviation="5" floodColor="#000" floodOpacity="0.28" />
        </filter>
        <linearGradient id="iso-handle-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8c060" />
          <stop offset="50%" stopColor="#c8a040" />
          <stop offset="100%" stopColor="#a07820" />
        </linearGradient>
        {tex && (
          <>
            <pattern id="iso-tex-top" x="0" y="0" width="64" height="64" patternUnits="userSpaceOnUse">
              <rect width="64" height="64" fill={tex.baseColor} />
              {tex.grainLines.map((l, idx) => (
                <line
                  key={idx}
                  x1={l.x1}
                  y1={l.y1}
                  x2={l.x2}
                  y2={l.y2}
                  stroke={tex.grainColor}
                  strokeWidth={l.width}
                  opacity={l.opacity}
                />
              ))}
            </pattern>
            <pattern id="iso-tex-side" x="0" y="0" width="64" height="64" patternUnits="userSpaceOnUse">
              <rect width="64" height="64" fill={tex.sideColor ?? adjustBrightness(tex.baseColor, -30)} />
              {tex.grainLines.map((l, idx) => (
                <line
                  key={idx}
                  x1={l.y1}
                  y1={l.x1}
                  x2={l.y2}
                  y2={l.x2}
                  stroke={tex.grainColor}
                  strokeWidth={l.width}
                  opacity={l.opacity * 0.8}
                />
              ))}
            </pattern>
            <pattern id="iso-tex-front" x="0" y="0" width="64" height="64" patternUnits="userSpaceOnUse">
              <rect width="64" height="64" fill={tex.baseColor} />
              {tex.grainLines.map((l, idx) => (
                <line
                  key={idx}
                  x1={l.x1}
                  y1={l.y1}
                  x2={l.x2}
                  y2={l.y2}
                  stroke={tex.grainColor}
                  strokeWidth={l.width}
                  opacity={l.opacity}
                />
              ))}
              <rect width="64" height="64" fill="#000" opacity={0.06} />
            </pattern>
          </>
        )}
      </defs>
      <g transform={`translate(${ox},${oy})`}>
        {/* Back panel */}
        <polygon
          points={isoQuad([T, T, D - BT], [W - T, T, D - BT], [W - T, H - T, D - BT], [T, H - T, D - BT])}
          fill="#cba"
          stroke="#666"
          strokeWidth={0.5}
          opacity={0.4}
        >
          <title>{`Back Panel\n${Math.round(w - 2 * thick)}×${Math.round(h - 2 * thick)} mm`}</title>
        </polygon>

        {/* Interior side walls — visible only when no doors */}
        {!hasDoors && (
          <>
            <polygon
              points={isoQuad([T, T, 0], [T, T, D - BT], [T, H - T, D - BT], [T, H - T, 0])}
              fill={interiorFill}
              stroke="#777"
              strokeWidth={0.3}
              opacity={0.45}
            />
            <polygon
              points={isoQuad([W - T, T, 0], [W - T, T, D - BT], [W - T, H - T, D - BT], [W - T, H - T, 0])}
              fill={interiorFill}
              stroke="#777"
              strokeWidth={0.3}
              opacity={0.25}
            />
          </>
        )}

        {/* Bottom panel – top face */}
        <polygon
          points={isoQuad([T, T, 0], [W - T, T, 0], [W - T, T, D - BT], [T, T, D - BT])}
          fill={topFill}
          stroke="#666"
          strokeWidth={0.5}
          opacity={0.85}
        >
          <title>{`Bottom Panel\n${Math.round(w - 2 * thick)}×${Math.round(d - bt)} mm`}</title>
        </polygon>
        {/* Bottom panel – front face */}
        <polygon
          points={isoQuad([T, 0, 0], [W - T, 0, 0], [W - T, T, 0], [T, T, 0])}
          fill={sideFill}
          stroke="#666"
          strokeWidth={0.5}
          opacity={0.85}
        />

        {/* Kick panel */}
        {KH > 0 && (
          <polygon
            points={isoQuad([T + 4 * sc, 0, 0], [W - T - 4 * sc, 0, 0], [W - T - 4 * sc, KH, 0], [T + 4 * sc, KH, 0])}
            fill={sideFill}
            stroke="#555"
            strokeWidth={0.4}
            opacity={0.6}
          >
            <title>{`Kick Panel\n${Math.round(w - 2 * thick - 8)}×${kickHeight} mm`}</title>
          </polygon>
        )}

        {/* Shelves — top face + front edge + grain lines */}
        {shelfPositions.map((pos, i) => {
          const sy = T + pos * sc;
          const sT = T * 0.6;
          const shelfGrainStep = Math.max((W - 2 * T) / 5, 3);
          return (
            <g key={i}>
              {/* Shelf top face */}
              <polygon
                points={isoQuad([T, sy + sT, 0], [W - T, sy + sT, 0], [W - T, sy + sT, D - BT], [T, sy + sT, D - BT])}
                fill={topFill}
                stroke="#888"
                strokeWidth={0.3}
                opacity={0.7}
              >
                <title>{`Shelf ${i + 1}\n${Math.round(w - 2 * thick)}×${Math.round(d - bt)} mm`}</title>
              </polygon>
              {/* Shelf front edge */}
              <polygon
                points={isoQuad([T, sy, 0], [W - T, sy, 0], [W - T, sy + sT, 0], [T, sy + sT, 0])}
                fill={sideFill}
                stroke="#888"
                strokeWidth={0.3}
                opacity={0.5}
              />
              {/* Grain lines on shelf top (run along depth direction) */}
              {!tex &&
                Array.from({ length: Math.floor((W - 2 * T) / shelfGrainStep) - 1 }, (_, j) => {
                  const gx = T + shelfGrainStep + j * shelfGrainStep;
                  const [ax, ay] = iso(gx, sy + sT, 0);
                  const [bx, by] = iso(gx, sy + sT, D - BT);
                  return (
                    <line
                      key={`sg-${i}-${j}`}
                      x1={ax}
                      y1={ay}
                      x2={bx}
                      y2={by}
                      stroke="#cba"
                      strokeWidth={0.25}
                      opacity={0.4}
                    />
                  );
                })}
            </g>
          );
        })}

        {/* Centre supports (full-height dividers that split shelf bays). */}
        {Array.from({ length: centreSupportCount }).map((_, i) => {
          const sx = T + ((W - 2 * T) * (i + 1)) / (centreSupportCount + 1);
          const st = Math.max(T * 0.45, 1.2 * sc);
          return (
            <polygon
              key={`centre-support-iso-${i}`}
              points={isoQuad(
                [sx - st / 2, T, 0],
                [sx + st / 2, T, 0],
                [sx + st / 2, H - T, D - BT],
                [sx - st / 2, H - T, D - BT],
              )}
              fill={sideFill}
              stroke="#666"
              strokeWidth={0.35}
              opacity={0.52}
            >
              <title>{`Centre Support ${i + 1}\n${Math.round(thick)}×${Math.round(h - 2 * thick)} mm`}</title>
            </polygon>
          );
        })}

        {/* Left side panel – outer face */}
        <polygon
          points={isoQuad([0, 0, 0], [0, 0, D], [0, H, D], [0, H, 0])}
          fill={sideFill}
          stroke="#666"
          strokeWidth={0.5}
          opacity={0.85}
        >
          <title>{`Side Panel\n${thick}×${h} mm`}</title>
        </polygon>
        {/* Grain lines on left side (horizontal, run along depth) */}
        {!tex &&
          Array.from({ length: Math.floor(H / Math.max(H / 6, 4)) - 1 }, (_, i) => {
            const gy = Math.max(H / 6, 4) + i * Math.max(H / 6, 4);
            const [ax, ay] = iso(0, gy, 0);
            const [bx, by] = iso(0, gy, D);
            return (
              <line key={`lg-${i}`} x1={ax} y1={ay} x2={bx} y2={by} stroke="#cba" strokeWidth={0.25} opacity={0.35} />
            );
          })}

        {/* Ambient occlusion — bottom edge of left face */}
        <polygon
          points={isoQuad([0, 0, 0], [0, 0, D], [0, T * 0.45, D], [0, T * 0.45, 0])}
          fill="#000"
          opacity={0.18}
          pointerEvents="none"
        />
        {/* Right side panel – outer face */}
        <polygon
          points={isoQuad([W, 0, 0], [W, H, 0], [W, H, D], [W, 0, D])}
          fill={frontFill}
          stroke="#666"
          strokeWidth={0.5}
          opacity={0.65}
        >
          <title>{`Side Panel\n${thick}×${h} mm`}</title>
        </polygon>
        {/* Ambient occlusion — bottom edge of right face */}
        <polygon
          points={isoQuad([W, 0, 0], [W, 0, D], [W, T * 0.45, D], [W, T * 0.45, 0])}
          fill="#000"
          opacity={0.12}
          pointerEvents="none"
        />

        {/* Top panel – top face with grain lines */}
        <polygon
          points={isoQuad([0, H, 0], [0, H, D], [W, H, D], [W, H, 0])}
          fill={topFill}
          stroke="#666"
          strokeWidth={0.5}
          opacity={0.85}
        >
          <title>{`Top Panel\n${Math.round(w - 2 * thick)}×${Math.round(d - bt)} mm`}</title>
        </polygon>
        {/* Grain lines on top face (run along depth/Z direction) */}
        {!tex &&
          Array.from({ length: Math.floor((W - 2 * T) / grainStep) - 1 }, (_, i) => {
            const gx = T + grainStep + i * grainStep;
            const [ax, ay] = iso(gx, H, 0);
            const [bx, by] = iso(gx, H, D);
            return (
              <line key={`grain-${i}`} x1={ax} y1={ay} x2={bx} y2={by} stroke="#cba" strokeWidth={0.3} opacity={0.5} />
            );
          })}

        {/* Drawer fronts (visible on the front face when no doors) */}
        {drawerFronts.map(({ y: dy, fh }, i) => {
          const reveal = 2 * sc;
          const fx = T + reveal;
          const fw = W - 2 * T - 2 * reveal;
          const handleX = fx + fw * 0.5 - 6 * sc;
          const handleY = dy + fh * 0.5;
          // Sprint 174 — drawer box depth: box occupies ~75% of cabinet interior depth
          const boxDepth = (D - BT) * 0.75;
          const boxTop = dy + reveal;
          const boxBot = dy + fh - reveal;
          return (
            <g key={`drawer-${i}`}>
              {/* Sprint 174 — Drawer box top face (visible above front face) */}
              <polygon
                points={isoQuad(
                  [fx, boxTop, 0],
                  [fx + fw, boxTop, 0],
                  [fx + fw, boxTop, boxDepth],
                  [fx, boxTop, boxDepth],
                )}
                fill={topFill}
                stroke="#777"
                strokeWidth={0.3}
                opacity={0.55}
              />
              {/* Sprint 174 — Drawer box right side face */}
              <polygon
                points={isoQuad(
                  [fx + fw, boxTop, 0],
                  [fx + fw, boxBot, 0],
                  [fx + fw, boxBot, boxDepth],
                  [fx + fw, boxTop, boxDepth],
                )}
                fill={sideFill}
                stroke="#777"
                strokeWidth={0.3}
                opacity={0.45}
              />
              {/* Drawer front face */}
              <polygon
                points={isoQuad(
                  [fx, dy + reveal, 0],
                  [fx + fw, dy + reveal, 0],
                  [fx + fw, dy + fh - reveal, 0],
                  [fx, dy + fh - reveal, 0],
                )}
                fill={frontFill}
                stroke="#555"
                strokeWidth={0.7}
                opacity={0.88}
              >
                <title>{`Drawer ${i + 1}`}</title>
              </polygon>
              {/* Drawer handle */}
              <polygon
                points={isoQuad(
                  [handleX, handleY - 1 * sc, -0.5 * sc],
                  [handleX + 12 * sc, handleY - 1 * sc, -0.5 * sc],
                  [handleX + 12 * sc, handleY + 1 * sc, -0.5 * sc],
                  [handleX, handleY + 1 * sc, -0.5 * sc],
                )}
                fill="url(#iso-handle-grad)"
                stroke="#a07820"
                strokeWidth={0.4}
              />
            </g>
          );
        })}
        {hasDoors &&
          Array.from({ length: doorCount }).map((_, i) => {
            const dr = doorReveal * sc;
            const dw = doorWidth * sc;
            const dh = doorHeight * sc;
            const dx = dr + i * (dw + dr);
            const isGlass = doorStyle === 'glass';
            const doorFill = isGlass ? '#b8d8f0' : frontFill;
            const doorLabel = isGlass ? `Glass Door ${i + 1}` : `Door ${i + 1}`;
            return (
              <g key={`door-${i}`}>
                {/* Door front face */}
                <polygon
                  points={isoQuad([dx, dr, 0], [dx + dw, dr, 0], [dx + dw, dr + dh, 0], [dx, dr + dh, 0])}
                  fill={doorFill}
                  stroke="#555"
                  strokeWidth={0.8}
                  opacity={isGlass ? 0.4 : 0.9}
                >
                  <title>{`${doorLabel}\n${Math.round(doorWidth)}×${Math.round(doorHeight)} mm`}</title>
                </polygon>
                {/* Shaker door: inner inset frame */}
                {doorStyle === 'shaker' &&
                  (() => {
                    const inset = 5 * sc;
                    const fx = dx + inset;
                    const fy = dr + inset;
                    const fw = dw - 2 * inset;
                    const fh = dh - 2 * inset;
                    return (
                      <polygon
                        points={isoQuad(
                          [fx, fy, -0.3 * sc],
                          [fx + fw, fy, -0.3 * sc],
                          [fx + fw, fy + fh, -0.3 * sc],
                          [fx, fy + fh, -0.3 * sc],
                        )}
                        fill="none"
                        stroke="#777"
                        strokeWidth={0.7}
                        opacity={0.6}
                      />
                    );
                  })()}
                {/* Handle indicator */}
                <polygon
                  points={isoQuad(
                    [dx + dw - 8 * sc, dr + dh * 0.45, -0.5 * sc],
                    [dx + dw - 6 * sc, dr + dh * 0.45, -0.5 * sc],
                    [dx + dw - 6 * sc, dr + dh * 0.55, -0.5 * sc],
                    [dx + dw - 8 * sc, dr + dh * 0.55, -0.5 * sc],
                  )}
                  fill="url(#iso-handle-grad)"
                  stroke="#a07820"
                  strokeWidth={0.4}
                />
              </g>
            );
          })}

        {/* Dimension annotations */}
        {showDims && (
          <>
            {/* Width – along front bottom edge */}
            <IsoDimLine p1={[0, 0, -12 * sc]} p2={[W, 0, -12 * sc]} label={formatDim(w, units)} offset={-6} />
            {/* Height – along front left edge */}
            <IsoDimLine p1={[-12 * sc, 0, 0]} p2={[-12 * sc, H, 0]} label={formatDim(h, units)} offset={-6} />
            {/* Depth – along bottom left edge */}
            <IsoDimLine p1={[-12 * sc, 0, 0]} p2={[-12 * sc, 0, D]} label={formatDim(d, units)} offset={-6} />
          </>
        )}
      </g>
    </svg>
  );
}

function IsoDimLine({
  p1,
  p2,
  label,
}: {
  p1: [number, number, number];
  p2: [number, number, number];
  label: string;
  offset?: number;
}) {
  const [x1, y1] = iso(...p1);
  const [x2, y2] = iso(...p2);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return (
    <g fill="currentColor" stroke="currentColor" strokeWidth={0.5}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <circle cx={x1} cy={y1} r={1.5} stroke="none" />
      <circle cx={x2} cy={y2} r={1.5} stroke="none" />
      <text x={mx} y={my - 4} textAnchor="middle" fontSize={7} stroke="none">
        {label}
      </text>
    </g>
  );
}

/** Simple brightness adjustment for hex colors */
function adjustBrightness(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
