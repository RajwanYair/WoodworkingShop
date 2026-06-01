import { useState, useCallback, useRef, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { getMaterial } from '../../engine/materials';
import { getMaterialTextureId } from '../../engine/material-textures';
import { computeEqualShelfPositions } from '../../engine/dimensions';
import { formatDim } from '../../utils/units';
import { useTouchGestures } from '../../hooks/useTouchGestures';
import { IconDownload } from '../layout/Icons';
import { WebGLPreviewCanvas } from './WebGLPreviewCanvas';
import { S } from './preview-constants';
import { downloadSvg, downloadPng } from './preview-download-utils';
import { ViewBox, PartRect, DimLine, DoorsOverlay } from './preview-svg-parts';
import type { TooltipHandlers } from './preview-svg-parts';
import { FrontOpenView } from './FrontOpenView';
import { IsometricView } from './IsometricView';

type ViewId = 'front' | 'frontOpen' | 'side' | 'top' | 'back' | '3d';

interface TooltipInfo {
  label: string;
  dim: string;
  material?: string;
  x: number;
  y: number;
}

export const CabinetPreview = memo(function CabinetPreview() {
  const { t } = useTranslation();
  const { config, dimensions: d, setConfig, units } = useCabinetStore();
  /** Format a mm value using the active unit system */
  const fd = (mm: number) => formatDim(mm, units);
  const [activeView, setActiveView] = useState<ViewId>('front');
  const previewRef = useRef<HTMLDivElement>(null);
  const [showDims, setShowDims] = useState(true);
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [orbitYaw, setOrbitYaw] = useState(0);
  const [orbitPitch, setOrbitPitch] = useState(0);
  const [orbitZoom, setOrbitZoom] = useState(1);
  const [draggingOrbit, setDraggingOrbit] = useState(false);
  const orbitStartRef = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  /** Phase 12 / Sprint 14 — toggle isometric vs. animated WebGL view (only relevant when VITE_ENABLE_WEBGL=true). */
  const [webglIsometric, setWebglIsometric] = useState(true);

  const thick = getMaterial(config.carcassMaterial).thickness;
  const bt = getMaterial(config.backPanelMaterial).thickness;
  const color = getMaterial(config.carcassMaterial).color;
  const kickH = (config.kickHeight ?? 0) * S; // SVG-px height of toe kick
  const shelfPositions =
    config.shelfSpacing === 'custom' && config.customShelfPositions.length > 0
      ? config.customShelfPositions
      : computeEqualShelfPositions(d.internalHeight, config.shelfCount);

  const W = config.width * S;
  const H = config.height * S;
  const D = config.depth * S;
  const T = thick * S;
  const centreSupportCount = Math.max(0, config.shelfCentreSupports ?? 0);
  const centreSupportXs = Array.from(
    { length: centreSupportCount },
    (_, i) => T + ((W - 2 * T) * (i + 1)) / (centreSupportCount + 1),
  );
  const dimPad = showDims ? 45 : 30; // extra space for dimension lines

  const carcassMatName = getMaterial(config.carcassMaterial).name[config.lang];
  const backMatName = getMaterial(config.backPanelMaterial).name[config.lang];

  const showTooltip = useCallback((e: React.MouseEvent, label: string, dim: string, material?: string) => {
    setTooltip({ label, dim, material, x: e.clientX, y: e.clientY });
  }, []);
  const hideTooltip = useCallback(() => setTooltip(null), []);
  const moveTooltip = useCallback((e: React.MouseEvent) => {
    setTooltip((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : null));
  }, []);

  /** Common tooltip event props for PartRect */
  const tp: TooltipHandlers = { onHover: showTooltip, onLeave: hideTooltip, onMove: moveTooltip };

  const views = useMemo<{ id: ViewId; label: string }[]>(
    () => [
      { id: 'front', label: t('preview.front') },
      { id: 'frontOpen', label: t('preview.frontOpen') },
      { id: 'side', label: t('preview.side') },
      { id: 'top', label: t('preview.top') },
      { id: 'back', label: t('preview.back') },
      { id: '3d', label: t('preview.iso') },
    ],
    [t],
  );

  const viewIds = useMemo(() => views.map((v) => v.id), [views]);

  const touchGestures = useTouchGestures({
    onPinchZoom: setZoomScale,
    onSwipeLeft: () => {
      const idx = viewIds.indexOf(activeView);
      if (idx < viewIds.length - 1) {
        setActiveView(viewIds[idx + 1]);
        setZoomScale(1);
      }
    },
    onSwipeRight: () => {
      const idx = viewIds.indexOf(activeView);
      if (idx > 0) {
        setActiveView(viewIds[idx - 1]);
        setZoomScale(1);
      }
    },
  });

  const handleOrbitStart = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      setWebglIsometric(false);
      orbitStartRef.current = { x: e.clientX, y: e.clientY, yaw: orbitYaw, pitch: orbitPitch };
      setDraggingOrbit(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [orbitPitch, orbitYaw],
  );

  const handleOrbitMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const start = orbitStartRef.current;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    setOrbitYaw(start.yaw + dx * 0.25);
    setOrbitPitch(Math.max(-60, Math.min(60, start.pitch - dy * 0.2)));
  }, []);

  const handleOrbitEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    orbitStartRef.current = null;
    setDraggingOrbit(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  const handleOrbitWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOrbitZoom((z) => Math.max(0.6, Math.min(2.4, z - e.deltaY * 0.0015)));
  }, []);

  const webglEnabled = import.meta.env.VITE_ENABLE_WEBGL === 'true';

  return (
    <div className="space-y-4">
      {/* View tab bar */}
      <div className="flex flex-wrap items-center gap-1">
        <div role="tablist" aria-label="Cabinet view selector" className="flex flex-wrap gap-1">
          {views.map((v) => (
            <button
              key={v.id}
              role="tab"
              aria-selected={activeView === v.id}
              onClick={() => setActiveView(v.id)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                activeView === v.id
                  ? 'bg-wood-600 text-white'
                  : 'bg-wood-100 dark:bg-wood-800 text-wood-600 dark:text-wood-300 hover:bg-wood-200 dark:hover:bg-wood-700'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <label className="text-wood-600 dark:text-wood-300 ms-auto flex cursor-pointer items-center gap-1.5 text-xs select-none">
          <input
            type="checkbox"
            checked={showDims}
            onChange={(e) => setShowDims(e.target.checked)}
            className="accent-primary"
          />
          {t('preview.dimensions')}
        </label>
        <button
          onClick={() => previewRef.current && downloadSvg(previewRef.current, `cabinet-${activeView}.svg`)}
          className="bg-wood-100 dark:bg-wood-800 text-wood-600 dark:text-wood-300 hover:bg-wood-200 dark:hover:bg-wood-700 ms-2 flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors"
          aria-label={t('preview.exportSvg')}
          title={t('preview.exportSvg')}
        >
          <IconDownload size={11} /> SVG
        </button>
        <button
          onClick={() => previewRef.current && downloadPng(previewRef.current, `cabinet-${activeView}.png`)}
          className="bg-wood-100 dark:bg-wood-800 text-wood-600 dark:text-wood-300 hover:bg-wood-200 dark:hover:bg-wood-700 ms-1 flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors"
          aria-label={t('preview.exportPng')}
          title={t('preview.exportPng')}
        >
          <IconDownload size={11} /> PNG
        </button>
        {zoomScale !== 1 && (
          <button
            onClick={() => setZoomScale(1)}
            className="ms-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-300 dark:hover:bg-amber-800"
          >
            {Math.round(zoomScale * 100)}% ✕
          </button>
        )}
      </div>

      {/* Active view */}
      <div
        ref={previewRef}
        className="relative touch-none overflow-auto"
        onTouchStart={(e) => {
          if (activeView !== '3d') touchGestures.onTouchStart(e);
        }}
        onTouchMove={(e) => {
          if (activeView !== '3d') touchGestures.onTouchMove(e);
        }}
        onTouchEnd={(e) => {
          if (activeView !== '3d') touchGestures.onTouchEnd(e);
        }}
        style={{ transform: `scale(${zoomScale})`, transformOrigin: 'top left' }}
      >
        {tooltip && (
          <div
            className="bg-wood-900 dark:bg-wood-100 dark:text-wood-900 border-wood-600 dark:border-wood-300 pointer-events-none fixed z-50 rounded border px-3 py-2 text-xs text-white shadow-lg"
            style={{ left: tooltip.x + 12, top: tooltip.y - 40 }}
          >
            <div className="font-semibold">{tooltip.label}</div>
            <div>{tooltip.dim} mm</div>
            {tooltip.material && <div className="opacity-75">{tooltip.material}</div>}
          </div>
        )}
        {activeView === 'front' && (
          <ViewBox w={W + dimPad * 2} h={H + dimPad * 2}>
            <g transform={`translate(${dimPad},${dimPad})`}>
              <rect
                x={0}
                y={0}
                width={W}
                height={H}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeOpacity={0.6}
              />
              <PartRect
                x={0}
                y={0}
                w={T}
                h={H}
                fill={color}
                label="Side Panel"
                dim={`${thick}×${config.height}`}
                material={carcassMatName}
                {...tp}
              />
              <PartRect
                x={W - T}
                y={0}
                w={T}
                h={H}
                fill={color}
                label="Side Panel"
                dim={`${thick}×${config.height}`}
                material={carcassMatName}
                {...tp}
              />
              <PartRect
                x={T}
                y={0}
                w={W - 2 * T}
                h={T}
                fill={color}
                label="Top Panel"
                dim={`${d.internalWidth}×${thick}`}
                material={carcassMatName}
                {...tp}
              />
              <PartRect
                x={T}
                y={H - T}
                w={W - 2 * T}
                h={T}
                fill={color}
                label="Bottom Panel"
                dim={`${d.internalWidth}×${thick}`}
                material={carcassMatName}
                {...tp}
              />
              {centreSupportXs.map((sx, i) => (
                <PartRect
                  key={`centre-support-front-${i}`}
                  x={sx - Math.max(T * 0.25, 1)}
                  y={T}
                  w={Math.max(T * 0.5, 2)}
                  h={H - 2 * T}
                  fill={color}
                  dashed
                  label={`Centre Support ${i + 1}`}
                  dim={`${thick}×${d.internalHeight}`}
                  material={carcassMatName}
                  {...tp}
                />
              ))}
              {config.doorStyle !== 'none' && (
                <DoorsOverlay config={config} d={d} scale={S} color={color} material={carcassMatName} tp={tp} />
              )}
              {/* Toe kick strip */}
              {kickH > 0 && (
                <rect
                  x={T * 0.6}
                  y={H - kickH}
                  width={W - T * 0.6 * 2}
                  height={kickH}
                  fill={color}
                  opacity={0.55}
                  stroke="#666"
                  strokeWidth={0.5}
                />
              )}
              {showDims && (
                <>
                  <DimLine x1={0} y1={-8} x2={W} y2={-8} label={fd(config.width)} pos="above" />
                  <DimLine x1={W + 8} y1={0} x2={W + 8} y2={H} label={fd(config.height)} pos="right" />
                </>
              )}
            </g>
          </ViewBox>
        )}

        {activeView === 'frontOpen' && (
          <FrontOpenView
            W={W}
            H={H}
            T={T}
            thick={thick}
            color={color}
            carcassMatName={carcassMatName}
            d={d}
            config={config}
            shelfPositions={shelfPositions}
            centreSupportXs={centreSupportXs}
            showDims={showDims}
            dimPad={dimPad}
            fd={fd}
            tp={tp}
            setConfig={setConfig}
          />
        )}

        {activeView === 'side' && (
          <ViewBox w={D + dimPad * 2} h={H + dimPad * 2}>
            <g transform={`translate(${dimPad},${dimPad})`}>
              <rect
                x={0}
                y={0}
                width={D}
                height={H}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeOpacity={0.6}
              />
              <rect x={0} y={0} width={D} height={H} fill={color} opacity={0.3} />
              <PartRect
                x={D - bt * S}
                y={0}
                w={bt * S}
                h={H}
                fill="#cba"
                label="Back Panel"
                dim={`${bt}×${config.height}`}
                material={backMatName}
                {...tp}
              />
              {shelfPositions.map((pos, i) => (
                <PartRect
                  key={i}
                  x={0}
                  y={H - T - pos * S}
                  w={D - bt * S}
                  h={T * 0.6}
                  fill={color}
                  dashed
                  label={`Shelf ${i + 1}`}
                  dim={`${d.shelfDepth}×${thick}`}
                  material={carcassMatName}
                  {...tp}
                />
              ))}
              {showDims && (
                <>
                  <DimLine x1={0} y1={-8} x2={D} y2={-8} label={fd(config.depth)} pos="above" />
                  <DimLine x1={D + 8} y1={0} x2={D + 8} y2={H} label={fd(config.height)} pos="right" />
                </>
              )}
            </g>
          </ViewBox>
        )}

        {activeView === 'top' && (
          <ViewBox w={W + dimPad * 2} h={D + dimPad * 2}>
            <g transform={`translate(${dimPad},${dimPad})`}>
              <rect
                x={0}
                y={0}
                width={W}
                height={D}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeOpacity={0.6}
              />
              <PartRect
                x={0}
                y={0}
                w={T}
                h={D}
                fill={color}
                label="Side Panel"
                dim={`${thick}×${config.depth}`}
                material={carcassMatName}
                {...tp}
              />
              <PartRect
                x={W - T}
                y={0}
                w={T}
                h={D}
                fill={color}
                label="Side Panel"
                dim={`${thick}×${config.depth}`}
                material={carcassMatName}
                {...tp}
              />
              <PartRect
                x={T}
                y={0}
                w={W - 2 * T}
                h={T}
                fill={color}
                label="Top Panel"
                dim={`${d.internalWidth}×${thick}`}
                material={carcassMatName}
                {...tp}
              />
              <PartRect
                x={T}
                y={D - bt * S}
                w={W - 2 * T}
                h={bt * S}
                fill="#cba"
                label="Back Panel"
                dim={`${d.backPanelWidth}×${bt}`}
                material={backMatName}
                {...tp}
              />
              {centreSupportXs.map((sx, i) => (
                <PartRect
                  key={`centre-support-top-${i}`}
                  x={sx - Math.max(T * 0.2, 1)}
                  y={0}
                  w={Math.max(T * 0.4, 2)}
                  h={D - bt * S}
                  fill={color}
                  dashed
                  label={`Centre Support ${i + 1}`}
                  dim={`${thick}×${config.depth}`}
                  material={carcassMatName}
                  {...tp}
                />
              ))}
              {showDims && (
                <>
                  <DimLine x1={0} y1={-8} x2={W} y2={-8} label={fd(config.width)} pos="above" />
                  <DimLine x1={W + 8} y1={0} x2={W + 8} y2={D} label={fd(config.depth)} pos="right" />
                </>
              )}
            </g>
          </ViewBox>
        )}

        {activeView === 'back' && (
          <ViewBox w={W + dimPad * 2} h={H + dimPad * 2}>
            <g transform={`translate(${dimPad},${dimPad})`}>
              <PartRect
                x={0}
                y={0}
                w={W}
                h={H}
                fill="#cba"
                label="Back Panel"
                dim={`${d.backPanelWidth}×${d.backPanelHeight}`}
                material={backMatName}
                {...tp}
              />
              <text
                x={W / 2}
                y={H / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={11}
                fill="currentColor"
                opacity={0.55}
              >
                {Math.round(d.backPanelWidth)} × {Math.round(d.backPanelHeight)}
              </text>
              {showDims && (
                <>
                  <DimLine x1={0} y1={-8} x2={W} y2={-8} label={fd(config.width)} pos="above" />
                  <DimLine x1={W + 8} y1={0} x2={W + 8} y2={H} label={fd(config.height)} pos="right" />
                </>
              )}
            </g>
          </ViewBox>
        )}
        {activeView === '3d' && (
          <div
            className={`relative transform-gpu ${draggingOrbit ? 'cursor-grabbing' : 'cursor-grab'}`}
            style={{
              transform: webglEnabled
                ? undefined
                : `perspective(1400px) rotateX(${orbitPitch}deg) rotateY(${orbitYaw}deg)`,
              transformStyle: 'preserve-3d',
              transition: webglEnabled ? undefined : draggingOrbit ? 'none' : 'transform 120ms linear',
            }}
            onPointerDown={handleOrbitStart}
            onPointerMove={handleOrbitMove}
            onPointerUp={handleOrbitEnd}
            onPointerCancel={handleOrbitEnd}
            onWheel={handleOrbitWheel}
            onDoubleClick={() => {
              setOrbitYaw(0);
              setOrbitPitch(0);
              setOrbitZoom(1);
            }}
          >
            <IsometricView
              w={config.width}
              h={config.height}
              d={config.depth}
              thick={thick}
              bt={bt}
              color={color}
              materialId={getMaterialTextureId(config.carcassMaterial)}
              shelfPositions={shelfPositions}
              centreSupportCount={centreSupportCount}
              hasDoors={config.doorStyle !== 'none'}
              doorStyle={config.doorStyle}
              doorCount={config.doorCount}
              doorReveal={config.doorReveal}
              doorWidth={d.doorWidth}
              doorHeight={d.doorHeight}
              drawerCount={config.drawerCount}
              drawerHeights={config.drawerHeights ?? []}
              kickHeight={config.kickHeight ?? 0}
              showDims={showDims}
              units={units}
            />
            {/* Phase 12 / Sprint 14 — WebGL canvas overlaid when VITE_ENABLE_WEBGL=true.
                WebGLPreviewCanvas returns null when the flag is absent. */}
            <WebGLPreviewCanvas
              config={config}
              materialColor={getMaterial(config.carcassMaterial).color}
              isometric={webglIsometric}
              orbitYawDeg={orbitYaw}
              orbitPitchDeg={orbitPitch}
              zoom={orbitZoom}
              className="absolute inset-0 h-full w-full"
            />
            <div className="absolute inset-s-2 bottom-2 rounded bg-black/45 px-2 py-0.5 text-[10px] text-white">
              {t('preview.dragToRotate')} • {Math.round(orbitZoom * 100)}%
            </div>
            <button
              type="button"
              onClick={() => {
                setOrbitYaw(0);
                setOrbitPitch(0);
                setOrbitZoom(1);
                setWebglIsometric(true);
              }}
              className="absolute inset-e-2 top-2 rounded bg-black/40 px-2 py-0.5 text-[10px] text-white hover:bg-black/60"
              title={t('preview3d.resetCamera')}
            >
              {t('preview3d.resetCamera')}
            </button>
            {import.meta.env.VITE_ENABLE_WEBGL === 'true' && (
              <button
                type="button"
                onClick={() => setWebglIsometric((v) => !v)}
                className="absolute inset-e-2 bottom-2 rounded bg-black/40 px-2 py-0.5 text-[10px] text-white hover:bg-black/60"
                aria-pressed={webglIsometric}
                title={t('preview.webglToggle')}
              >
                {webglIsometric ? t('preview.webglAnimate') : t('preview.webglIsometric')}
              </button>
            )}
          </div>
        )}
      </div>
      {/* Sprint 76 — W × H × D dimension summary label */}
      <p
        className="text-wood-500 dark:text-wood-400 text-center text-xs tabular-nums"
        aria-label={t('preview.dimensionSummary')}
      >
        W {fd(config.width)} × H {fd(config.height)} × D {fd(config.depth)}
      </p>
      {/* Sprint 89 — door / drawer count indicator pills */}
      {(config.doorStyle !== 'none' || config.drawerCount > 0) && (
        <p className="text-wood-400 dark:text-wood-500 mt-0.5 flex justify-center gap-2 text-center text-xs">
          {config.doorStyle !== 'none' && (
            <span>
              {config.doorCount} {t('preview.doors')}
            </span>
          )}
          {config.drawerCount > 0 && (
            <span>
              {config.drawerCount} {t('preview.drawers')}
            </span>
          )}
        </p>
      )}
    </div>
  );
});
