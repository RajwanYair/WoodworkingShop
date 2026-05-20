/**
 * Sprint 55 — Room Layout Floor-Plan View
 *
 * Renders an SVG top-down floor-plan of the active room layout:
 * - Room outline drawn to scale
 * - Cabinet footprints as labelled rectangles
 * - Room dimensions (mm) annotated on the edges
 *
 * Shown in the Configurator tab below the main panel.
 * Returns an empty-state message when no layouts exist.
 */
import { useTranslation } from 'react-i18next';
import { useRoomStore } from '../../store/room-store';
import type { RoomLayout, RoomCabinet } from '../../engine/types';

const SVG_W = 640;
const SVG_H = 400;
const PAD = 32;

interface CabinetRectProps {
  cab: RoomCabinet;
  index: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

function CabinetRect({ cab, index, scale, offsetX, offsetY }: CabinetRectProps) {
  const x = offsetX + cab.x * scale;
  const y = offsetY + cab.y * scale;
  const w = cab.width * scale;
  const d = cab.depth * scale;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={d}
        fill="#d4a96a33"
        stroke="#7c4a2d"
        strokeWidth={1.5}
        rx={2}
      />
      <text
        x={x + w / 2}
        y={y + d / 2 + 4}
        textAnchor="middle"
        fontSize={10}
        fill="#5a3520"
      >
        ({index + 1}) {cab.name}
      </text>
    </g>
  );
}

interface FloorPlanProps {
  layout: RoomLayout;
}

function FloorPlan({ layout }: FloorPlanProps) {
  const usableW = SVG_W - 2 * PAD;
  const usableH = SVG_H - 2 * PAD;
  const scale = Math.min(usableW / layout.roomWidth, usableH / layout.roomDepth);

  const roomW = layout.roomWidth * scale;
  const roomH = layout.roomDepth * scale;
  const offsetX = PAD + (usableW - roomW) / 2;
  const offsetY = PAD + (usableH - roomH) / 2;

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      role="img"
      aria-label={layout.name}
      className="w-full max-h-96 border border-wood-200 dark:border-wood-700 rounded-lg bg-wood-50 dark:bg-wood-900"
    >
      {/* Room outline */}
      <rect
        x={offsetX}
        y={offsetY}
        width={roomW}
        height={roomH}
        fill="none"
        stroke="#7c4a2d"
        strokeWidth={2}
      />
      {/* Width label (top) */}
      <text
        x={offsetX + roomW / 2}
        y={offsetY - 8}
        textAnchor="middle"
        fontSize={11}
        fill="#7c4a2d"
      >
        {layout.roomWidth} mm
      </text>
      {/* Depth label (left) */}
      <text
        x={offsetX - 8}
        y={offsetY + roomH / 2}
        textAnchor="middle"
        fontSize={11}
        fill="#7c4a2d"
        transform={`rotate(-90, ${offsetX - 8}, ${offsetY + roomH / 2})`}
      >
        {layout.roomDepth} mm
      </text>
      {/* Cabinet footprints */}
      {layout.cabinets.map((cab, i) => (
        <CabinetRect
          key={cab.id}
          cab={cab}
          index={i}
          scale={scale}
          offsetX={offsetX}
          offsetY={offsetY}
        />
      ))}
    </svg>
  );
}

export function RoomLayoutView() {
  const { t } = useTranslation();
  const { layouts, activeLayoutId } = useRoomStore();

  const layout = layouts.find((l) => l.id === activeLayoutId) ?? layouts[0];

  if (!layout) {
    return (
      <section
        aria-label={t('room.sectionLabel')}
        className="border border-wood-200 dark:border-wood-700 rounded-lg p-4"
      >
        <h3 className="text-sm font-semibold text-wood-600 dark:text-wood-300 mb-2">
          {t('room.title')}
        </h3>
        <p className="text-sm text-wood-400 dark:text-wood-500">{t('room.empty')}</p>
      </section>
    );
  }

  return (
    <section
      aria-label={t('room.sectionLabel')}
      className="border border-wood-200 dark:border-wood-700 rounded-lg p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-wood-600 dark:text-wood-300">
          {t('room.title')}: {layout.name}
        </h3>
        <span className="text-xs text-wood-400 dark:text-wood-500">
          {layout.roomWidth} × {layout.roomDepth} mm ·{' '}
          {layout.cabinets.length} {t('room.cabinets')}
        </span>
      </div>
      <FloorPlan layout={layout} />
    </section>
  );
}
