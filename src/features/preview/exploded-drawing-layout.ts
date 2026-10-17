import type { Lang, Part } from '../../engine/core/types';

export interface DrawingPoint {
  x: number;
  y: number;
}

export interface ExplodedDrawingItem {
  partId: string;
  partName: string;
  quantity: number;
  topFace: readonly DrawingPoint[];
  frontFace: readonly DrawingPoint[];
  sideFace: readonly DrawingPoint[];
  balloon: DrawingPoint;
  label: DrawingPoint;
}

export interface ExplodedDrawingLayout {
  width: number;
  height: number;
  scale: number;
  items: ExplodedDrawingItem[];
}

export function drawingPointsAttribute(points: readonly DrawingPoint[]): string {
  return points.map(({ x, y }) => `${x},${y}`).join(' ');
}

const COLUMN_COUNT = 3;
const CELL_WIDTH = 300;
const CELL_HEIGHT = 180;
const AXIS_COSINE = Math.sqrt(3) / 2;

export function createExplodedDrawingLayout(parts: readonly Part[], lang: Lang): ExplodedDrawingLayout {
  const largestPlanDimension = Math.max(1, ...parts.map((part) => part.length + part.width));
  const largestThickness = Math.max(1, ...parts.map((part) => part.thickness));
  const scale = Math.min(0.16, 180 / largestPlanDimension, 100 / (largestPlanDimension / 2 + largestThickness));
  const rowCount = Math.max(1, Math.ceil(parts.length / COLUMN_COUNT));

  const items = parts.map((part, index): ExplodedDrawingItem => {
    const cellX = (index % COLUMN_COUNT) * CELL_WIDTH;
    const cellY = Math.floor(index / COLUMN_COUNT) * CELL_HEIGHT;
    const originX = cellX + 20 + part.width * scale * AXIS_COSINE;
    const originY = cellY + 20 + part.thickness * scale;
    const project = (lengthAxis: number, heightAxis: number, depthAxis: number): DrawingPoint => ({
      x: originX + (lengthAxis - depthAxis) * scale * AXIS_COSINE,
      y: originY + (lengthAxis + depthAxis) * scale * 0.5 - heightAxis * scale,
    });

    const topFace = [
      project(0, part.thickness, 0),
      project(part.length, part.thickness, 0),
      project(part.length, part.thickness, part.width),
      project(0, part.thickness, part.width),
    ];
    const frontFace = [
      project(0, 0, 0),
      project(part.length, 0, 0),
      project(part.length, part.thickness, 0),
      project(0, part.thickness, 0),
    ];
    const sideFace = [
      project(part.length, 0, 0),
      project(part.length, 0, part.width),
      project(part.length, part.thickness, part.width),
      project(part.length, part.thickness, 0),
    ];
    const centerX = topFace.reduce((sum, point) => sum + point.x, 0) / topFace.length;
    const minY = Math.min(...topFace.map((point) => point.y));

    return {
      partId: part.id,
      partName: part.name[lang],
      quantity: part.qty,
      topFace,
      frontFace,
      sideFace,
      balloon: { x: centerX, y: minY + 18 },
      label: { x: cellX + 18, y: cellY + CELL_HEIGHT - 18 },
    };
  });

  return {
    width: COLUMN_COUNT * CELL_WIDTH,
    height: rowCount * CELL_HEIGHT,
    scale,
    items,
  };
}
