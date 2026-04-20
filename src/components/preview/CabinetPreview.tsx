import { useCabinetStore } from '../../store/cabinet-store';
import { getMaterial } from '../../engine/materials';
import { computeEqualShelfPositions } from '../../engine/dimensions';

/** Scale factor: mm → SVG px */
const S = 0.2;

export function CabinetPreview() {
  const { config, dimensions: d } = useCabinetStore();
  const t = getMaterial(config.carcassMaterial).thickness;
  const bt = getMaterial(config.backPanelMaterial).thickness;
  const color = getMaterial(config.carcassMaterial).color;
  const shelfPositions =
    config.shelfSpacing === 'custom' && config.customShelfPositions.length > 0
      ? config.customShelfPositions
      : computeEqualShelfPositions(d.internalHeight, config.shelfCount);

  const W = config.width * S;
  const H = config.height * S;
  const D = config.depth * S;
  const T = t * S;
  const pad = 30;

  return (
    <div className="space-y-8">
      {/* Front view (closed) */}
      <ViewBox label="Front (Closed)" w={W + pad * 2} h={H + pad * 2}>
        <g transform={`translate(${pad},${pad})`}>
          {/* Carcass outline */}
          <rect x={0} y={0} width={W} height={H} fill="none" stroke="#444" strokeWidth={1.5} />
          {/* Left side */}
          <rect x={0} y={0} width={T} height={H} fill={color} stroke="#666" strokeWidth={0.5} />
          {/* Right side */}
          <rect x={W - T} y={0} width={T} height={H} fill={color} stroke="#666" strokeWidth={0.5} />
          {/* Top */}
          <rect x={T} y={0} width={W - 2 * T} height={T} fill={color} stroke="#666" strokeWidth={0.5} />
          {/* Bottom */}
          <rect x={T} y={H - T} width={W - 2 * T} height={T} fill={color} stroke="#666" strokeWidth={0.5} />
          {/* Doors */}
          {config.doorStyle !== 'none' && renderDoors(config, d, S, color)}
        </g>
      </ViewBox>

      {/* Front view (open — no doors, show shelves) */}
      <ViewBox label="Front (Open)" w={W + pad * 2} h={H + pad * 2}>
        <g transform={`translate(${pad},${pad})`}>
          <rect x={0} y={0} width={W} height={H} fill="none" stroke="#444" strokeWidth={1.5} />
          <rect x={0} y={0} width={T} height={H} fill={color} stroke="#666" strokeWidth={0.5} />
          <rect x={W - T} y={0} width={T} height={H} fill={color} stroke="#666" strokeWidth={0.5} />
          <rect x={T} y={0} width={W - 2 * T} height={T} fill={color} stroke="#666" strokeWidth={0.5} />
          <rect x={T} y={H - T} width={W - 2 * T} height={T} fill={color} stroke="#666" strokeWidth={0.5} />
          {/* Shelves */}
          {shelfPositions.map((pos, i) => (
            <rect
              key={i}
              x={T + 1}
              y={H - T - pos * S}
              width={(W - 2 * T) - 2}
              height={T * 0.6}
              fill={color}
              stroke="#888"
              strokeWidth={0.5}
              strokeDasharray="3,2"
            />
          ))}
        </g>
      </ViewBox>

      {/* Side view */}
      <ViewBox label="Side" w={D + pad * 2} h={H + pad * 2}>
        <g transform={`translate(${pad},${pad})`}>
          <rect x={0} y={0} width={D} height={H} fill="none" stroke="#444" strokeWidth={1.5} />
          {/* Side panel fill */}
          <rect x={0} y={0} width={D} height={H} fill={color} opacity={0.3} />
          {/* Back panel */}
          <rect x={D - bt * S} y={0} width={bt * S} height={H} fill="#cba" stroke="#888" strokeWidth={0.5} />
          {/* Shelves */}
          {shelfPositions.map((pos, i) => (
            <rect
              key={i}
              x={0}
              y={H - T - pos * S}
              width={D - bt * S}
              height={T * 0.6}
              fill={color}
              stroke="#888"
              strokeWidth={0.5}
              strokeDasharray="3,2"
            />
          ))}
        </g>
      </ViewBox>

      {/* Top view */}
      <ViewBox label="Top" w={W + pad * 2} h={D + pad * 2}>
        <g transform={`translate(${pad},${pad})`}>
          <rect x={0} y={0} width={W} height={D} fill="none" stroke="#444" strokeWidth={1.5} />
          <rect x={0} y={0} width={T} height={D} fill={color} stroke="#666" strokeWidth={0.5} />
          <rect x={W - T} y={0} width={T} height={D} fill={color} stroke="#666" strokeWidth={0.5} />
          <rect x={T} y={0} width={W - 2 * T} height={T} fill={color} stroke="#666" strokeWidth={0.5} />
          {/* Back panel */}
          <rect x={T} y={D - bt * S} width={W - 2 * T} height={bt * S} fill="#cba" stroke="#888" strokeWidth={0.5} />
        </g>
      </ViewBox>

      {/* Back view */}
      <ViewBox label="Back" w={W + pad * 2} h={H + pad * 2}>
        <g transform={`translate(${pad},${pad})`}>
          <rect x={0} y={0} width={W} height={H} fill="#cba" stroke="#444" strokeWidth={1.5} />
          <text x={W / 2} y={H / 2} textAnchor="middle" dominantBaseline="middle" fontSize={12} fill="#666">
            {Math.round(d.backPanelWidth)} × {Math.round(d.backPanelHeight)}
          </text>
        </g>
      </ViewBox>
    </div>
  );
}

function ViewBox({ label, w, h, children }: { label: string; w: number; h: number; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-wood-600 dark:text-wood-300 mb-2">{label}</h3>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full max-w-md border border-wood-200 dark:border-wood-700 rounded bg-white dark:bg-wood-800"
        style={{ maxHeight: 400 }}
      >
        {children}
      </svg>
    </div>
  );
}

function renderDoors(
  config: { doorCount: number; doorReveal: number; width: number; height: number },
  d: { doorHeight: number; doorWidth: number },
  scale: number,
  color: string,
) {
  const r = config.doorReveal * scale;
  const dw = d.doorWidth * scale;
  const dh = d.doorHeight * scale;
  const doors = [];

  for (let i = 0; i < config.doorCount; i++) {
    const x = r + i * (dw + r);
    doors.push(
      <rect
        key={i}
        x={x}
        y={r}
        width={dw}
        height={dh}
        fill={color}
        opacity={0.6}
        stroke="#555"
        strokeWidth={1}
        rx={1}
      />,
    );
  }
  return <>{doors}</>;
}
