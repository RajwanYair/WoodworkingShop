import { useId } from 'react';
import type { UnitSystem } from '../../utils/units';
import { getMaterialTexture } from '../../engine/materials/material-textures';
import { adjustBrightness, iso } from './isometric-geometry';
import { IsometricScene } from './isometric-scene';

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
  const resourcePrefix = useId().replaceAll(':', '');
  const resourceIds = {
    handle: `${resourcePrefix}-iso-handle-grad`,
    top: `${resourcePrefix}-iso-tex-top`,
    side: `${resourcePrefix}-iso-tex-side`,
    front: `${resourcePrefix}-iso-tex-front`,
  };

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
  const topFill = tex ? `url(#${resourceIds.top})` : adjustBrightness(color, 20);
  const sideFill = tex ? `url(#${resourceIds.side})` : adjustBrightness(color, -30);
  const frontFill = tex ? `url(#${resourceIds.front})` : color;
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
        <linearGradient id={resourceIds.handle} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8c060" />
          <stop offset="50%" stopColor="#c8a040" />
          <stop offset="100%" stopColor="#a07820" />
        </linearGradient>
        {tex && (
          <>
            <pattern id={resourceIds.top} x="0" y="0" width="64" height="64" patternUnits="userSpaceOnUse">
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
            <pattern id={resourceIds.side} x="0" y="0" width="64" height="64" patternUnits="userSpaceOnUse">
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
            <pattern id={resourceIds.front} x="0" y="0" width="64" height="64" patternUnits="userSpaceOnUse">
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
      <IsometricScene
        ox={ox}
        oy={oy}
        T={T}
        W={W}
        D={D}
        BT={BT}
        H={H}
        w={w}
        h={h}
        d={d}
        thick={thick}
        bt={bt}
        kickHeight={kickHeight}
        hasDoors={hasDoors}
        interiorFill={interiorFill}
        topFill={topFill}
        sideFill={sideFill}
        frontFill={frontFill}
        KH={KH}
        sc={sc}
        shelfPositions={shelfPositions}
        centreSupportCount={centreSupportCount}
        tex={tex}
        grainStep={grainStep}
        drawerFronts={drawerFronts}
        doorCount={doorCount}
        doorReveal={doorReveal}
        doorWidth={doorWidth}
        doorHeight={doorHeight}
        doorStyle={doorStyle}
        resourceIds={resourceIds}
        showDims={showDims}
        units={units}
      />
    </svg>
  );
}
