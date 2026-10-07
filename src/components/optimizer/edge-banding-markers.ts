import type { BandedEdge } from '../../engine/types';

export interface EdgeBandingLine {
  edge: BandedEdge;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function getEdgeBandingLines(
  edges: readonly BandedEdge[],
  x: number,
  y: number,
  width: number,
  height: number,
): EdgeBandingLine[] {
  return edges.map((edge) => {
    const [x1, y1, x2, y2] =
      edge === 'length-start'
        ? [x, y, x + width, y]
        : edge === 'length-end'
          ? [x, y + height, x + width, y + height]
          : edge === 'width-start'
            ? [x, y, x, y + height]
            : [x + width, y, x + width, y + height];
    return { edge, x1, y1, x2, y2 };
  });
}
