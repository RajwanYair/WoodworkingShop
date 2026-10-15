import { iso } from './isometric-geometry';

export function IsoDimLine({
  p1,
  p2,
  label,
}: Readonly<{
  p1: [number, number, number];
  p2: [number, number, number];
  label: string;
  offset?: number;
}>) {
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
