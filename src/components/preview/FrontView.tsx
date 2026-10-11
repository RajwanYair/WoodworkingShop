import type { CabinetConfig, DerivedDimensions } from '../../engine/types';
import { S } from './preview-constants';
import { ViewBox, PartRect, DimLine, DoorsOverlay } from './preview-svg-parts';
import type { TooltipHandlers } from './preview-svg-parts';

interface FrontViewProps {
  W: number;
  H: number;
  T: number;
  thick: number;
  color: string;
  carcassMatName: string;
  d: DerivedDimensions;
  config: CabinetConfig;
  centreSupportXs: number[];
  showDims: boolean;
  dimPad: number;
  fd: (mm: number) => string;
  tp: TooltipHandlers;
}

export function FrontView({
  W,
  H,
  T,
  thick,
  color,
  carcassMatName,
  d,
  config,
  centreSupportXs,
  showDims,
  dimPad,
  fd,
  tp,
}: FrontViewProps) {
  return (
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
        {config.kickHeight > 0 && (
          <rect
            x={T * 0.6}
            y={H - config.kickHeight * S}
            width={W - T * 0.6 * 2}
            height={config.kickHeight * S}
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
  );
}
