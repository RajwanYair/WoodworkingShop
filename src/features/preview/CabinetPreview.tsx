import { useState, useCallback, useRef, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { useCustomMaterialsStore } from '../../store/custom-materials-store';
import { getMaterial } from '../../engine/materials/materials';
import { getMaterialTextureId } from '../../engine/materials/material-textures';
import { computeEqualShelfPositions } from '../../engine/geometry/dimensions';
import { formatDim } from '../../utils/units';
import { useTouchGestures } from '../../hooks/useTouchGestures';
import { IconDownload } from '../../ui/Icons';
import { WebGLPreviewCanvas } from './WebGLPreviewCanvas';
import { S } from './preview-constants';
import { downloadSvg, downloadPng } from './preview-download-utils';
import type { TooltipHandlers } from './preview-svg-parts';
import { CabinetPlanViews } from './cabinet-plan-views';
import { FrontOpenView } from './FrontOpenView';
import { FrontView } from './FrontView';
import { IsometricView } from './IsometricView';
import { ShopDrawingPanel } from './ShopDrawingPanel';
import { useCabinetOrbit } from './use-cabinet-orbit';

type ViewId = 'front' | 'frontOpen' | 'side' | 'top' | 'back' | '3d' | 'drawing';

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
  const customMaterials = useCustomMaterialsStore((state) => state.materials);
  /** Format a mm value using the active unit system */
  const fd = (mm: number) => formatDim(mm, units);
  const [activeView, setActiveView] = useState<ViewId>('front');
  const previewRef = useRef<HTMLDivElement>(null);
  const [showDims, setShowDims] = useState(true);
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  /** Phase 12 / Sprint 14 — toggle isometric vs. animated WebGL view (only relevant when VITE_ENABLE_WEBGL=true). */
  const [webglIsometric, setWebglIsometric] = useState(true);
  const {
    orbitYaw,
    orbitPitch,
    orbitZoom,
    setOrbitYaw,
    setOrbitPitch,
    setOrbitZoom,
    draggingOrbit,
    handleOrbitStart,
    handleOrbitMove,
    handleOrbitEnd,
    handleOrbitWheel,
  } = useCabinetOrbit(setWebglIsometric);

  const thick = getMaterial(config.carcassMaterial, customMaterials).thickness;
  const bt = getMaterial(config.backPanelMaterial, customMaterials).thickness;
  const color = getMaterial(config.carcassMaterial, customMaterials).color;
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

  const carcassMatName = getMaterial(config.carcassMaterial, customMaterials).name[config.lang];
  const backMatName = getMaterial(config.backPanelMaterial, customMaterials).name[config.lang];

  const showTooltip = useCallback(
    (e: Pick<React.MouseEvent, 'clientX' | 'clientY'>, label: string, dim: string, material?: string) => {
      setTooltip({ label, dim, material, x: e.clientX, y: e.clientY });
    },
    [],
  );
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
      { id: 'drawing', label: t('preview.shopDrawing') },
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
                  ? 'bg-accent text-white'
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
            className="accent-primary size-6"
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
        onTouchCancel={() => {
          if (activeView !== '3d') touchGestures.onTouchCancel();
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
        {activeView === 'drawing' && <ShopDrawingPanel />}
        {activeView === 'front' && (
          <FrontView
            W={W}
            H={H}
            T={T}
            thick={thick}
            color={color}
            carcassMatName={carcassMatName}
            d={d}
            config={config}
            centreSupportXs={centreSupportXs}
            showDims={showDims}
            dimPad={dimPad}
            fd={fd}
            tp={tp}
          />
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

        {(activeView === 'side' || activeView === 'top' || activeView === 'back') && (
          <CabinetPlanViews
            activeView={activeView}
            W={W}
            H={H}
            D={D}
            T={T}
            bt={bt}
            thick={thick}
            color={color}
            carcassMatName={carcassMatName}
            backMatName={backMatName}
            d={d}
            config={config}
            shelfPositions={shelfPositions}
            centreSupportXs={centreSupportXs}
            showDims={showDims}
            dimPad={dimPad}
            fd={fd}
            tp={tp}
          />
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
              materialColor={getMaterial(config.carcassMaterial, customMaterials).color}
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
