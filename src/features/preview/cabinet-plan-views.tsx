import type { CabinetConfig, DerivedDimensions } from '../../engine/core/types';
import { S } from './preview-constants';
import { ViewBox, PartRect, DimLine } from './preview-svg-parts';
import type { TooltipHandlers } from './preview-svg-parts';

interface CabinetPlanViewsProps {
  activeView: 'side' | 'top' | 'back';
  W: number;
  H: number;
  D: number;
  T: number;
  bt: number;
  thick: number;
  color: string;
  carcassMatName: string;
  backMatName: string;
  d: DerivedDimensions;
  config: CabinetConfig;
  shelfPositions: readonly number[];
  centreSupportXs: readonly number[];
  showDims: boolean;
  dimPad: number;
  fd: (mm: number) => string;
  tp: TooltipHandlers;
}

export function CabinetPlanViews({
  activeView,
  W,
  H,
  D,
  T,
  bt,
  thick,
  color,
  carcassMatName,
  backMatName,
  d,
  config,
  shelfPositions,
  centreSupportXs,
  showDims,
  dimPad,
  fd,
  tp,
}: Readonly<CabinetPlanViewsProps>) {
  return (
    <>
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
    </>
  );
}
